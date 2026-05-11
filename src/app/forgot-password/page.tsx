"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Check } from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";

export default function ForgotPasswordPage() {
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
      setError(data.error || "Erreur lors de l'envoi");
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
        Connexion
      </Link>

      <div className="auth-card">
        <div className="auth-head">
          <Link href="/" className="auth-brand">
            <LogoMark size={36} />
            <span>FIDLIFY</span>
          </Link>
          <h1 className="auth-title">
            <KeyRound size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            Mot de passe oublié
          </h1>
          <p className="auth-desc">
            Recevez un lien sécurisé pour réinitialiser votre mot de passe.
          </p>
        </div>

        {sent ? (
          <div className="auth-success" style={{ lineHeight: 1.6 }}>
            <Check size={14} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            <strong>Email envoyé.</strong>
            <br />
            Si un compte existe pour <strong>{email}</strong>, vous recevrez
            un lien de réinitialisation dans les prochaines minutes.
            <br />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              Vérifiez vos spams si vous ne le voyez pas. Le lien est valable 24h.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                Email du compte
              </label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="votre@email.ch"
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
                  <Loader2 size={14} className="animate-spin" /> Envoi…
                </>
              ) : (
                "Envoyer le lien de réinitialisation"
              )}
            </button>

            <p className="auth-fineprint">
              Pour la sécurité, nous confirmerons toujours l&apos;envoi —
              même si l&apos;email n&apos;est pas associé à un compte.
            </p>
          </form>
        )}

        <div className="auth-foot">
          Vous vous souvenez ?{" "}
          <Link href="/login">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
