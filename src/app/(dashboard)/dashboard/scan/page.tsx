"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Check, AlertCircle, PartyPopper, ScanLine, RotateCcw, Camera, Gift, UserSearch, Search, ChevronRight, SwitchCamera } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CardInfo {
  clientName: string;
  programName: string;
  merchantName: string;
  programType: string;
  currentStamps: number;
  maxStamps: number;
  currentPoints: number;
  /** True pour un programme POINTS sans seuil (accumulation infinie). */
  unlimited?: boolean;
  status: string;
}

interface StampResult {
  card: {
    currentStamps: number;
    currentPoints: number;
    totalVisits: number;
    status: string;
  };
  client: { firstName: string };
  rewardUnlocked: { name: string } | null;
  rewardPending: boolean;
}

type Step = "scan" | "manual" | "confirm" | "reward_pending" | "stamping" | "claiming" | "success" | "reward_claimed" | "error";
type CameraErrorCode =
  | "permission"
  | "busy"
  | "not-found"
  | "unsupported"
  | "insecure"
  | "unknown";

interface ManualCard {
  id: string;
  serialNumber: string;
  currentStamps: number;
  totalVisits: number;
  status: string;
  lastVisitAt: string | null;
  client: { firstName: string; lastName?: string | null; email: string | null; phone: string | null };
  program: { name: string };
}

const REAR_CAMERA_PATTERN =
  /\b(back|rear|environment|world)\b|arri[eè]re|trasera|traseira|r[uü]ck/i;
const FRONT_CAMERA_PATTERN =
  /\b(front|user|facetime)\b|avant|frontal|selfie/i;
const UNSUITABLE_CAMERA_PATTERN =
  /\b(infrared|depth|virtual|obs|manycam|snap camera)\b|\bir camera\b/i;

function getUsableCameras(devices: MediaDeviceInfo[]) {
  const videoInputs = devices.filter((device) => device.kind === "videoinput");
  const suitable = videoInputs.filter(
    (device) => !UNSUITABLE_CAMERA_PATTERN.test(device.label)
  );
  return suitable.length > 0 ? suitable : videoInputs;
}

