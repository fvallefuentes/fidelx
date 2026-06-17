"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, RotateCcw, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ClientPreviewModal({
  programId,
  programName,
  open,
  onClose,
}: {
  programId: string;
  programName: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Dashboard.clientPreview");
  const [reloadKey, setReloadKey] = useState(0);

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

  if (!open) return null;

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${programId}`
      : "";

  return (
    <div
      className="recovery-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={onClose}
      style={{
        alignItems: "flex-start",
        paddingTop: "3vh",
        paddingBottom: "3vh",
      }}
    >
      <div
        className="client-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="recovery-modal-head"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 id="preview-modal-title" style={{ fontSize: 16 }}>
            <Smartphone
              size={15}
              style={{ display: "inline", marginRight: 8, verticalAlign: -2 }}
            />
            {t("title", { programName })}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="client-preview-action"
              title={t("reloadTitle")}
            >
              <RotateCcw size={13} /> {t("reload")}
            </button>
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="client-preview-action"
              title={t("openTitle")}
            >
              <ExternalLink size={13} /> {t("newTab")}
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="recovery-modal-close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="client-preview-banner">{t("warning")}</div>

        <div className="client-preview-body">
          <div className="phone-frame">
            <div className="phone-frame-notch" />
            <iframe
              key={reloadKey}
              src={joinUrl}
              title={t("iframeTitle")}
              className="phone-frame-iframe"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
            />
            <div className="phone-frame-home" />
          </div>
        </div>
      </div>
    </div>
  );
}
