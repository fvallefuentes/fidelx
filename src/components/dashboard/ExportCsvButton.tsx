"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Download, Lock, Loader2 } from "lucide-react";

/**
 * Bouton "Exporter CSV" réutilisable.
 * - Si plan FREE → affiche un cadenas + tooltip "Plan Essentiel requis"
 *   et redirige vers /dashboard/settings au clic.
 * - Si plan payant → déclenche le téléchargement via fetch + blob.
 *   On utilise fetch (et pas un lien direct) pour pouvoir gérer 403/500
 *   proprement et afficher une erreur si besoin.
 */
export function ExportCsvButton({
  endpoint,
  filename,
  label = "Exporter CSV",
  size = "sm",
}: {
  endpoint: string; // ex: "/api/merchants/export/clients"
  filename: string; // ex: "fidlify-clients.csv" (fallback si pas dans Content-Disposition)
  label?: string;
  size?: "sm" | "md";
}) {
  const { data: session } = useSession();
  const plan = (session?.user?.plan as string) || "FREE";
  const isFree = plan === "FREE";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    if (isFree) {
      window.location.href = "/dashboard/settings";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Erreur ${res.status}`);
        setTimeout(() => setError(""), 4000);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extraire filename du Content-Disposition s'il existe, sinon fallback
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message || "Erreur réseau");
      setTimeout(() => setError(""), 4000);
    } finally {
      setLoading(false);
    }
  }

  const sizeCls =
    size === "sm" ? "h-8 px-3 text-xs gap-1.5" : "h-9 px-4 text-sm gap-2";

  if (isFree) {
    return (
      <button
        type="button"
        onClick={handleExport}
        title="Export CSV réservé aux plans payants — cliquez pour passer au plan Essentiel"
        className={`export-btn export-btn-locked inline-flex items-center rounded-full ${sizeCls}`}
      >
        <Lock className="h-3 w-3" />
        {label} <span className="export-btn-pill">🔒 Pro</span>
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className={`export-btn export-btn-active inline-flex items-center rounded-full ${sizeCls}`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Download className="h-3 w-3" />
        )}
        {loading ? "Export…" : label}
      </button>
      {error && (
        <div className="export-btn-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
