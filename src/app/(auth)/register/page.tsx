"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LogoMark from "@/components/landing/LogoMark";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const PAID_PLANS = new Set(["essential", "growth", "multi_site"]);

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth.register");
  const common = useTranslations("Auth");
  const plan = searchParams.get("plan") ?? "";
  const ref = searchParams.get("ref") ?? "";
  const isPaidPlan = PAID_PLANS.has(plan);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          ...(ref ? { ref } : {}),
          // L'API saute la verif email pour les plans payants et marque
          // emailVerified immédiatement → on peut auto-login.
          ...(isPaidPlan ? { plan } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("genericError"));
        setLoading(false);
        return;
      }

      // Flow plan payant : auto-login + redirect direct vers Stripe Checkout.
      // L'API a marqué emailVerified=true, donc signIn() passe le check de
      // NextAuth credentials.
      if (isPaidPlan && !data.requiresVerification) {
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInRes?.ok) {
          window.location.href = `/api/checkout?plan=${encodeURIComponent(plan)}`;
          return;
        }
        // Si signIn échoue (rare), on retombe sur le flow standard
      }

      // Flow gratuit : le compte est créé mais l'email n'est pas vérifié.
      // On redirige vers /verify-email où l'utilisateur saisit le code OTP.
      const params = new URLSearchParams({ email: data.email || email });
      if (plan) params.set("plan", plan);
      router.push(`/verify-email?${params.toString()}`);
    } catch {
      setError(t("genericError"));
      setLoading(false);
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
          <p className="auth-desc">{t("description")}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          {ref && (
            <div
              role="status"
              style={{
                background: "rgba(168, 85, 247, 0.12)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                color: "#a855f7",
                fontWeight: 500,
              }}
            >
              🎁 Tu profites d&apos;un parrainage — 1 mois offert sur le plan que tu choisiras, dès ta 1ère facture.
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="name" className="auth-label">{t("businessName")}</label>
            <input
              id="name"
              type="text"
              className="auth-input"
              placeholder={t("businessPlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="organization"
              required
            />
          </div>

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
            <label htmlFor="password" className="auth-label">{t("password")}</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t("loading") : isPaidPlan ? t("submitPaid") : t("submit")}
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0d04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
              </svg>
            )}
          </button>

          <p className="auth-fineprint">
            {t("fineprint")}
          </p>
        </form>

        <div className="auth-foot">
          {t("hasAccount")}{" "}
          <Link href={plan ? `/login?plan=${plan}` : "/login"}>{t("login")}</Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
