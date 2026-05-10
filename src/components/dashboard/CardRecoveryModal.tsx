"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Printer, X, Smartphone } from "lucide-react";
import QRCode from "qrcode";

/**
 * Modal de récupération de carte client.
 *
 * Usage commerçant :
 * - Le client perd sa carte Wallet (suppression accidentelle, changement
 *   de téléphone) et revient en magasin
 * - Le commerçant ouvre cette modal depuis la liste des clients
 * - Le QR code pointe vers /carte/[serialNumber] qui réinstalle la carte
 *   avec sa progression intacte (Apple/Google Wallet idempotents)
 */
export default function CardRecoveryModal({
  open,
  onClose,
  clientFirstName,
  programName,
  serialNumber,
}: {
  open: boolean;
  onClose: () => void;
  clientFirstName: string;
  programName: string;
  serialNumber: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const recoveryUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/carte/${serialNumber}`
      : "";

  // Bloquer scroll body + Échap pour fermer
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Générer les QR codes (modal + zone print)
  useEffect(() => {
    if (!open || !recoveryUrl) return;
    const opts = {
      width: 240,
      margin: 2,
      color: { dark: "#0a0d04", light: "#ffffff" },
    };
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, recoveryUrl, opts).catch(() => {});
    }
    if (printCanvasRef.current) {
      QRCode.toCanvas(printCanvasRef.current, recoveryUrl, {
        ...opts,
        width: 320,
      }).catch(() => {});
    }
  }, [open, recoveryUrl]);

  function handleCopy() {
    if (!recoveryUrl) return;
    navigator.clipboard.writeText(recoveryUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePrint() {
    window.print();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="recovery-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-modal-title"
        onClick={onClose}
      >
        <div className="recovery-modal" onClick={(e) => e.stopPropagation()}>
          <header className="recovery-modal-head">
            <h2 id="recovery-modal-title">
              <Smartphone
                size={16}
                style={{ display: "inline", marginRight: 8, verticalAlign: -2 }}
              />
              Récupération de carte
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="recovery-modal-close"
            >
              <X size={16} />
            </button>
          </header>

          <div className="recovery-modal-body">
            <p className="recovery-modal-explain">
              Si <strong>{clientFirstName}</strong> a perdu sa carte ou changé
              de téléphone, scanner ce QR code lui permet de la{" "}
              <strong>réinstaller dans son Wallet</strong> avec sa progression
              actuelle préservée.
            </p>

            <div className="recovery-qr-frame">
              <canvas ref={canvasRef} />
            </div>

            <div className="recovery-modal-meta">
              <strong>{programName}</strong>
              <br />
              <span style={{ fontSize: 11, color: "#8a8e84" }}>
                {serialNumber}
              </span>
            </div>

            <div className="recovery-modal-url">{recoveryUrl}</div>

            <div className="recovery-modal-actions">
              <button
                type="button"
                onClick={handleCopy}
                className="recovery-modal-btn recovery-modal-btn-ghost"
              >
                {copied ? (
                  <>
                    <Check size={14} /> Copié
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copier le lien
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="recovery-modal-btn recovery-modal-btn-primary"
              >
                <Printer size={14} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zone print only — masquée à l'écran, révélée au print */}
      <div className="recovery-print" style={{ display: "none" }}>
        <div
          style={{
            display: "block",
            maxWidth: 600,
            margin: "0 auto",
            textAlign: "center",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          <div style={{ marginBottom: 16, fontSize: 28, fontWeight: 700 }}>
            FIDLIFY
          </div>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>
            Récupérer la carte de fidélité
          </h1>
          <p style={{ margin: "0 0 4px", fontSize: 14 }}>
            <strong>{clientFirstName}</strong> · {programName}
          </p>
          <p style={{ margin: "0 0 24px", fontSize: 12, color: "#666" }}>
            Carte n° {serialNumber}
          </p>
          <div style={{ display: "inline-block", padding: 16 }}>
            <canvas ref={printCanvasRef} />
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: "#444" }}>
            Scannez ce QR code pour réinstaller votre carte dans votre Wallet.
            <br />
            Votre progression est conservée.
          </p>
          <p
            style={{
              marginTop: 16,
              fontSize: 11,
              color: "#888",
              wordBreak: "break-all",
            }}
          >
            {recoveryUrl}
          </p>
        </div>
      </div>

      {/* CSS print-only override pour révéler la zone d'impression */}
      <style>{`
        @media print {
          .recovery-print { display: block !important; }
        }
      `}</style>
    </>
  );
}
