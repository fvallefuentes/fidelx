"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LogoMark from "@/components/landing/LogoMark";

interface ProgramInfo {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  cardDesign: {
    bgColor?: string;
    textColor?: string;
    stampColor?: string;
    stampCheckColor?: string;
    stampEmptyColor?: string;
    labelColor?: string;
    logoData?: string;
    description?: string;
  };
  merchant: { name: string };
  establishment?: { name: string; address?: string };
}

export default function JoinPage() {
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [walletUrl, setWalletUrl] = useState("");
  const [googleWalletUrl, setGoogleWalletUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/programs/${programId}/public`)
      .then((res) => res.json())
      .then(setProgram)
      .catch(() => setError("Programme introuvable"))
      .finally(() => setLoading(false));
  }, [programId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !phone) {
      setError("Email ou téléphone requis");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/programs/${programId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        email: email || undefined,
        phone: phone || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de l'inscription");
      setSubmitting(false);
      return;
    }
    setWalletUrl(data.walletUrl || "");
    setGoogleWalletUrl(data.googleWalletUrl || "");
    setSuccess(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="join-shell join-loading">
        <div className="join-spinner" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="join-shell">
        <BrandHeader />
        <div className="join-empty">
          <h1>Programme introuvable</h1>
          <p>Ce programme n&apos;existe pas ou n&apos;est plus actif.</p>
          <Link href="/" className="join-link">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const design = program.cardDesign || {};
  const max =
    (program.config.maxStamps as number) ||
    ((program.config.tiers as { points: number }[])?.[0]?.points) ||
    10;

  return (
    <div className="join-shell">
      <BrandHeader />

      <div className="join-card-stage">
        <CardPreview
          bgColor={design.bgColor || "#1a1a2e"}
          textColor={design.textColor || "#ffffff"}
          stampColor={design.stampColor}
          stampCheckColor={design.stampCheckColor}
          stampEmptyColor={design.stampEmptyColor}
          labelColor={design.labelColor}
          logoData={design.logoData}
          programName={program.name}
          maxStamps={max}
          filled={success ? 0 : 0}
          clientName={success ? firstName : undefined}
        />
      </div>

      {success ? (
        <div className="join-card join-success">
          <div className="join-check">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="join-h2">Carte créée !</h2>
          <p className="join-sub">
            Ajoutez-la maintenant à votre Wallet pour la garder à portée de main.
          </p>

          <div className="join-actions">
            {walletUrl && (
              <a href={walletUrl} className="join-btn-apple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.39c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 4zm-3.1-17.24c-2.22.22-4.03 2.46-3.79 4.5 2.04.16 4.09-2.16 3.79-4.5z" />
                </svg>
                Ajouter à Apple Wallet
              </a>
            )}
            {googleWalletUrl && (
              <a href={googleWalletUrl} className="join-btn-google">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Ajouter à Google Wallet
              </a>
            )}
          </div>

          <p className="join-fineprint">
            Pas besoin d&apos;application — la carte vit dans votre Wallet.
          </p>
        </div>
      ) : (
        <div className="join-card">
          <div className="join-eyebrow">
            <span className="join-dot" /> {program.merchant.name}
            {program.establishment && ` · ${program.establishment.name}`}
          </div>
          <h1 className="join-h1">Rejoignez le programme.</h1>
          <p className="join-sub">
            Recevez votre carte de fidélité directement dans votre Wallet —
            sans application à télécharger.
          </p>

          <form onSubmit={handleSubmit} className="join-form">
            {error && <div className="join-error">{error}</div>}

            <div className="join-field">
              <label htmlFor="firstName">Prénom</label>
              <input
                id="firstName"
                type="text"
                placeholder="Votre prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>

            <div className="join-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="votre@email.ch"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="join-or">ou</div>

            <div className="join-field">
              <label htmlFor="phone">Téléphone</label>
              <input
                id="phone"
                type="tel"
                placeholder="+41 79 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <button type="submit" className="join-submit" disabled={submitting}>
              {submitting ? "Création…" : "Obtenir ma carte"}
              {!submitting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0d04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
                </svg>
              )}
            </button>

            <p className="join-fineprint">
              En vous inscrivant, vous acceptez la politique de confidentialité.
              Vos données sont hébergées en Suisse 🇨🇭
            </p>
          </form>
        </div>
      )}

      <footer className="join-footer">
        <Link href="/" className="join-brand-tiny">
          <LogoMark size={20} />
          <span>FIDLIFY</span>
        </Link>
        <span>Made in Switzerland</span>
      </footer>
    </div>
  );
}

/* ─── Brand header (top of page) ────────────────────────── */
function BrandHeader() {
  return (
    <header className="join-brand-bar">
      <Link href="/" className="join-brand">
        <LogoMark size={32} />
        <span>FIDLIFY</span>
      </Link>
    </header>
  );
}

/* ─── Wallet card preview (uses program's cardDesign) ───── */
function CardPreview({
  bgColor,
  textColor,
  stampColor,
  stampCheckColor,
  stampEmptyColor,
  labelColor,
  logoData,
  programName,
  maxStamps,
  filled,
  clientName,
}: {
  bgColor: string;
  textColor: string;
  stampColor?: string;
  stampCheckColor?: string;
  stampEmptyColor?: string;
  labelColor?: string;
  logoData?: string;
  programName: string;
  maxStamps: number;
  filled: number;
  clientName?: string;
}) {
  const total = Math.max(1, Math.min(20, maxStamps));
  const rows = total <= 5 ? 1 : 2;
  const perRow = Math.ceil(total / rows);
  const isDarkBg = isDarkHex(bgColor);

  const sFill = stampColor || (isDarkBg ? "#ffffff" : "#0a0a0a");
  const sCheck = stampCheckColor || bgColor;
  const sEmpty = stampEmptyColor || sFill;
  const lblColor = labelColor || (isDarkBg ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)");

  return (
    <div className="jcp" style={{ background: bgColor, color: textColor }}>
      <div className="jcp-head">
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoData} alt="Logo" className="jcp-logo" />
        ) : (
          <span className="jcp-logo-empty" style={{ color: lblColor }}>
            {programName.toUpperCase().slice(0, 14)}
          </span>
        )}
        <span className="jcp-offer" style={{ color: lblColor }}>
          OFFRE
        </span>
      </div>

      <div
        className="jcp-stamps"
        style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <span
              key={i}
              className="jcp-stamp"
              style={{
                background: isFilled ? sFill : "transparent",
                borderColor: isFilled ? sFill : sEmpty,
                color: sCheck,
              }}
            >
              {isFilled && (
                <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
          );
        })}
      </div>

      <div className="jcp-fields">
        <div>
          <div className="jcp-label" style={{ color: lblColor }}>
            {clientName ? "CLIENT" : "TAMPONS REQUIS POUR LA RÉCOMPENSE"}
          </div>
          <div className="jcp-value">{clientName || maxStamps}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="jcp-label" style={{ color: lblColor }}>
            PROGRAMME
          </div>
          <div className="jcp-value">{programName}</div>
        </div>
      </div>

      <div className="jcp-qr-wrap">
        <span className="jcp-qr" />
      </div>
    </div>
  );
}

function isDarkHex(hex: string): boolean {
  const m = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return true;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
