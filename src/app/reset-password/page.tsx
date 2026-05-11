"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Check } from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";

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
      setError("Minimum 8 caractères");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
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
      setError(data.error || "Erreur lors du reset");
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
        Accueil
      </Link>

      <div className="auth-card">
        <div className="auth-head">
          <Link href="/" className="auth-brand">
            <LogoMark size={36} />
            <span>FIDLIFY</span>
          </Link>
          <h1 className="auth-title">
            <Lock size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            Réinitialiser le mot de passe
          </h1>
          <p className="auth-desc">
            Définissez un nouveau mot de passe pour votre compte.
          </p>
        </div>

        {!token && (
          <div className="auth-error">
            Lien invalide — aucun token fourni dans l&apos;URL.
          </div>
        )}

        {token && success && (
          <div className="auth-success">
            <Check size={14} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            Mot de passe modifié. Redirection vers la connexion…
          </div>
        )}

        {token && !success && (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">Nouveau mot de passe</label>
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
              <label htmlFor="confirm" className="auth-label">Confirmer</label>
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
                <><Loader2 size={14} className="animate-spin" /> Modification…</>
              ) : (
                "Définir le nouveau mot de passe"
              )}
            </button>
          </form>
        )}

        <div className="auth-foot">
          <Link href="/login">← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
