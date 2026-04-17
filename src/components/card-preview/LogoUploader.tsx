"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCroppedImage } from "./cropImage";

interface LogoUploaderProps {
  programId: string;
  currentLogoUrl: string | null;
  onUploaded: (blobKey: string) => void;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const LOGO_ASPECT = 160 / 50;

export function LogoUploader({ programId, currentLogoUrl, onUploaded }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [autoTrimmedUrl, setAutoTrimmedUrl] = useState<string | null>(null);
  const [pendingBlobKey, setPendingBlobKey] = useState<string | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Format invalide (PNG, JPEG ou WEBP).");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Fichier trop volumineux (max 5 Mo).");
      return;
    }

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    setAutoTrimmedUrl(null);
    setPendingBlobKey(null);

    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("type", "logo");
      const res = await fetch(`/api/programs/${programId}/upload-image`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setError("Upload échoué.");
        return;
      }
      const data: unknown = await res.json();
      const key =
        data && typeof data === "object" && typeof (data as { blobKey?: unknown }).blobKey === "string"
          ? (data as { blobKey: string }).blobKey
          : `program-${programId}/logo.png`;
      setPendingBlobKey(key);
      setAutoTrimmedUrl(`/api/blob/${key}?v=${Date.now()}`);
    } finally {
      setBusy(false);
    }
  }

  function handleAccept() {
    if (!pendingBlobKey) return;
    onUploaded(pendingBlobKey);
    setAutoTrimmedUrl(null);
    setPendingBlobKey(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(null);
  }

  function openCropModal() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
  }

  function closeCropModal() {
    setCropOpen(false);
  }

  async function handleValidateCrop() {
    if (!originalUrl || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImage(originalUrl, croppedAreaPixels);
      const file = new File([blob], "logo.png", { type: "image/png" });
      const form = new FormData();
      form.set("file", file);
      form.set("type", "logo");
      form.set("skipTrim", "true");
      const res = await fetch(`/api/programs/${programId}/upload-image`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setError("Upload échoué.");
        return;
      }
      const data: unknown = await res.json();
      const key =
        data && typeof data === "object" && typeof (data as { blobKey?: unknown }).blobKey === "string"
          ? (data as { blobKey: string }).blobKey
          : `program-${programId}/logo.png`;
      onUploaded(key);
      setCropOpen(false);
      setAutoTrimmedUrl(null);
      setPendingBlobKey(null);
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setOriginalUrl(null);
    } finally {
      setBusy(false);
    }
  }

  const showReviewPanel = autoTrimmedUrl && pendingBlobKey;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {currentLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentLogoUrl}
              alt="logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-400">Aucun</span>
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {busy ? "Envoi..." : currentLogoUrl ? "Remplacer" : "Uploader un logo"}
          </Button>
          <p className="mt-1 text-xs text-gray-500">PNG, JPEG ou WEBP — 5 Mo max.</p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {showReviewPanel && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-700">Résultat auto-détouré</p>
          <div className="mb-3 flex h-20 items-center justify-center rounded-md border border-gray-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={autoTrimmedUrl}
              alt="auto-trimmed"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAccept} disabled={busy}>
              Parfait ✓
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCropModal}
              disabled={busy || !originalUrl}
            >
              Recadrer manuellement
            </Button>
          </div>
        </div>
      )}

      {cropOpen && originalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-gray-900">Recadrer le logo</h3>
            <div className="relative h-[300px] w-full overflow-hidden rounded-lg bg-gray-900">
              <Cropper
                image={originalUrl}
                crop={crop}
                zoom={zoom}
                aspect={LOGO_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-gray-600">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeCropModal}
                disabled={busy}
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleValidateCrop}
                disabled={busy || !croppedAreaPixels}
              >
                {busy ? "Envoi..." : "Valider le recadrage"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
