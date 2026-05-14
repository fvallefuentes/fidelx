"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, KeyRound, Loader2, Check } from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth.forgotPassword");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("sendError"));
      return;
    }
    // Réponse opaque : on affiche toujours le même message succès,
    // que l'email existe ou pas (anti-enumeration côté UI)
    setSent(true);
  }

  return (
    <div className="landing auth-shell">
      <div className="ambient" />
      <div className="grid-overlay" />

      <Link href="/login" className="auth-back">
        <ArrowLeft size={14} />
        {t("back")}
      </Link>
      <div className="auth-language">
        <LanguageSwitcher compact />
      </div>

      <div className="auth-card">
        <div className="auth-head">
          <Link href="/" className="auth-brand">
            <LogoMark size={36} />
            <span>FIDLIFY</span>
          </Link>
          <h1 className="auth-title">
            <KeyRound size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            {t("title")}
          </h1>
          <p className="auth-desc">{t("description")}</p>
        </div>

        {sent ? (
          <div className="auth-success" style={{ lineHeight: 1.6 }}>
            <Check size={14} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            <strong>{t("sentTitle")}</strong>
            <br />
            {t("sentBody", { email })}
            <br />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {t("sentHint")}
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                {t("emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> {t("sending")}
                </>
              ) : (
                t("submit")
              )}
            </button>

            <p className="auth-fineprint">
              {t("fineprint")}
            </p>
          </form>
        )}

        <div className="auth-foot">
          {t("remember")}{" "}
          <Link href="/login">{t("backLogin")}</Link>
        </div>
      </div>
    </div>
  );
}
