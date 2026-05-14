"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import LogoMark from "@/components/landing/LogoMark";

export default function BetaAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="beta-shell">
          <div className="beta-bg" />
        </div>
      }
    >
      <BetaAccessForm />
    </Suspense>
  );
}

function BetaAccessForm() {
  const t = useTranslations("Public.betaAccess");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("wrongPassword"));
        setLoading(false);
        return;
      }
      router.push(nextUrl);
      router.refresh();
    } catch {
      setError(t("networkError"));
      setLoading(false);
    }
  }

  return (
    <div className="beta-shell">
      <div className="beta-bg" />
      <div className="beta-card">
        <div className="beta-brand">
          <LogoMark size={42} />
          <span>FIDLIFY</span>
        </div>

        <div className="beta-badge">
          <Lock size={11} /> {t("badge")}
        </div>

        <h1 className="beta-title">{t("title")}</h1>
        <p className="beta-sub">{t("subtitle")}</p>

        <form onSubmit={handleSubmit} className="beta-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("placeholder")}
            autoFocus
            autoComplete="off"
            required
            className="beta-input"
          />
          {error && <div className="beta-error">{error}</div>}
          <button type="submit" disabled={loading} className="beta-btn">
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> {t("checking")}
              </>
            ) : (
              t("submit")
            )}
          </button>
        </form>

        <p className="beta-foot">
          {t("foot")} <a href="mailto:contact@fidlify.com">contact@fidlify.com</a>
        </p>
      </div>
    </div>
  );
}
