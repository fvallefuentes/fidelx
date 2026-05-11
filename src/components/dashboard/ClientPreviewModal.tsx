"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, RotateCcw, Smartphone } from "lucide-react";

/**
 * Modal "Voir comme un client" : affiche la page /join/[programId] dans un
 * iframe avec une mise en scène smartphone, pour que le commerçant puisse
 * visualiser exactement ce que voit son client.
 *
 * - Ouverture en iframe = pas de simulation à maintenir, on utilise le flow
 *   réel. Si le commerçant remplit le formulaire, une vraie carte sera créée
 *   (avertissement affiché en banner).
 * - Bouton "Ouvrir dans un nouvel onglet" pour tester sur son téléphone.
 * - Bouton "Recharger" pour reset l'iframe (cas : il a soumis et veut retester).
 */
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
        <header className="recovery-modal-head" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 id="preview-modal-title" style={{ fontSize: 16 }}>
            <Smartphone
              size={15}
              style={{ display: "inline", marginRight: 8, verticalAlign: -2 }}
            />
            Aperçu client — {programName}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="client-preview-action"
              title="Recharger l'aperçu"
            >
              <RotateCcw size={13} /> Recharger
            </button>
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="client-preview-action"
              title="Ouvrir dans un nouvel onglet (pour tester sur smartphone)"
            >
              <ExternalLink size={13} /> Nouvel onglet
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="recovery-modal-close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="client-preview-banner">
          ⚠️ Si vous remplissez le formulaire ici, une <strong>vraie carte</strong> sera
          créée sur votre programme. Utilisez votre propre email/téléphone pour
          un vrai test, ou simplement scrollez pour voir l&apos;interface client.
        </div>

        <div className="client-preview-body">
          {/* Phone frame */}
          <div className="phone-frame">
            <div className="phone-frame-notch" />
            <iframe
              key={reloadKey}
              src={joinUrl}
              title="Aperçu client"
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