function pickRearCamera(cameras: MediaDeviceInfo[]) {
  const explicitRear = cameras.find((camera) =>
    REAR_CAMERA_PATTERN.test(camera.label)
  );
  if (explicitRear) return explicitRear;

  const nonFront = cameras.filter(
    (camera) => !FRONT_CAMERA_PATTERN.test(camera.label)
  );
  if (nonFront.length > 0) return nonFront[nonFront.length - 1];

  // Sur les tablettes Windows, la caméra arrière est généralement le
  // deuxième périphérique quand le pilote ne fournit pas de facingMode.
  return cameras[cameras.length - 1];
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScanRef = useRef<string>("");
  const cameraRequestRef = useRef(0);
  const cameraStartingRef = useRef(false);

  const [step, setStep] = useState<Step>("scan");
  const [serialNumber, setSerialNumber] = useState("");
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [stampCount, setStampCount] = useState(1);
  const [result, setResult] = useState<StampResult | null>(null);
  const [claimedClient, setClaimedClient] = useState("");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraErrorCode, setCameraErrorCode] =
    useState<CameraErrorCode | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraNeedsActivation, setCameraNeedsActivation] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState("");

  // Mode "saisie manuelle" — sélection d'un client sans scan
  const [manualCards, setManualCards] = useState<ManualCard[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSearch, setManualSearch] = useState("");

  async function loadManualCards() {
    setManualLoading(true);
    try {
      const res = await fetch("/api/cards");
      const data = await res.json();
      if (Array.isArray(data)) setManualCards(data);
    } catch (err) {
      console.error("[scan/manual] failed:", err);
    } finally {
      setManualLoading(false);
    }
  }

  function openManualMode() {
    stopCamera();
    setStep("manual");
    if (manualCards.length === 0) loadManualCards();
  }

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    cameraStartingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraStarting(false);
  }, []);

  const tick = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let decodedValue = "";
    try {
      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code && code.data && code.data !== lastScanRef.current) {
        decodedValue = code.data;
      }
    } catch { /* ignore */ }

    if (decodedValue) {
      lastScanRef.current = decodedValue;
      stopCamera();
      try {
        await handleScan(decodedValue);
      } catch {
        setError("Impossible de vérifier cette carte. Réessayez dans un instant.");
        setStep("error");
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopCamera]);

  const startCamera = useCallback(async (deviceId?: string) => {
    if (cameraStartingRef.current) return;

    stopCamera();
    const requestId = ++cameraRequestRef.current;
    cameraStartingRef.current = true;
    setCameraStarting(true);
    setCameraNeedsActivation(false);
    setCameraReady(false);
    setCameraError("");
    setCameraErrorCode(null);

    const fail = (code: CameraErrorCode, message: string) => {
      if (cameraRequestRef.current !== requestId) return;
      cameraStartingRef.current = false;
      setCameraStarting(false);
      setCameraReady(false);
      setCameraErrorCode(code);
      setCameraError(message);
    };

    if (!window.isSecureContext) {
      fail(
        "insecure",
        "La caméra exige une connexion HTTPS sécurisée."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      fail(
        "unsupported",
        "Ce navigateur ne permet pas d'utiliser la caméra depuis cette page."
      );
      return;
    }

    try {
      const videoConstraints: MediaTrackConstraints = deviceId
        ? {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : {
            // "exact" force réellement la caméra arrière quand le pilote
            // Windows expose correctement son orientation.
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch (initialError) {
        const initialName =
          initialError instanceof DOMException ? initialError.name : "";
        if (
          deviceId ||
          (initialName !== "OverconstrainedError" &&
            initialName !== "NotFoundError")
        ) {
          throw initialError;
        }

        // Certains pilotes de tablettes ne publient pas facingMode. On ouvre
        // alors une caméra, puis on utilise les libellés et deviceId exposés
        // après autorisation pour sélectionner l'arrière.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      if (cameraRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      let track = stream.getVideoTracks()[0];
      let detectedCameras: MediaDeviceInfo[] = [];
      try {
        detectedCameras = getUsableCameras(
          await navigator.mediaDevices.enumerateDevices()
        );
        setCameras(detectedCameras);

        if (!deviceId && detectedCameras.length > 1) {
          const currentDeviceId = track.getSettings().deviceId;
          const preferredRear = pickRearCamera(detectedCameras);

          if (
            preferredRear?.deviceId &&
            preferredRear.deviceId !== currentDeviceId
          ) {
            try {
              const rearStream = await navigator.mediaDevices.getUserMedia({
                video: {
                  deviceId: { exact: preferredRear.deviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                audio: false,
              });

              if (cameraRequestRef.current !== requestId) {
                rearStream.getTracks().forEach((rearTrack) => rearTrack.stop());
                stream.getTracks().forEach((currentTrack) =>
                  currentTrack.stop()
                );
                return;
              }

              stream.getTracks().forEach((currentTrack) =>
                currentTrack.stop()
              );
              stream = rearStream;
              track = rearStream.getVideoTracks()[0];
            } catch {
              // Si le pilote refuse ce deviceId, on conserve la caméra déjà
              // ouverte et le bouton de bascule permet d'essayer les autres.
            }
          }
        }
      } catch {
        // enumerateDevices n'est pas disponible sur tous les navigateurs.
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const caps = (track as any).getCapabilities?.();
        if (caps?.focusMode?.includes("continuous")) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (track as any).applyConstraints?.({
            advanced: [{ focusMode: "continuous" }],
          });
        }
      } catch {
        /* Le focus continu n'est pas disponible sur toutes les webcams. */
      }

      streamRef.current = stream;
      setActiveCameraId(track.getSettings().deviceId || deviceId || "");
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((videoTrack) => videoTrack.stop());
        return;
      }

      video.srcObject = stream;
      await video.play();
      if (cameraRequestRef.current !== requestId) return;

      cameraStartingRef.current = false;
      setCameraStarting(false);
      setCameraReady(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      const message = err instanceof Error ? err.message : String(err);

      if (name === "NotAllowedError" || name === "SecurityError") {
        fail(
          "permission",
          "Chrome ou Windows bloque actuellement l'accès à la caméra."
        );
      } else if (
        name === "NotFoundError" ||
        name === "OverconstrainedError"
      ) {
        fail("not-found", "Aucune caméra compatible n'a été détectée.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        fail(
          "busy",
          "La caméra est déjà utilisée ou bloquée par une autre application."
        );
      } else {
        fail(
          "unknown",
          `Impossible d'activer la caméra${message ? ` : ${message}` : "."}`
        );
      }
    }
  }, [stopCamera, tick]);

  const switchCamera = useCallback(() => {
    if (cameraStartingRef.current || cameras.length < 2) return;

    const currentIndex = cameras.findIndex(
      (camera) => camera.deviceId === activeCameraId
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % cameras.length : 0;
    void startCamera(cameras[nextIndex].deviceId);
  }, [activeCameraId, cameras, startCamera]);

  useEffect(() => {
    if (step !== "scan") return;
    let disposed = false;
    let permissionStatus: PermissionStatus | null = null;

    lastScanRef.current = "";
    setCameraError("");
    setCameraErrorCode(null);
    setCameraReady(false);

    async function prepareCamera() {
      if (!window.isSecureContext) {
        setCameraNeedsActivation(false);
        setCameraErrorCode("insecure");
        setCameraError("La caméra exige une connexion HTTPS sécurisée.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraNeedsActivation(false);
        setCameraErrorCode("unsupported");
        setCameraError(
          "Ce navigateur ne permet pas d'utiliser la caméra depuis cette page."
        );
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({
          name: "camera",
        } as PermissionDescriptor);
        if (disposed) return;

        if (permissionStatus.state === "granted") {
          setCameraNeedsActivation(false);
          void startCamera();
        } else if (permissionStatus.state === "denied") {
          setCameraNeedsActivation(false);
          setCameraErrorCode("permission");
          setCameraError(
            "Chrome ou Windows bloque actuellement l'accès à la caméra."
          );
        } else {
          // L'appel reste associé au clic sur "Activer la caméra" : Chrome
          // peut alors afficher sa boîte de permission de façon fiable.
          setCameraNeedsActivation(true);
        }

        permissionStatus.onchange = () => {
          if (disposed || !permissionStatus) return;
          if (permissionStatus.state === "granted") {
            setCameraNeedsActivation(false);
            void startCamera();
          } else if (permissionStatus.state === "denied") {
            stopCamera();
            setCameraNeedsActivation(false);
            setCameraErrorCode("permission");
            setCameraError(
              "Chrome ou Windows bloque actuellement l'accès à la caméra."
            );
          }
        };
      } catch {
        // Permissions API indisponible : le clic utilisateur déclenchera
        // directement getUserMedia et la demande native de Chrome.
        if (!disposed) setCameraNeedsActivation(true);
      }
    }

    void prepareCamera();
    return () => {
      disposed = true;
      if (permissionStatus) permissionStatus.onchange = null;
      stopCamera();
    };
  }, [step, startCamera, stopCamera]);

  async function handleScan(text: string) {
    const match = text.match(/\/stamp\/([^/?#]+)/);
    const serial = match ? match[1] : text.trim();
    const res = await fetch(`/api/cards/lookup?serialNumber=${encodeURIComponent(serial)}`);
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Carte introuvable"); setStep("error"); return; }
    setSerialNumber(serial);
    setCardInfo(data);
    setStampCount(1);
    // If reward is pending, go directly to reward validation screen
    setStep(data.status === "REWARD_PENDING" ? "reward_pending" : "confirm");
  }

  async function handleStamp() {
    setStep("stamping");
    const res = await fetch("/api/transactions/stamp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serialNumber, count: stampCount }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur"); setStep("error"); return; }
    setResult(data);
    setStep(data.rewardPending ? "reward_pending" : "success");
    // Refresh card info if reward pending
    if (data.rewardPending) {
      const r = await fetch(`/api/cards/lookup?serialNumber=${encodeURIComponent(serialNumber)}`);
      const d = await r.json();
      if (!r.ok) return;
      setCardInfo(d);
    }
  }

  async function handleClaimReward() {
    setStep("claiming");
    const res = await fetch("/api/transactions/claim-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serialNumber }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur"); setStep("error"); return; }
    setClaimedClient(data.client.firstName);
    setStep("reward_claimed");
  }

  function reset() {
    setSerialNumber(""); setCardInfo(null); setResult(null);
    setError(""); setCameraError(""); setCameraReady(false);
    setCameraErrorCode(null); setCameraStarting(false);
    setCameraNeedsActivation(true);
    setCameras([]); setActiveCameraId("");
    setStampCount(1); setClaimedClient("");
    setStep("scan");
  }

  // ─── Scanner ──────────────────────────────────────────────────────────────
  if (step === "scan") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scanner une carte</h1>
          <p className="text-sm text-gray-500">Pointez la caméra vers le QR code de la carte Apple Wallet</p>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            {cameraError ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
                  <Camera className="h-7 w-7 text-red-500" />
                </div>
                <p className="text-sm text-red-600 font-medium">{cameraError}</p>
                {cameraErrorCode === "permission" && (
                  <div className="w-full max-w-lg space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-950">
                    <div>
                      <p className="font-semibold">1. Autoriser dans Chrome</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        Cliquez sur l&apos;icône caméra ou réglages à gauche de
                        l&apos;adresse, choisissez Caméra → Autoriser, puis
                        revenez ici.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">2. Vérifier Windows</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        Activez « Accès à la caméra » et « Autoriser les
                        applications de bureau à accéder à votre caméra ».
                      </p>
                      <a
                        href="ms-settings:privacy-webcam"
                        className="mt-2 inline-flex text-xs font-semibold text-blue-700 underline underline-offset-2"
                      >
                        Ouvrir les réglages caméra Windows
                      </a>
                    </div>
                  </div>
                )}
                {cameraErrorCode === "busy" && (
                  <p className="max-w-md text-xs leading-relaxed text-gray-500">
                    Fermez Teams, Zoom, l&apos;application Caméra ou tout autre
                    logiciel utilisant la webcam, puis réessayez.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => void startCamera()}
                  disabled={cameraStarting}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {cameraStarting
                    ? "Activation..."
                    : cameraErrorCode === "permission"
                      ? "Réessayer après autorisation"
                      : "Réessayer"}
                </Button>
              </div>
            ) : cameraNeedsActivation ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-semibold text-gray-900">
                    Activer la caméra
                  </h2>
                  <p className="max-w-sm text-sm text-gray-500">
                    Cliquez ci-dessous pour que Chrome affiche sa demande
                    d&apos;autorisation.
                  </p>
                </div>
                <Button
                  onClick={() => void startCamera()}
                  disabled={cameraStarting}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {cameraStarting ? "Activation..." : "Activer la caméra"}
                </Button>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="w-full block" playsInline muted autoPlay style={{ maxHeight: "70vh", objectFit: "cover" }} />
                <canvas ref={canvasRef} className="hidden" />
                {cameraReady && cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    disabled={cameraStarting}
                    className="absolute right-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-black/70 p-0 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/85 disabled:opacity-50"
                    title="Basculer entre les caméras avant et arrière"
                    aria-label="Changer de caméra"
                  >
                    <SwitchCamera className="h-5 w-5" strokeWidth={2.5} />
                    <span className="sr-only">Changer de caméra</span>
                  </button>
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative z-10 w-56 h-56">
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-xl" />
                    {cameraReady && <div className="absolute inset-x-2 h-0.5 bg-blue-400 rounded animate-scan-line" />}
                  </div>
                  {!cameraReady && cameraStarting && (
                    <div className="absolute z-20 flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                      <p className="text-white text-sm font-medium">Activation caméra...</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
          <ScanLine className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">Demandez au client d&apos;ouvrir sa carte Apple Wallet et de taper sur le QR code en bas pour l&apos;agrandir.</p>
        </div>

        {/* Fallback : saisie manuelle si le scan ne marche pas */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <Button variant="outline" className="w-full gap-2" onClick={openManualMode}>
          <UserSearch className="h-4 w-4" />
          Sélectionner un client manuellement
        </Button>
      </div>
    );
  }

  // ─── Saisie manuelle (sans scan) ──────────────────────────────────────────
  if (step === "manual") {
    const filtered = manualCards.filter((c) => {
      if (!manualSearch) return true;
      const q = manualSearch.toLowerCase();
      return (
        c.client.firstName?.toLowerCase().includes(q) ||
        c.client.lastName?.toLowerCase().includes(q) ||
        c.client.email?.toLowerCase().includes(q) ||
        c.client.phone?.toLowerCase().includes(q) ||
        c.serialNumber.toLowerCase().includes(q) ||
        c.program.name.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sélectionner un client</h1>
          <p className="text-sm text-gray-500">Si le scan ne fonctionne pas, choisissez le client dans la liste</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, email, téléphone ou programme…"
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {manualLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 px-6">
                <UserSearch className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {manualSearch ? "Aucun client trouvé" : "Aucune carte enregistrée"}
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.slice(0, 50).map((c) => {
                  const initials = (c.client.firstName?.charAt(0) || "?").toUpperCase();
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handleScan(c.serialNumber)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {c.client.firstName || "Anonyme"}
                            {c.client.lastName ? ` ${c.client.lastName}` : ""}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {c.client.email || c.client.phone || c.serialNumber}
                            {" · "}
                            {c.program.name}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-blue-600">{c.currentStamps} tampons</p>
                          <p className="text-[11px] text-gray-400">{c.totalVisits} visite{c.totalVisits > 1 ? "s" : ""}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                      </button>
                    </li>
                  );
                })}
                {filtered.length > 50 && (
                  <li className="px-4 py-3 text-center text-xs text-gray-400">
                    Affinez la recherche — {filtered.length - 50} cartes supplémentaires
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full gap-2" onClick={() => setStep("scan")}>
          <ScanLine className="h-4 w-4" />
          Revenir au scan QR
        </Button>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (step === "stamping" || step === "claiming") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-500">
            {step === "claiming"
              ? "Validation de la récompense..."
              : `Ajout des ${cardInfo?.programType === "POINTS" ? "points" : "tampons"}...`}
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-bold">Erreur</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <Button onClick={reset} className="w-full gap-2"><RotateCcw className="h-4 w-4" /> Scanner à nouveau</Button>
        </div>
      </div>
    );
  }

  // ─── Reward pending — card is full ─────────────────────────────────────────
  if (step === "reward_pending" && cardInfo) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Récompense disponible</h1>
          <p className="text-sm text-gray-500">Ce client a complété sa carte</p>
        </div>

        {/* Big reward banner */}
        <div className="rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 p-6 text-white text-center shadow-lg">
          <Gift className="h-14 w-14 mx-auto mb-3 drop-shadow" />
          <p className="text-2xl font-bold">Carte complète !</p>
          <p className="text-lg font-semibold mt-1">{cardInfo.clientName}</p>
          <p className="text-sm opacity-90 mt-1">{cardInfo.programName}</p>
          <div className="mt-4 flex justify-center gap-1">
            {Array.from({ length: cardInfo.maxStamps }).map((_, i) => (
              <div key={i} className="h-4 w-4 rounded-full bg-white/90" />
            ))}
          </div>
          <p className="text-sm opacity-80 mt-2">{cardInfo.maxStamps}/{cardInfo.maxStamps} tampons</p>
        </div>

        <Card className="shadow-sm border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm text-yellow-800 font-medium">
              Remettez la récompense au client, puis cliquez sur &quot;Valider&quot; pour remettre la carte à zéro.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Annuler
          </Button>
          <Button
            className="flex-2 gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-6"
            onClick={handleClaimReward}
          >
            <Check className="h-5 w-5" /> Valider la récompense
          </Button>
        </div>
      </div>
    );
  }

  // ─── Reward claimed ────────────────────────────────────────────────────────
  if (step === "reward_claimed") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Card className="shadow-md">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <PartyPopper className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Récompense validée !</h2>
              <p className="mt-1 text-gray-500">La carte de <strong>{claimedClient}</strong> a été remise à zéro.</p>
              <p className="mt-1 text-sm text-blue-600 font-medium">Le client peut recommencer à collecter des tampons.</p>
              <Button className="mt-6 w-full gap-2" onClick={reset}>
                <ScanLine className="h-4 w-4" /> Scanner un autre client
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Confirm stamp ────────────────────────────────────────────────────────
  if (step === "confirm" && cardInfo) {
    const isStamps = cardInfo.programType === "STAMPS";
    const isPoints = cardInfo.programType === "POINTS";
    const isUnlimited = isPoints && cardInfo.unlimited === true;
    // Libellés contextualisés selon le type (tampons vs points)
    const unitSing = isPoints ? "point" : "tampon";
    const unitPlur = isPoints ? "points" : "tampons";
    const remaining = Math.max(0, cardInfo.maxStamps - cardInfo.currentStamps);
    const remainingPoints =
      isUnlimited
        ? null
        : Math.max(0, cardInfo.maxStamps - cardInfo.currentPoints);
    // Le cap d'ajout = le seuil de la carte (pas le restant). Ex: programme à 8
    // tampons → on peut toujours ajouter 1-8 d'un coup, peu importe l'état
    // actuel. Si on dépasse le seuil (ex 5/8 + 8 = 13), l'excédent est
    // reporté sur le cycle suivant via pendingExtraStamps.
    // Pour POINTS limité : même logique sur le seuil, cappé à 100 en sécurité.
    // POINTS illimité : 100 max par scan.
    const incrementCap = isStamps
      ? Math.max(1, cardInfo.maxStamps)
      : isPoints
        ? isUnlimited
          ? 100
          : Math.min(100, Math.max(1, cardInfo.maxStamps || 100))
        : 10;
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ajouter des {unitPlur}
          </h1>
          <p className="text-sm text-gray-500">
            Carte identifiée — confirmez l&apos;ajout
          </p>
        </div>
        <Card className="overflow-hidden shadow-sm">
          <div className="bg-blue-600 px-5 py-4 text-white">
            <p className="text-xs uppercase tracking-widest opacity-80">{cardInfo.merchantName}</p>
            <p className="text-lg font-bold">{cardInfo.programName}</p>
          </div>
          <CardContent className="pt-4 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Client</p>
                <p className="text-xl font-semibold">{cardInfo.clientName}</p>
              </div>
              {isStamps && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Tampons</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {cardInfo.currentStamps}<span className="text-base text-gray-400 font-normal">/{cardInfo.maxStamps}</span>
                  </p>
                </div>
              )}
              {isPoints && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Points</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {cardInfo.currentPoints}
                    {!isUnlimited && (
                      <span className="text-base text-gray-400 font-normal">
                        /{cardInfo.maxStamps}
                      </span>
                    )}
                    {isUnlimited && (
                      <span className="ml-1 text-base text-gray-400 font-normal">
                        pts
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
            {isStamps && (
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: cardInfo.maxStamps }).map((_, i) => (
                  <div key={i} className={`aspect-square rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${i < cardInfo.currentStamps ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 bg-gray-50 text-gray-300"}`}>
                    {i < cardInfo.currentStamps ? "✓" : i + 1}
                  </div>
                ))}
              </div>
            )}
            {isStamps && remaining <= 3 && remaining > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-center">
                <p className="text-sm font-medium text-amber-700">Plus que {remaining} tampon{remaining > 1 ? "s" : ""} pour la récompense !</p>
              </div>
            )}
            {isPoints &&
              !isUnlimited &&
              remainingPoints !== null &&
              remainingPoints > 0 &&
              remainingPoints <= 20 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-center">
                  <p className="text-sm font-medium text-amber-700">
                    Plus que {remainingPoints} point
                    {remainingPoints > 1 ? "s" : ""} pour la récompense !
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium text-gray-700 text-center mb-4">
              Nombre de {unitPlur} à ajouter
            </p>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setStampCount((n) => Math.max(1, n - 1))} disabled={stampCount <= 1} className="h-12 w-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-30">
                <Minus className="h-5 w-5" />
              </button>
              <span className="text-4xl font-bold text-gray-900 w-16 text-center">{stampCount}</span>
              <button onClick={() => setStampCount((n) => Math.min(incrementCap, n + 1))} disabled={stampCount >= incrementCap} className="h-12 w-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-30">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {isPoints && (
              <div className="mt-3 flex justify-center gap-2">
                {[5, 10, 50, 100].map((bump) => (
                  <button
                    key={bump}
                    type="button"
                    onClick={() =>
                      setStampCount((n) => Math.min(incrementCap, n + bump))
                    }
                    className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    +{bump}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Annuler</Button>
              <Button className="flex-1 gap-2" onClick={handleStamp}>
                <Check className="h-4 w-4" />
                Confirmer {stampCount} {stampCount > 1 ? unitPlur : unitSing}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (step === "success" && result) {
    const isPointsSuccess = cardInfo?.programType === "POINTS";
    const unitSing = isPointsSuccess ? "point" : "tampon";
    const unitPlur = isPointsSuccess ? "points" : "tampons";
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Card className="shadow-md">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">
                {stampCount > 1
                  ? `${stampCount} ${unitPlur} ajoutés !`
                  : `${unitSing.charAt(0).toUpperCase() + unitSing.slice(1)} ajouté !`}
              </h2>
              <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Client</span>
                  <span className="text-sm font-semibold">{result.client.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">
                    {isPointsSuccess ? "Points" : "Tampons"}
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {isPointsSuccess
                      ? result.card.currentPoints
                      : result.card.currentStamps}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Visites</span>
                  <span className="text-sm font-semibold">{result.card.totalVisits}</span>
                </div>
              </div>
              <Button className="mt-6 w-full gap-2" onClick={reset}><ScanLine className="h-4 w-4" /> Scanner un autre client</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
