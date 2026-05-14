"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LogoMark from "@/components/landing/LogoMark";

interface ProgramInfo {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  cardDesign: {
    logoData?: string;
  };
  merchant: { name: string };
  establishment?: { name: string; address?: string };
  showFidlifyBranding: boolean;
}

export default function JoinPage() {
  const t = useTranslations("Public.join");
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [walletUrl, setWalletUrl] = useState("");
  const [googleWalletUrl, setGoogleWalletUrl] = useState("");
  const [error, setError] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    fetch(`/api/programs/${programId}/public`)
      .then((res) => res.json())
      .then(setProgram)
      .catch(() => setError(t("notFoundError")))
      .finally(() => setLoading(false));
  }, [programId, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !phone) {
      setError(t("contactRequired"));
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
        birthDate: birthDate || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409 && data.recoveryEmailSent) {
        setRecoverySent(true);
        setSubmitting(false);
        return;
      }
      setError(data.error || t("submitError"));
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
        <BrandHeader showFidlify />
        <div className="join-empty">
          <h1>{t("notFoundTitle")}</h1>
          <p>{t("notFoundBody")}</p>
          <Link href="/" className="join-link">
            {t("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="join-shell">
      <div className="join-main">
        <BrandHeader
          logoData={
            !program.showFidlifyBranding ? program.cardDesign.logoData : undefined
          }
          merchantName={program.merchant.name}
          showFidlify={program.showFidlifyBranding}
        />

        {recoverySent ? (
          <SuccessCard>
            <h2 className="join-h2">{t("recoveryTitle")}</h2>
            <p className="join-sub">{t("recoveryBody")}</p>
            <p className="join-fineprint">{t("recoveryHint")}</p>
          </SuccessCard>
        ) : success ? (
          <SuccessCard>
            <h2 className="join-h2">{t("successTitle")}</h2>
            <p className="join-sub">{t("successBody")}</p>

            <WalletActions
              walletUrl={walletUrl}
              googleWalletUrl={googleWalletUrl}
              appleLabel={t("appleWallet")}
              googleLabel={t("googleWallet")}
            />

            <p className="join-fineprint">{t("walletHint")}</p>
          </SuccessCard>
        ) : (
          <div className="join-card">
            <div className="join-eyebrow">
              <span className="join-dot" /> {program.merchant.name}
              {program.establishment && ` · ${program.establishment.name}`}
            </div>
            <h1 className="join-h1">{t("title")}</h1>
            <p className="join-sub">{t("subtitle")}</p>

            <form onSubmit={handleSubmit} className="join-form">
              {error && <div className="join-error">{error}</div>}

              <div className="join-field">
                <label htmlFor="firstName">{t("firstName")}</label>
                <input
                  id="firstName"
                  type="text"
                  placeholder={t("firstNamePlaceholder")}
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

              <div className="join-or">{t("or")}</div>

              <div className="join-field">
                <label htmlFor="phone">{t("phone")}</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+41 79 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="join-field">
                <label htmlFor="birthDate">
                  {t("birthDate")}{" "}
                  <span style={{ color: "#8a8e84", fontSize: 11 }}>
                    {t("birthDateHint")}
                  </span>
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  autoComplete="bday"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <button type="submit" className="join-submit" disabled={submitting}>
                {submitting ? t("submitting") : t("submit")}
                {!submitting && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0a0d04"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 5 7 7-7 7" />
                  </svg>
                )}
              </button>

              <p className="join-fineprint">{t("fineprint")}</p>
            </form>
          </div>
        )}
      </div>
      <footer className="join-footer">
        <Link href="/" className="join-brand-tiny">
          <LogoMark size={20} />
          <span>FIDLIFY</span>
        </Link>
        <span>{t("madeIn")}</span>
      </footer>
    </div>
  );
}

function SuccessCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="join-card join-success">
      <div className="join-check">
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
      {children}
    </div>
  );
}

function WalletActions({
  walletUrl,
  googleWalletUrl,
  appleLabel,
  googleLabel,
}: {
  walletUrl: string;
  googleWalletUrl: string;
  appleLabel: string;
  googleLabel: string;
}) {
  return (
    <div className="join-actions">
      {walletUrl && (
        <a href={walletUrl} className="join-btn-apple">
          <AppleIcon />
          {appleLabel}
        </a>
      )}
      {googleWalletUrl && (
        <a href={googleWalletUrl} className="join-btn-google">
          <GoogleIcon />
          {googleLabel}
        </a>
      )}
    </div>
  );
}

function BrandHeader({
  logoData,
  merchantName,
  showFidlify = true,
}: {
  logoData?: string;
  merchantName?: string;
  showFidlify?: boolean;
}) {
  return (
    <header className="join-brand-bar">
      {showFidlify || (!logoData && !merchantName) ? (
        <Link href="/" className="join-brand">
          <LogoMark size={32} />
          <span>FIDLIFY</span>
        </Link>
      ) : logoData ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoData}
          alt={merchantName ?? "Logo"}
          style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain" }}
        />
      ) : (
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "0.04em" }}>
          {merchantName}
        </span>
      )}
    </header>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.39c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 4zm-3.1-17.24c-2.22.22-4.03 2.46-3.79 4.5 2.04.16 4.09-2.16 3.79-4.5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
