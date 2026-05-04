"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import LogoMark from "@/components/landing/LogoMark";

const PAID_PLANS = ["essential", "growth", "multi_site"];

function RegisterForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? "";
  const isPaidPlan = PAID_PLANS.includes(plan);

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
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      // Après inscription : checkout si plan payant, sinon dashboard
      const callbackUrl = isPaidPlan
        ? `/api/checkout?plan=${plan}`
        : "/dashboard";

      await signIn("credentials", { email, password, callbackUrl });
    } catch {
      setError("Erreur lors de l'inscription");
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
        Accueil
      </Link>

      <div className="auth-card">
        <div className="auth-head">
          <Link href="/" className="auth-brand">
            <LogoMark size={36} />
            <span>FIDLIFY</span>
          </Link>
          <h1 className="auth-title">Créer un compte</h1>
          <p className="auth-desc">Lancez votre programme de fidélité en 5 minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="name" className="auth-label">Nom du commerce</label>
            <input
              id="name"
              type="text"
              className="auth-input"
              placeholder="Boulangerie du Lac"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="organization"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="votre@email.ch"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Mot de passe</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Création..." : "Créer mon compte gratuit"}
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0d04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
              </svg>
            )}
          </button>

          <p className="auth-fineprint">
            En créant un compte, vous acceptez nos conditions d&apos;utilisation
            et notre politique de confidentialité.
          </p>
        </form>

        <div className="auth-foot">
          Déjà un compte ?{" "}
          <Link href={plan ? `/login?plan=${plan}` : "/login"}>Se connecter</Link>
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
