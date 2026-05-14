"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Check } from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useTranslations("Auth.resetPassword");
  const auth = useTranslations("Auth");
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("minLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("genericError"));
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="landing auth-shell">
      <div className="ambient" />
      <div className="grid-overlay" />

      <Link href="/" className="auth-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
        </svg>
        {auth("backHome")}
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
            <Lock size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            {t("title")}
          </h1>
          <p className="auth-desc">{t("description")}</p>
        </div>

        {!token && (
          <div className="auth-error">
            {t("invalidLink")}
          </div>
        )}

        {token && success && (
          <div className="auth-success">
            <Check size={14} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            {t("success")}
          </div>
        )}

        {token && !success && (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">{t("newPassword")}</label>
              <input
                id="password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirm" className="auth-label">{t("confirm")}</label>
              <input
                id="confirm"
                type="password"
                className="auth-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> {t("saving")}</>
              ) : (
                t("submit")
              )}
            </button>
          </form>
        )}

        <div className="auth-foot">
          <Link href="/login">{t("backLogin")}</Link>
        </div>
      </div>
    </div>
  );
}
