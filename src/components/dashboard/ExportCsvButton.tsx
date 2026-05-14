"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Download, Lock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Reusable CSV export button.
 * Free plans are redirected to settings; paid plans download through fetch so
 * API errors can be displayed inline.
 */
export function ExportCsvButton({
  endpoint,
  filename,
  label,
  size = "sm",
}: {
  endpoint: string;
  filename: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("Dashboard.export");
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
        setError(data.error || t("statusError", { status: res.status }));
        setTimeout(() => setError(""), 4000);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message || t("networkError"));
      setTimeout(() => setError(""), 4000);
    } finally {
      setLoading(false);
    }
  }

  const sizeCls =
    size === "sm" ? "h-8 px-3 text-xs gap-1.5" : "h-9 px-4 text-sm gap-2";
  const displayLabel = label ?? t("label");

  if (isFree) {
    return (
      <button
        type="button"
        onClick={handleExport}
        title={t("lockedTitle")}
        className={`export-btn export-btn-locked inline-flex items-center rounded-full ${sizeCls}`}
      >
        <Lock className="h-3 w-3" />
        {displayLabel} <span className="export-btn-pill">{t("pro")}</span>
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
        {loading ? t("loading") : displayLabel}
      </button>
      {error && (
        <div className="export-btn-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
