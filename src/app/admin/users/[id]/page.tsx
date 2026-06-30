"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Store,
  CreditCard,
  Wallet,
  ScanLine,
  ChevronLeft,
  Mail,
  Phone,
  Check,
  Activity,
  Shield,
  Briefcase,
  UserCog,
} from "lucide-react";
import { PLAN_LABELS } from "@/lib/plan-labels";
import { UserAdminActions } from "@/components/admin/UserAdminActions";

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Shield; color: string; bg: string; border: string }
> = {
  ADMIN: {
    label: "Admin",
    icon: Shield,
    color: "#ff9966",
    bg: "rgba(255,153,102,0.1)",
    border: "rgba(255,153,102,0.2)",
  },
  USER: {
    label: "Commerçant",
    icon: Briefcase,
    color: "#d4ff4e",
    bg: "rgba(212,255,78,0.1)",
    border: "rgba(212,255,78,0.18)",
  },
  STAFF: {
    label: "Staff",
    icon: UserCog,
    color: "#82d8ff",
    bg: "rgba(130,216,255,0.1)",
    border: "rgba(130,216,255,0.2)",
  },
};

const ACCENT = "#d4ff4e";
const MUTED = "rgba(255,255,255,0.38)";
const BORDER = "rgba(255,255,255,0.08)";
const CARD_BG = "rgba(255,255,255,0.04)";
const VAL_COLOR = "rgba(255,255,255,0.92)";

interface MerchantDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "ADMIN" | "USER" | "STAFF";
  plan: string;
  language: string;
  currency: string;
  createdAt: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodStart: string | null;
  stripeCurrentPeriodEnd: string | null;
  manualPlanUntil: string | null;
  manualPlanReason: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  employerMerchantId: string | null;
  employerMerchant: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  staff: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
  }[];
  establishments: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
  }[];
  programs: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    _count: { cards: number };
  }[];
  stats: {
    cardCount: number;
    scanCount: number;
    rewardCount: number;
  };
  recentTx: {
    id: string;
    type: string;
    createdAt: string;
    card: { serialNumber: string };
  }[];
}

const TX_LABELS: Record<string, string> = {
  STAMP: "Tampon",
  POINTS_EARN: "Points gagnés",
  POINTS_SPEND: "Points dépensés",
  REWARD_CLAIM: "Récompense",
  CASHBACK_EARN: "Cashback gagné",
  CASHBACK_SPEND: "Cashback dépensé",
  REFERRAL_BONUS: "Bonus parrainage",
};

