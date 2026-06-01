"use client";

import { useState } from "react";

type Program = {
  id: string;
  name: string;
  type: string;
  rewardLabel: string;
};

type CardResult = {
  programId: string;
  programName: string;
  serialNumber: string;
  walletUrl: string;
  googleWalletUrl: string | null;
  alreadyExisted: boolean;
};

export default function JoinAllForm({
  merchantId,
  merchantName,
  programs,
}: {
  merchantId: string;
  merchantName: string;
  programs: Program[];
}) {
  // Tous les programmes cochés par défaut
  const [selected, setSelected] = useState<Set<string>>(
    new Set(programs.map((p) => p.id))
  );
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<CardResult[] | null>(null);
  const [clientFirstName, setClientFirstName] = useState("");

  function toggleProgram(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selected.size === 0) {
      setError("Sélectionnez au moins une carte de fidélité.");
      return;
    }
    if (!email && !phone) {
      setError("Email ou téléphone requis.");
      return;
    }
    if (!firstName.trim()) {
      setError("Prénom requis.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/merchants/${merchantId}/join-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          email,
          phone,
          birthDate,
          programIds: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'inscription.");
      } else {
        setResults(data.cards);
        setClientFirstName(data.clientFirstName);
      }
    } catch {
      setError("Erreur réseau, réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Page de confirmation après création ───
  if (results) {
    const createdCount = results.filter((r) => !r.alreadyExisted).length;
    return (
      <>
        <h1 className="join-h1">
          {createdCount > 0
            ? `Bienvenue ${clientFirstName} 🎉`
            : "Vos cartes sont prêtes ✓"}
        </h1>
        <p className="join-sub">
          {createdCount > 0
            ? `Vous avez rejoint ${createdCount} carte${createdCount > 1 ? "s" : ""} de fidélité chez ${merchantName}. Ajoutez-les à votre Wallet pour ne pas les perdre :`
            : `Vous étiez déjà inscrit à ces cartes. Voici les liens pour les réinstaller :`}
        </p>

        <div className="join-all-cards">
          {results.map((r) => (
            <div key={r.programId} className="join-all-card-row">
              <div className="join-all-card-name">
                {r.programName}
                {r.alreadyExisted && (
                  <span className="join-all-existing"> · déjà inscrit</span>
                )}
              </div>
              <div className="join-actions" style={{ marginTop: 8 }}>
                <a href={r.walletUrl} className="join-btn-apple">
                  <AppleIcon /> Apple Wallet
                </a>
                {r.googleWalletUrl && (
                  <a
                    href={r.googleWalletUrl}
                    className="join-btn-google"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GoogleIcon /> Google Wallet
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="join-fineprint">
          Apple Wallet pour iPhone, Google Wallet pour Android. Aucune
          application à installer.
        </p>
      </>
    );
  }

  // ─── Formulaire ───
  return (
    <>
      <h1 className="join-h1">Inscrivez-vous gratuitement</h1>
      <p className="join-sub">
        Choisissez les cartes que vous souhaitez rejoindre chez{" "}
        <strong>{merchantName}</strong> :
      </p>

      <form onSubmit={handleSubmit} className="join-form">
        {/* Sélection des programmes */}
        <div className="join-all-programs">
          {programs.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <label
                key={p.id}
                className={`join-all-prog${isSelected ? " checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleProgram(p.id)}
                />
                <span className="join-all-prog-info">
                  <span className="join-all-prog-name">{p.name}</span>
                  <span className="join-all-prog-reward">{p.rewardLabel}</span>
                </span>
              </label>
            );
          })}
        </div>

        {/* Form fields */}
        <div className="join-field">
          <label htmlFor="firstName">Prénom *</label>
          <input
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            maxLength={50}
          />
        </div>

        <div className="join-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="vous@email.com"
            maxLength={200}
          />
        </div>

        <div className="join-field">
          <label htmlFor="phone">Téléphone</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+41 79 123 45 67"
            maxLength={40}
          />
        </div>

        <p style={{ fontSize: 12, color: "var(--ink-4)", marginTop: -8 }}>
          Email ou téléphone, au moins l&apos;un des deux.
        </p>

        <div className="join-field">
          <label htmlFor="birthDate">
            Date de naissance <span style={{ opacity: 0.6 }}>(facultatif)</span>
          </label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
            Pour recevoir une surprise le jour de votre anniversaire 🎂
          </p>
        </div>

        {error && <div className="join-error">{error}</div>}

        <button type="submit" className="join-submit" disabled={submitting || selected.size === 0}>
          {submitting
            ? "Inscription…"
            : selected.size === 0
              ? "Sélectionnez au moins une carte"
              : selected.size === 1
                ? "S'inscrire à 1 carte"
                : `S'inscrire à ${selected.size} cartes`}
        </button>
      </form>
    </>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.39c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 4zm-3.1-17.24c-2.22.22-4.03 2.46-3.79 4.5 2.04.16 4.09-2.16 3.79-4.5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
