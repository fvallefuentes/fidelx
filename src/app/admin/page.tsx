"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Store,
  UserPlus,
  CreditCard,
  TrendingUp,
  Users,
  Wallet,
  ScanLine,
  Gift,
  ArrowUpRight,
} from "lucide-react";

const ACCENT = "#d4ff4e";
const MUTED = "rgba(255,255,255,0.38)";
const BORDER = "rgba(255,255,255,0.08)";
const CARD_BG = "rgba(255,255,255,0.04)";
const TICK_COLOR = "#8a8e84";
const MONO = "var(--font-geist-mono, monospace)";
const VAL_COLOR = "rgba(255,255,255,0.92)";

interface DashboardData {
  totalMerchants: number;
  newMerchantsLast30: number;
  paidCount: number;
  mrr: number;
  planMap: Record<string, number>;
  totalClients: number;
  totalCards: number;
  scansLast30: number;
  scansLast7: number;
  rewardsLast30: number;
  inscriptions30: { date: string; count: number }[];
}

/* ─── KPI card ─────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  delta?: number;
  deltaLabel?: string;
}) {
  const footer = delta !== undefined || sub || deltaLabel;
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
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>

      {footer && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
          {delta !== undefined && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                background: "rgba(212,255,78,0.12)",
                border: "1px solid rgba(212,255,78,0.18)",
                borderRadius: 20,
                padding: "3px 8px 3px 6px",
                fontSize: 11,
                fontWeight: 600,
                color: ACCENT,
                letterSpacing: "0.01em",
                flexShrink: 0,
              }}
            >
              <ArrowUpRight size={11} strokeWidth={2.5} />
              +{delta}
            </span>
          )}
          {(deltaLabel ?? sub) && (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.3 }}>
              {deltaLabel ?? sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Chart card ────────────────────────────────────────────── */
function ChartCard({
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
          marginBottom: 18,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

/* ─── Tooltip ────────────────────────────────────────────────── */
interface TooltipPayload {
  payload?: { date?: string; month?: string; name?: string };
  value?: number;
  name?: string;
}
function DarkTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const dateKey = p.payload?.date || p.payload?.month || label;
  const displayDate = dateKey
    ? dateKey.length === 7
      ? new Date(dateKey + "-01").toLocaleDateString("fr-CH", {
          month: "long",
          year: "numeric",
        })
      : new Date(dateKey).toLocaleDateString("fr-CH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
    : "";
  return (
    <div
      style={{
        background: "rgba(16,18,12,0.97)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: VAL_COLOR,
      }}
    >
      {displayDate && <div style={{ marginBottom: 4, color: MUTED }}>{displayDate}</div>}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: ACCENT,
            }}
          />
          <strong style={{ color: ACCENT }}>{entry.value}</strong>
          {suffix && <span style={{ color: MUTED }}>{suffix}</span>}
        </div>
      ))}
    </div>
  );
}

const axisProps = {
  axisLine: false as const,
  tickLine: false as const,
  tick: { fill: TICK_COLOR, fontSize: 11, fontFamily: MONO },
};

function fmtShortDate(s: string) {
  return new Date(s).toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "short",
  });
}

function KpiGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 14,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: MUTED,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 14,
        marginTop: 14,
      }}
    >
      {children}
    </p>
  );
}

function Spinner() {
  return (
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
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Tableau de bord</h1>
        <p className="dx-page-sub">
          Vue d&apos;ensemble — <span style={{ color: ACCENT }}>Fidlify Admin</span>
        </p>
      </div>

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <SectionLabel>Comptes & Revenus</SectionLabel>
          <KpiGrid cols={4}>
            <KpiCard
              label="Total commerçants"
              value={data.totalMerchants}
              icon={Store}
              sub="Comptes USER actifs"
            />
            <KpiCard
              label="Nouveaux ce mois"
              value={data.newMerchantsLast30}
              icon={UserPlus}
              delta={data.newMerchantsLast30}
              deltaLabel="30 derniers jours"
            />
            <KpiCard
              label="Plans payants"
              value={data.paidCount}
              icon={CreditCard}
              sub="ESSENTIAL + GROWTH + MULTI_SITE"
            />
            <KpiCard
              label="MRR estimé"
              value={`${data.mrr} CHF`}
              icon={TrendingUp}
              sub="Revenu mensuel récurrent"
            />
          </KpiGrid>

          <SectionLabel>Activité globale</SectionLabel>
          <KpiGrid cols={4}>
            <KpiCard
              label="Total clients"
              value={data.totalClients}
              icon={Users}
              sub="Détenteurs de cartes"
            />
            <KpiCard
              label="Cartes wallet"
              value={data.totalCards}
              icon={Wallet}
              sub="LoyaltyCard total"
            />
            <KpiCard
              label="Scans (30j)"
              value={data.scansLast30}
              icon={ScanLine}
              delta={data.scansLast7}
              deltaLabel="7 derniers jours"
            />
            <KpiCard
              label="Récompenses (30j)"
              value={data.rewardsLast30}
              icon={Gift}
              sub="Réclamations enregistrées"
            />
          </KpiGrid>

          <ChartCard
            title="Inscriptions commerçants — 30 derniers jours"
            style={{ marginTop: 14 }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={data.inscriptions30}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="aFillAdmin30" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtShortDate}
                  {...axisProps}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis {...axisProps} width={28} />
                <Tooltip content={<DarkTooltip suffix="commerçant(s)" />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={ACCENT}
                  strokeWidth={2}
                  fill="url(#aFillAdmin30)"
                  dot={false}
                  activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}
