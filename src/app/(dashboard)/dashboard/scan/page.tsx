"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Check, AlertCircle, PartyPopper, ScanLine, RotateCcw, Camera, Gift } from "lucide-react";

interface CardInfo {
  clientName: string;
  programName: string;
  merchantName: string;
  programType: string;
  currentStamps: number;
  maxStamps: number;
  currentPoints: number;
  status: string;
}

interface StampResult {
  card: { currentStamps: number; totalVisits: number; status: string };
  client: { firstName: string };
  rewardUnlocked: { name: string } | null;
  rewardPending: boolean;
}

type Step = "scan" | "confirm" | "reward_pending" | "stamping" | "claiming" | "success" | "reward_claimed" | "error";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScanRef = useRef<string>("");

  const [step, setStep] = useState<Step>("scan");
  const [serialNumber, setSerialNumber] = useState("");
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [stampCount, setStampCount] = useState(1);
  const [result, setResult] = useState<StampResult | null>(null);
  const [claimedClient, setClaimedClient] = useState("");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
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
    try {
      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code && code.data && code.data !== lastScanRef.current) {
        lastScanRef.current = code.data;
        stopCamera();
        await handleScan(code.data);
        return;
      }
    } catch { /* ignore */ }
    rafRef.current = requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCamera]);

  useEffect(() => {
    if (step !== "scan") return;
    lastScanRef.current = "";

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const caps = (track as any).getCapabilities?.();
          if (caps?.focusMode?.includes("continuous")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (track as any).applyConstraints?.({ advanced: [{ focusMode: "continuous" }] });
          }
        } catch { /* ignore */ }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraReady(true);
            rafRef.current = requestAnimationFrame(tick);
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setCameraError(
          msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")
            ? "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur."
            : "Impossible d'accéder à la caméra : " + msg
        );
      }
    }
    startCamera();
    return () => stopCamera();
  }, [step, tick, stopCamera]);

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
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
                <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
                  <Camera className="h-7 w-7 text-red-500" />
                </div>
                <p className="text-sm text-red-600 font-medium">{cameraError}</p>
                <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Réessayer</Button>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="w-full block" playsInline muted autoPlay style={{ maxHeight: "70vh", objectFit: "cover" }} />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative z-10 w-56 h-56">
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-xl" />
                    {cameraReady && <div className="absolute inset-x-2 h-0.5 bg-blue-400 rounded animate-scan-line" />}
                  </div>
                  {!cameraReady && (
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
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (step === "stamping" || step === "claiming") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-500">{step === "claiming" ? "Validation de la récompense..." : "Ajout des tampons..."}</p>
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
    const isStamps = cardInfo.programType === "STAMPS" || cardInfo.programType === "HYBRID";
    const remaining = Math.max(0, cardInfo.maxStamps - cardInfo.currentStamps);
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajouter des tampons</h1>
          <p className="text-sm text-gray-500">Carte identifiée — confirmez le tamponnage</p>
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
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium text-gray-700 text-center mb-4">Nombre de tampons à ajouter</p>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setStampCount((n) => Math.max(1, n - 1))} disabled={stampCount <= 1} className="h-12 w-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-30">
                <Minus className="h-5 w-5" />
              </button>
              <span className="text-4xl font-bold text-gray-900 w-12 text-center">{stampCount}</span>
              <button onClick={() => setStampCount((n) => Math.min(isStamps ? remaining : 10, n + 1))} disabled={isStamps && stampCount >= remaining} className="h-12 w-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-30">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Annuler</Button>
              <Button className="flex-1 gap-2" onClick={handleStamp}><Check className="h-4 w-4" />Confirmer {stampCount} tampon{stampCount > 1 ? "s" : ""}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (step === "success" && result) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Card className="shadow-md">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">{stampCount > 1 ? `${stampCount} tampons ajoutés !` : "Tampon ajouté !"}</h2>
              <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Client</span>
                  <span className="text-sm font-semibold">{result.client.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Tampons</span>
                  <span className="text-sm font-bold text-blue-600">{result.card.currentStamps}</span>
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