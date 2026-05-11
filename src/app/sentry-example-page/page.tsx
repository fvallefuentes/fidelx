"use client";

/**
 * Page de vérification Sentry — à utiliser uniquement pour tester
 * l'intégration. Une fois Sentry confirmé fonctionnel en prod, cette
 * page peut être supprimée (sans casser quoi que ce soit).
 *
 * Disponible sur : /sentry-example-page
 */
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryTestPage() {
  const [thrown, setThrown] = useState<string>("");

  function triggerClientError() {
    setThrown("Erreur client lancée — vérifiez Sentry");
    // Lance volontairement une exception non-catched côté browser
    throw new Error("Sentry test — client error from /sentry-example-page");
  }

  async function triggerServerError() {
    setThrown("");
    const res = await fetch("/api/sentry-example", { method: "POST" });
    setThrown(`Réponse serveur : ${res.status}. Vérifiez Sentry.`);
  }

  function manualCapture() {
    Sentry.captureException(new Error("Sentry test — manual captureException"));
    setThrown("Erreur capturée manuellement — vérifiez Sentry");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f4f5f1",
        padding: 40,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🐛 Test Sentry</h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 32 }}>
        Utilisez les boutons ci-dessous pour déclencher des erreurs et vérifier
        qu&apos;elles remontent dans le dashboard Sentry.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={triggerClientError}
          style={btnStyle("#ff7a6b")}
        >
          1. Erreur client React (throw)
        </button>
        <button
          onClick={triggerServerError}
          style={btnStyle("#ffd66b")}
        >
          2. Erreur serveur API (POST /api/sentry-example)
        </button>
        <button
          onClick={manualCapture}
          style={btnStyle("#d4ff4e")}
        >
          3. Capture manuelle (Sentry.captureException)
        </button>
      </div>

      {thrown && (
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            background: "rgba(212,255,78,0.08)",
            border: "1px solid rgba(212,255,78,0.3)",
            borderRadius: 8,
            color: "#d4ff4e",
            fontSize: 14,
          }}
        >
          ✓ {thrown}
        </div>
      )}

      <div
        style={{
          marginTop: 40,
          fontSize: 12,
          color: "#666",
          borderTop: "1px solid #222",
          paddingTop: 20,
        }}
      >
        Dashboard Sentry :{" "}
        <a
          href="https://fidlify.sentry.io/issues/"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#d4ff4e" }}
        >
          fidlify.sentry.io/issues
        </a>
        <br />
        Cette page est non-indexée (noindex). Vous pouvez la supprimer une fois
        l&apos;intégration validée.
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: 10,
    border: `1px solid ${color}`,
    background: "transparent",
    color,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
  };
}
