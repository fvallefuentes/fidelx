"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LogoMark from "@/components/landing/LogoMark";

const PAID_PLANS = ["essential", "growth", "multi_site"];
const RESEND_COOLDOWN = 60;

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const plan = searchParams.get("plan") ?? "";
  const isPaidPlan = PAID_PLANS.includes(plan);

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus 1er input au mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Décrément cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  function handleDigitChange(i: number, value: string) {
    const v = value.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError("");

    if (v && i < 5) inputRefs.current[i + 1]?.focus();
    if (v && i === 5) {
      // Auto-submit quand le 6e chiffre est rempli
      void doVerify(next.join(""));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowRight" && i < 5) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      e.preventDefault();
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      setDigits(next);
      const lastIndex = Math.min(pasted.length, 5);
      inputRefs.current[lastIndex]?.focus();
      if (pasted.length === 6) void doVerify(pasted);
    }
  }

  async function doVerify(code: string) {
    if (submitting || code.length !== 6) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Code invalide");
        setSubmitting(false);
        // Reset focus sur le premier champ pour rééssayer
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      setSuccess(true);
      // Login automatique : on n'a pas le password ici → on doit
      // demander à l'utilisateur de se connecter. Solution : passer
      // le password en query param est dangereux. On redirige vers
      // /login avec email pré-rempli.
      const next = isPaidPlan ? `/login?plan=${plan}&verified=1` : "/login?verified=1";
      setTimeout(() => {
        window.location.href = next;
      }, 1500);
    } catch {
      setError("Erreur de connexion");
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.cooldownSeconds) setResendCooldown(data.cooldownSeconds);
        setError(data.error || "Erreur lors de l'envoi du code");
      } else {
        setResendCooldown(RESEND_COOLDOWN);
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <div className="landing auth-shell">
        <div className="ambient" />
        <div className="grid-overlay" />
        <div className="auth-card">
          <div className="auth-head">
            <Link href="/" className="auth-brand">
              <LogoMark size={36} />
              <span>FIDLIFY</span>
            </Link>
            <h1 className="auth-title">Email manquant</h1>
            <p className="auth-desc">
              Cette page nécessite un email en paramètre. Veuillez recommencer
              l&apos;inscription.
            </p>
          </div>
          <div className="auth-foot">
            <Link href="/register">Retour à l&apos;inscription</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing auth-shell">
      <div className="ambient" />
      <div className="grid-overlay" />

      <Link href="/" className="auth-back">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Accueil
      </Link>

      <div className="auth-card">
        <div className="auth-head">
          <Link href="/" className="auth-brand">
            <LogoMark size={36} />
            <span>FIDLIFY</span>
          </Link>
          <h1 className="auth-title">Vérifiez votre email</h1>
          <p className="auth-desc">
            Nous avons envoyé un code à{" "}
            <strong style={{ color: "#f4f5f1" }}>{email}</strong>.<br />
            Saisissez-le ci-dessous (valable 15 minutes).
          </p>
        </div>

        {success ? (
          <div className="verify-success">
            <div className="verify-success-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p>
              Email vérifié&nbsp;! Redirection vers la connexion…
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void doVerify(digits.join(""));
            }}
            className="auth-form"
          >
            {error && <div className="auth-error">{error}</div>}

            <div className="otp-row" role="group" aria-label="Code de vérification 6 chiffres">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="otp-input"
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Chiffre ${i + 1}`}
                  disabled={submitting}
                />
              ))}
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={submitting || digits.join("").length !== 6}
            >
              {submitting ? "Vérification…" : "Vérifier mon email"}
            </button>

            <div className="verify-resend">
              {resendCooldown > 0 ? (
                <span className="verify-resend-disabled">
                  Renvoyer un code dans {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="verify-resend-btn"
                >
                  {resending ? "Envoi…" : "Renvoyer un code"}
                </button>
              )}
            </div>

            <p className="auth-fineprint">
              Vérifiez vos spams si vous ne recevez pas le code.
            </p>
          </form>
        )}

        <div className="auth-foot">
          <Link href="/login">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
