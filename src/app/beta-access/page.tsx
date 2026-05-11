"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";

/**
 * Page d'accès beta — gate l'accès à fidlify.com pendant la phase de test.
 * Si BETA_ACCESS_PASSWORD est défini côté serveur, toute requête browser
 * sans le cookie fidlify_beta_ok est redirigée ici.
 *
 * Une fois le bon mot de passe saisi, un cookie httpOnly est posé pour
 * 30 jours et l'utilisateur est redirigé vers la page d'origine (?next=...).
 *
 * Non gatée : /api/*, /_next/*, robots.txt, sitemap.xml, icon.svg
 * (machines, webhooks Stripe / Apple Wallet / Google Wallet)
 */
export default function BetaAccessPage() {
  return (
    <Suspense fallback={<div className="beta-shell"><div className="beta-bg" /></div>}>
      <BetaAccessForm />
    </Suspense>
  );
}

function BetaAccessForm() {
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
        setError(data.error || "Mot de passe incorrect");
        setLoading(false);
        return;
      }
      // Cookie posé → on suit la redirection demandée
      router.push(nextUrl);
      router.refresh();
    } catch {
      setError("Erreur réseau, réessayez");
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
          <Lock size={11} /> BÊTA PRIVÉE
        </div>

        <h1 className="beta-title">Accès restreint</h1>
        <p className="beta-sub">
          Fidlify est en phase de test fermé. Saisissez le mot de passe d&apos;accès
          pour continuer.
        </p>

        <form onSubmit={handleSubmit} className="beta-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe d'accès"
            autoFocus
            autoComplete="off"
            required
            className="beta-input"
          />
          {error && <div className="beta-error">{error}</div>}
          <button type="submit" disabled={loading} className="beta-btn">
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Vérification…
              </>
            ) : (
              "Entrer"
            )}
          </button>
        </form>

        <p className="beta-foot">
          Vous représentez un commerce et souhaitez participer au test ?{" "}
          <a href="mailto:contact@fidlify.com">contact@fidlify.com</a>
        </p>
      </div>
    </div>
  );
}