/* ─── Mini KPI card (same pattern) ───────────────────────────── */
function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "18px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <p
          style={{
            color: MUTED,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            lineHeight: 1.35,
            flex: 1,
          }}
        >
          {label}
        </p>
        {Icon && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(212,255,78,0.1)",
              border: "1px solid rgba(212,255,78,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={15} color={ACCENT} strokeWidth={1.9} />
          </div>
        )}
      </div>
      <p
        style={{
          color: VAL_COLOR,
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{sub}</p>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "20px 24px",
        ...style,
      }}
    >
      <p
        style={{
          color: MUTED,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

export default function MerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState<string>("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  // Manual plan grant (partenariat)
  const [manualEnabled, setManualEnabled] = useState(false);
  const [manualPlan, setManualPlan] = useState<string>("ESSENTIAL");
  const [manualUntil, setManualUntil] = useState<string>(""); // YYYY-MM-DD
  const [manualReason, setManualReason] = useState<string>("");
  const [savingManual, setSavingManual] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/users/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Erreur de chargement");
        return r.json();
      })
      .then((d: MerchantDetail) => {
        setData(d);
        setPlanDraft(d.plan);
        if (d.manualPlanUntil) {
          setManualEnabled(true);
          setManualPlan(d.plan === "FREE" ? "ESSENTIAL" : d.plan);
          setManualUntil(new Date(d.manualPlanUntil).toISOString().slice(0, 10));
          setManualReason(d.manualPlanReason ?? "");
        }
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erreur inconnue")
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSavePlan() {
    if (!id || !data) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planDraft }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => (prev ? { ...prev, plan: updated.plan } : prev));
        setPlanSaved(true);
        setTimeout(() => setPlanSaved(false), 2000);
      }
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleSaveManualPlan() {
    if (!id || !data) return;
    setSavingManual(true);
    try {
      const body = manualEnabled
        ? {
            plan: manualPlan,
            manualPlanUntil: manualUntil,
            manualPlanReason: manualReason || null,
          }
        : {
            // Remove manual grant: revert to FREE + clear fields
            plan: "FREE",
            manualPlanUntil: null,
            manualPlanReason: null,
          };
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                plan: updated.plan,
                manualPlanUntil: updated.manualPlanUntil,
                manualPlanReason: updated.manualPlanReason,
              }
            : prev
        );
        setPlanDraft(updated.plan);
        setManualSaved(true);
        setTimeout(() => setManualSaved(false), 2000);
      }
    } finally {
      setSavingManual(false);
    }
  }

  async function handleStopManualPlan() {
    if (!id || !data) return;
    if (
      !confirm(
        "Arrêter le plan manuel maintenant ? Le commerçant repassera immédiatement au plan Gratuit."
      )
    )
      return;
    setSavingManual(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "FREE",
          manualPlanUntil: null,
          manualPlanReason: null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                plan: updated.plan,
                manualPlanUntil: updated.manualPlanUntil,
                manualPlanReason: updated.manualPlanReason,
              }
            : prev
        );
        setPlanDraft(updated.plan);
        setManualEnabled(false);
        setManualUntil("");
        setManualReason("");
        setManualSaved(true);
        setTimeout(() => setManualSaved(false), 2000);
      }
    } finally {
      setSavingManual(false);
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

  if (error || !data) {
    return (
      <div className="dx-page">
        <Link
          href="/admin/users"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: MUTED,
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          <ChevronLeft size={16} />
          Retour aux utilisateurs
        </Link>
        <div
          style={{
            background: "rgba(255,60,60,0.07)",
            border: "1px solid rgba(255,60,60,0.18)",
            borderRadius: 12,
            padding: "16px 20px",
            color: "rgba(255,120,120,0.9)",
            fontSize: 13,
            marginTop: 16,
          }}
        >
          {error ?? "Utilisateur introuvable"}
        </div>
      </div>
    );
  }

  return (
    <div className="dx-page">
      <Link
        href="/admin/users"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: MUTED,
          textDecoration: "none",
          fontSize: 13,
          marginBottom: -10,
        }}
      >
        <ChevronLeft size={16} />
        Retour aux utilisateurs
      </Link>

      <div className="dx-page-head">
        <h1 className="dx-page-title">{data.name || "—"}</h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
          {(() => {
            const meta = ROLE_META[data.role] ?? ROLE_META.USER;
            const Icon = meta.icon;
            return (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: meta.bg,
                  border: `1px solid ${meta.border}`,
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontSize: 11,
                  color: meta.color,
                  fontWeight: 600,
                }}
              >
                <Icon size={11} strokeWidth={2.4} />
                {meta.label}
              </span>
            );
          })()}
          {data.role === "USER" && (
            <span
              style={{
                background: "rgba(212,255,78,0.1)",
                border: "1px solid rgba(212,255,78,0.18)",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
                color: ACCENT,
                fontWeight: 600,
              }}
            >
              {PLAN_LABELS[data.plan] ?? data.plan}
            </span>
          )}
          {data.role === "STAFF" && data.employerMerchant && (
            <Link
              href={`/admin/users/${data.employerMerchant.id}`}
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.55)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Briefcase size={12} />
              Employé par{" "}
              <strong style={{ color: ACCENT }}>
                {data.employerMerchant.name || data.employerMerchant.email}
              </strong>
            </Link>
          )}
          <span style={{ color: MUTED, fontSize: 13 }}>
            Inscrit le{" "}
            {new Date(data.createdAt).toLocaleDateString("fr-CH", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: MUTED,
              fontSize: 13,
            }}
          >
            <Mail size={14} />
            {data.email}
          </span>
          {data.phone && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: MUTED,
                fontSize: 13,
              }}
            >
              <Phone size={14} />
              {data.phone}
            </span>
          )}
        </div>
      </div>

      {/* KPI grid — USER + STAFF (STAFF shows employer's stats) */}
      {(data.role === "USER" || data.role === "STAFF") && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <KpiCard
          label="Programmes"
          value={data.programs.length}
          icon={Store}
          sub={data.role === "STAFF" ? "Programmes employeur" : "Programmes créés"}
        />
        <KpiCard
          label="Clients"
          value={data.stats.cardCount}
          icon={CreditCard}
          sub="Cartes émises"
        />
        <KpiCard
          label="Cartes wallet"
          value={data.stats.cardCount}
          icon={Wallet}
          sub="Total LoyaltyCard"
        />
        <KpiCard
          label="Scans totaux"
          value={data.stats.scanCount}
          icon={ScanLine}
          sub="Tous types confondus"
        />
      </div>
      )}

      {/* Plan management + Stripe info — USER only */}
      {data.role === "USER" && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: data.stripeSubscriptionId
            ? "1fr 1fr"
            : "1fr",
          gap: 14,
        }}
      >
        <SectionCard title="Gestion du plan">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ color: VAL_COLOR, fontSize: 13 }}>
              Plan actuel :{" "}
              <strong style={{ color: ACCENT }}>
                {PLAN_LABELS[data.plan] ?? data.plan}
              </strong>
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(0,0,0,0.25)",
                  color: VAL_COLOR,
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              >
                <option value="FREE">Gratuit</option>
                <option value="ESSENTIAL">Essentiel</option>
                <option value="GROWTH">Croissance</option>
                <option value="MULTI_SITE">Multi-sites</option>
              </select>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={savingPlan || planDraft === data.plan}
                style={{
                  padding: "9px 16px",
                  borderRadius: 9,
                  background: ACCENT,
                  color: "#0a0d04",
                  border: 0,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor:
                    savingPlan || planDraft === data.plan
                      ? "not-allowed"
                      : "pointer",
                  opacity: savingPlan || planDraft === data.plan ? 0.5 : 1,
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {planSaved ? (
                  <>
                    <Check size={14} /> Enregistré
                  </>
                ) : savingPlan ? (
                  "Enregistrement..."
                ) : (
                  "Mettre à jour"
                )}
              </button>
            </div>
            <p style={{ color: MUTED, fontSize: 12 }}>
              Modifie directement le plan dans la base de données. Aucune
              charge Stripe n&apos;est déclenchée.
            </p>
          </div>
        </SectionCard>

        {data.stripeSubscriptionId && (
          <SectionCard title="Stripe">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <p
                  style={{
                    color: MUTED,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 2,
                  }}
                >
                  Customer ID
                </p>
                <p
                  style={{
                    color: VAL_COLOR,
                    fontSize: 12,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                >
                  {data.stripeCustomerId ?? "—"}
                </p>
              </div>
              <div>
                <p
                  style={{
                    color: MUTED,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 2,
                  }}
                >
                  Subscription ID
                </p>
                <p
                  style={{
                    color: VAL_COLOR,
                    fontSize: 12,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                >
                  {data.stripeSubscriptionId}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <p
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 2,
                    }}
                  >
                    Période début
                  </p>
                  <p style={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>
                    {data.stripeCurrentPeriodStart
                      ? new Date(
                          data.stripeCurrentPeriodStart
                        ).toLocaleDateString("fr-CH")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 2,
                    }}
                  >
                    Renouvellement
                  </p>
                  <p style={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>
                    {data.stripeCurrentPeriodEnd
                      ? new Date(
                          data.stripeCurrentPeriodEnd
                        ).toLocaleDateString("fr-CH")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
      )}

      {/* Plan manuel / Partenariat — USER only */}
      {data.role === "USER" && (
        <SectionCard title="Plan manuel / Partenariat">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.5 }}>
              Offrir un plan payant gratuitement (partenariat, beta, période
              d&apos;essai). Le plan revient automatiquement à{" "}
              <strong style={{ color: VAL_COLOR }}>Gratuit</strong> à la date
              indiquée, à la prochaine connexion du commerçant.
            </p>

            {data.manualPlanUntil && (
              <div
                style={{
                  background: "rgba(255,200,80,0.06)",
                  border: "1px solid rgba(255,200,80,0.2)",
                  borderRadius: 10,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: "#ffc850",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Activity size={14} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  Plan{" "}
                  <strong>{PLAN_LABELS[data.plan] ?? data.plan}</strong> offert
                  jusqu&apos;au{" "}
                  <strong>
                    {new Date(data.manualPlanUntil).toLocaleDateString(
                      "fr-CH",
                      { day: "2-digit", month: "long", year: "numeric" }
                    )}
                  </strong>
                  {data.manualPlanReason && (
                    <>
                      {" "}— <em>{data.manualPlanReason}</em>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleStopManualPlan}
                  disabled={savingManual}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "rgba(255,80,80,0.12)",
                    color: "#ff7a7a",
                    border: "1px solid rgba(255,80,80,0.25)",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: savingManual ? "not-allowed" : "pointer",
                    opacity: savingManual ? 0.5 : 1,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  Arrêter maintenant
                </button>
              </div>
            )}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: VAL_COLOR,
              }}
            >
              <input
                type="checkbox"
                checked={manualEnabled}
                onChange={(e) => setManualEnabled(e.target.checked)}
                style={{ accentColor: ACCENT, width: 16, height: 16 }}
              />
              Activer un plan manuel
            </label>

            {manualEnabled && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 5,
                    }}
                  >
                    Plan
                  </label>
                  <select
                    value={manualPlan}
                    onChange={(e) => setManualPlan(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: `1px solid ${BORDER}`,
                      background: "rgba(0,0,0,0.25)",
                      color: VAL_COLOR,
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  >
                    <option value="ESSENTIAL">Essentiel</option>
                    <option value="GROWTH">Croissance</option>
                    <option value="MULTI_SITE">Multi-sites</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 5,
                    }}
                  >
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={manualUntil}
                    onChange={(e) => setManualUntil(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: `1px solid ${BORDER}`,
                      background: "rgba(0,0,0,0.25)",
                      color: VAL_COLOR,
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 5,
                    }}
                  >
                    Raison (optionnel)
                  </label>
                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="Partenariat 2026, Beta, Compensation, etc."
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: `1px solid ${BORDER}`,
                      background: "rgba(0,0,0,0.25)",
                      color: VAL_COLOR,
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleSaveManualPlan}
                disabled={
                  savingManual ||
                  (manualEnabled && (!manualPlan || !manualUntil))
                }
                style={{
                  padding: "9px 16px",
                  borderRadius: 9,
                  background: ACCENT,
                  color: "#0a0d04",
                  border: 0,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor:
                    savingManual ||
                    (manualEnabled && (!manualPlan || !manualUntil))
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    savingManual ||
                    (manualEnabled && (!manualPlan || !manualUntil))
                      ? 0.5
                      : 1,
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {manualSaved ? (
                  <>
                    <Check size={14} /> Enregistré
                  </>
                ) : savingManual ? (
                  "Enregistrement..."
                ) : manualEnabled ? (
                  "Activer le plan manuel"
                ) : (
                  "Retirer le plan manuel"
                )}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Staff list — only for USER (commerçant), shows their employees */}
      {data.role === "USER" && data.staff && data.staff.length > 0 && (
        <SectionCard title="Équipe / Staff">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Nom", "Email", "Ajouté le"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      color: MUTED,
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom:
                      i < data.staff.length - 1
                        ? `1px solid rgba(255,255,255,0.06)`
                        : undefined,
                  }}
                >
                  <td style={{ padding: "10px 12px", color: VAL_COLOR }}>
                    {s.name || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.55)" }}>
                    {s.email}
                  </td>
                  <td style={{ padding: "10px 12px", color: MUTED, fontSize: 12 }}>
                    {new Date(s.createdAt).toLocaleDateString("fr-CH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* Establishments — USER only */}
      {data.role === "USER" && (
      <SectionCard title="Établissements">
        {data.establishments.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 13 }}>Aucun établissement.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Nom", "Adresse", "Téléphone"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 0",
                      textAlign: "left",
                      color: MUTED,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.establishments.map((e, i) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom:
                      i < data.establishments.length - 1
                        ? `1px solid rgba(255,255,255,0.05)`
                        : undefined,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 0",
                      color: VAL_COLOR,
                      fontWeight: 500,
                    }}
                  >
                    {e.name}
                  </td>
                  <td
                    style={{ padding: "12px 0", color: "rgba(255,255,255,0.55)" }}
                  >
                    {e.address || "—"}
                  </td>
                  <td
                    style={{ padding: "12px 0", color: "rgba(255,255,255,0.55)" }}
                  >
                    {e.phone || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
      )}

      {/* Programs — USER only */}
      {data.role === "USER" && (
      <SectionCard title="Programmes">
        {data.programs.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 13 }}>Aucun programme.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Nom", "Type", "Cartes", "Statut", "Créé le"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 0",
                      textAlign: "left",
                      color: MUTED,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.programs.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom:
                      i < data.programs.length - 1
                        ? `1px solid rgba(255,255,255,0.05)`
                        : undefined,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 0",
                      color: VAL_COLOR,
                      fontWeight: 500,
                    }}
                  >
                    {p.name}
                  </td>
                  <td
                    style={{ padding: "12px 0", color: "rgba(255,255,255,0.55)" }}
                  >
                    {p.type}
                  </td>
                  <td
                    style={{ padding: "12px 0", color: ACCENT, fontWeight: 600 }}
                  >
                    {p._count.cards}
                  </td>
                  <td style={{ padding: "12px 0" }}>
                    <span
                      style={{
                        background: p.isActive
                          ? "rgba(212,255,78,0.1)"
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${
                          p.isActive
                            ? "rgba(212,255,78,0.18)"
                            : "rgba(255,255,255,0.12)"
                        }`,
                        borderRadius: 20,
                        padding: "2px 9px",
                        fontSize: 11,
                        color: p.isActive ? ACCENT : MUTED,
                        fontWeight: 600,
                      }}
                    >
                      {p.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 0",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 12,
                    }}
                  >
                    {new Date(p.createdAt).toLocaleDateString("fr-CH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
      )}

      {/* Recent activity — USER + STAFF (STAFF sees employer's activity) */}
      {(data.role === "USER" || data.role === "STAFF") && (
      <SectionCard title="Activité récente">
        {data.recentTx.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "12px 0",
            }}
          >
            <Activity size={28} color={MUTED} strokeWidth={1.5} />
            <p style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>
              Aucune transaction récente.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Date", "Type", "Carte"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 0",
                      textAlign: "left",
                      color: MUTED,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentTx.map((t, i) => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom:
                      i < data.recentTx.length - 1
                        ? `1px solid rgba(255,255,255,0.05)`
                        : undefined,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 0",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 12,
                    }}
                  >
                    {new Date(t.createdAt).toLocaleString("fr-CH", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px 0",
                      color: VAL_COLOR,
                      fontWeight: 500,
                    }}
                  >
                    {TX_LABELS[t.type] ?? t.type}
                  </td>
                  <td
                    style={{
                      padding: "12px 0",
                      color: "rgba(255,255,255,0.45)",
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: 12,
                    }}
                  >
                    {t.card.serialNumber}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
      )}

      {/* Panneau d'actions admin (suspend, reset password, logs) */}
      <UserAdminActions
        userId={data.id}
        email={data.email}
        role={data.role}
        suspendedAt={data.suspendedAt}
        suspendedReason={data.suspendedReason}
        onUpdated={() => {
          fetch(`/api/admin/users/${id}`)
            .then((r) => r.json())
            .then((d: MerchantDetail) => setData(d))
            .catch(() => {});
        }}
      />
    </div>
  );
}
