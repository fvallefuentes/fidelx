"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Printer, X, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";

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
  const t = useTranslations("Dashboard.cardRecovery");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const recoveryUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/carte/${serialNumber}`
      : "";

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
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="recovery-modal-close"
            >
              <X size={16} />
            </button>
          </header>

          <div className="recovery-modal-body">
            <p className="recovery-modal-explain">
              {t.rich("explain", {
                name: clientFirstName,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
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
                    <Check size={14} /> {t("copied")}
                  </>
                ) : (
                  <>
                    <Copy size={14} /> {t("copy")}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="recovery-modal-btn recovery-modal-btn-primary"
              >
                <Printer size={14} /> {t("print")}
              </button>
            </div>
          </div>
        </div>
      </div>

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
            {t("printTitle")}
          </h1>
          <p style={{ margin: "0 0 4px", fontSize: 14 }}>
            <strong>{clientFirstName}</strong> · {programName}
          </p>
          <p style={{ margin: "0 0 24px", fontSize: 12, color: "#666" }}>
            {t("cardNumber", { serialNumber })}
          </p>
          <div style={{ display: "inline-block", padding: 16 }}>
            <canvas ref={printCanvasRef} />
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: "#444" }}>
            {t("printHint")}
            <br />
            {t("printProgress")}
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

      <style>{`
        @media print {
          .recovery-print { display: block !important; }
        }
      `}</style>
    </>
  );
}
