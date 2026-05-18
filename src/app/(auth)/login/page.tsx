"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LogoMark from "@/components/landing/LogoMark";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const PAID_PLANS = ["essential", "growth", "multi_site"];

function LoginForm() {
  const searchParams = useSearchParams();
  const t = useTranslations("Auth.login");
  const common = useTranslations("Auth");
  const plan = searchParams.get("plan") ?? "";
  const isPaidPlan = PAID_PLANS.includes(plan);
  const justVerified = searchParams.get("verified") === "1";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      totp: totp || undefined,
      redirect: false,
    });

    if (result?.error) {
      // Cas spécial : email non vérifié → on relance un code et on redirige
      if (result.error.startsWith("EMAIL_NOT_VERIFIED:")) {
        const blockedEmail = result.error.split(":")[1] || email;
        await fetch("/api/auth/resend-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: blockedEmail }),
        }).catch(() => {});
        const params = new URLSearchParams({ email: blockedEmail });
        if (plan) params.set("plan", plan);
        router.push(`/verify-email?${params.toString()}`);
        return;
      }

      // 2FA requis : on garde le password et on affiche le champ TOTP
      if (result.error === "TOTP_REQUIRED") {
        setTotpRequired(true);
        setError("");
        setLoading(false);
        return;
      }

      // 2FA code invalide : on garde le formulaire ouvert, message clair
      if (result.error === "TOTP_INVALID") {
        setError("Code à deux facteurs incorrect. Réessayez ou utilisez un code de récupération.");
        setLoading(false);
        return;
      }

      setError(t("invalidCredentials"));
      setLoading(false);
    } else if (isPaidPlan) {
      window.location.href = `/api/checkout?plan=${plan}`;
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="landing auth-shell">
      <div className="ambient" />
      <div className="grid-overlay" />

      <Link href="/" className="auth-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        {common("backHome")}
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
          <h1 className="auth-title">{t("title")}</h1>
          <p className="auth-desc">
            {isPaidPlan
              ? t("paidDescription")
              : t("description")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {justVerified && !error && (
            <div className="auth-success">
              ✓ {t("verified")}
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">{t("email")}</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label htmlFor="password" className="auth-label">{t("password")}</label>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: 12,
                  color: "#d4ff4e",
                  textDecoration: "none",
                }}
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {totpRequired && (
            <div className="auth-field">
              <label htmlFor="totp" className="auth-label">
                Code à deux facteurs
              </label>
              <input
                id="totp"
                type="text"
                className="auth-input"
                placeholder="000000 ou XXXX-XXXX-XX"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                autoComplete="one-time-code"
                inputMode="text"
                autoFocus
                required
              />
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
                Code à 6 chiffres de votre app TOTP, ou code de récupération.
              </p>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t("loading") : isPaidPlan ? t("submitPaid") : t("submit")}
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0d04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
              </svg>
            )}
          </button>
        </form>

        <div className="auth-foot">
          {t("noAccount")}{" "}
          <Link href={plan ? `/register?plan=${plan}` : "/register"}>{t("createAccount")}</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
