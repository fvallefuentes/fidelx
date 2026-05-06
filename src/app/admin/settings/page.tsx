"use client";

import { useEffect, useState } from "react";
import { Globe, CreditCard, Check } from "lucide-react";
import { PLAN_LABELS } from "@/lib/plan-labels";

const ACCENT = "#d4ff4e";
const MUTED = "rgba(255,255,255,0.38)";
const BORDER = "rgba(255,255,255,0.08)";
const CARD_BG = "rgba(255,255,255,0.04)";
const VAL_COLOR = "rgba(255,255,255,0.92)";

interface AdminSettingsData {
  name: string;
  email: string;
  phone: string;
  language: string;
  currency: string;
  plan: string;
  createdAt: string;
}

const PRICING: { plan: string; price: number }[] = [
  { plan: "ESSENTIAL", price: 39 },
  { plan: "GROWTH", price: 89 },
  { plan: "MULTI_SITE", price: 199 },
];

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {Icon && <Icon size={16} color={MUTED} strokeWidth={1.8} />}
        <p
          style={{
            color: MUTED,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          color: MUTED,
          fontSize: 12,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 9,
  border: `1px solid ${BORDER}`,
  background: "rgba(0,0,0,0.25)",
  color: VAL_COLOR,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
};

export default function AdminSettingsPage() {
  const [data, setData] = useState<AdminSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/merchants/settings")
      .then((r) => r.json())
      .then((d) => {
        setData({
          name: d.name ?? "",
          email: d.email ?? "",
          phone: d.phone ?? "",
          language: d.language ?? "fr",
          currency: d.currency ?? "CHF",
          plan: d.plan ?? "FREE",
          createdAt: d.createdAt ?? new Date().toISOString(),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      await fetch("/api/merchants/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          language: data.language,
          currency: data.currency,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="dx-page">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 320,
          }}
        >
          <div className="dx-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Paramètres</h1>
        <p className="dx-page-sub">
          Compte administrateur — <span style={{ color: ACCENT }}>Fidlify</span>
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        {/* Profile */}
        <SectionCard title="Profil" icon={Globe}>
          <form
            onSubmit={handleSave}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <Field label="Nom">
              <input
                value={data?.name ?? ""}
                onChange={(e) =>
                  setData((d) => (d ? { ...d, name: e.target.value } : d))
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Email">
              <input value={data?.email ?? ""} disabled style={{ ...inputStyle, opacity: 0.6 }} />
              <p style={{ color: MUTED, fontSize: 11 }}>
                L&apos;email ne peut pas être modifié.
              </p>
            </Field>
            <Field label="Téléphone">
              <input
                value={data?.phone ?? ""}
                onChange={(e) =>
                  setData((d) => (d ? { ...d, phone: e.target.value } : d))
                }
                placeholder="+41 79 123 45 67"
                style={inputStyle}
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Langue">
                <select
                  value={data?.language ?? "fr"}
                  onChange={(e) =>
                    setData((d) =>
                      d ? { ...d, language: e.target.value } : d
                    )
                  }
                  style={inputStyle}
                >
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="Devise">
                <select
                  value={data?.currency ?? "CHF"}
                  onChange={(e) =>
                    setData((d) =>
                      d ? { ...d, currency: e.target.value } : d
                    )
                  }
                  style={inputStyle}
                >
                  <option value="CHF">CHF</option>
                  <option value="EUR">EUR</option>
                </select>
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                alignSelf: "flex-start",
                marginTop: 4,
                padding: "10px 18px",
                borderRadius: 9,
                background: ACCENT,
                color: "#0a0d04",
                border: 0,
                fontWeight: 600,
                fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saved ? (
                <>
                  <Check size={14} /> Enregistré
                </>
              ) : saving ? (
                "Enregistrement..."
              ) : (
                "Enregistrer"
              )}
            </button>
          </form>
        </SectionCard>

        {/* Tarifs */}
        <SectionCard title="Tarifs" icon={CreditCard}>
          <p
            style={{
              color: VAL_COLOR,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            Prix utilisés pour le calcul du <strong>MRR</strong> (Revenu mensuel récurrent).
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PRICING.map((p) => (
              <div
                key={p.plan}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "rgba(212,255,78,0.04)",
                  border: "1px solid rgba(212,255,78,0.12)",
                  borderRadius: 10,
                }}
              >
                <span style={{ color: VAL_COLOR, fontSize: 13, fontWeight: 500 }}>
                  {PLAN_LABELS[p.plan] ?? p.plan}
                </span>
                <span
                  style={{
                    color: ACCENT,
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                >
                  {p.price} CHF / mois
                </span>
              </div>
            ))}
          </div>
          <p style={{ color: MUTED, fontSize: 11, marginTop: 14 }}>
            Le plan <strong>Gratuit</strong> n&apos;entre pas dans le calcul du MRR.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
