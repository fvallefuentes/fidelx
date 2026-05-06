"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Store,
  CreditCard,
  Users,
  ScanLine,
  ArrowUpRight,
} from "lucide-react";
import { PLAN_LABELS } from "@/lib/plan-labels";

const ACCENT = "#d4ff4e";
const ACCENT_FILL = "rgba(212,255,78,0.15)";
const MUTED = "rgba(255,255,255,0.38)";
const BORDER = "rgba(255,255,255,0.08)";
const CARD_BG = "rgba(255,255,255,0.04)";
const TICK_COLOR = "#8a8e84";
const MONO = "var(--font-geist-mono, monospace)";
const VAL_COLOR = "rgba(255,255,255,0.92)";

interface StatsResponse {
  totalMerchants: number;
  totalPrograms: number;
  totalClients: number;
  totalScans: number;
  monthlyGrowth: { month: string; count: number }[];
  activity30: { date: string; count: number }[];
  topMerchants: { id: string; name: string; count: number }[];
  planDistribution: { name: string; value: number }[];
}

/* ─── KPI / Chart components reused from stats page pattern ──── */
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
            <span
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 12,
                lineHeight: 1.3,
              }}
            >
              {deltaLabel ?? sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

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
function fmtMonth(s: string) {
  return new Date(s + "-01").toLocaleDateString("fr-CH", {
    month: "short",
    year: "2-digit",
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

function ChartsGrid({
  cols = 2,
  children,
}: {
  cols?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
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
        marginTop: 4,
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

const PIE_COLORS = [
  "rgba(212,255,78,0.4)",
  ACCENT,
  "rgba(212,255,78,0.7)",
  "rgba(212,255,78,0.25)",
];

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Erreur de chargement");
        return r.json();
      })
      .then(setStats)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erreur inconnue")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Statistiques globales</h1>
        <p className="dx-page-sub">
          Toute la plateforme — <span style={{ color: ACCENT }}>Fidlify</span>
        </p>
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <div
          style={{
            background: "rgba(255,60,60,0.07)",
            border: "1px solid rgba(255,60,60,0.18)",
            borderRadius: 12,
            padding: "16px 20px",
            color: "rgba(255,120,120,0.9)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <SectionLabel>Vue générale</SectionLabel>
          <KpiGrid cols={4}>
            <KpiCard
              label="Total commerçants"
              value={stats.totalMerchants}
              icon={Store}
              sub="Comptes USER"
            />
            <KpiCard
              label="Total programmes"
              value={stats.totalPrograms}
              icon={CreditCard}
              sub="Programmes créés"
            />
            <KpiCard
              label="Total clients"
              value={stats.totalClients}
              icon={Users}
              sub="Détenteurs de cartes"
            />
            <KpiCard
              label="Total scans"
              value={stats.totalScans}
              icon={ScanLine}
              sub="Tampons + points + cashback"
            />
          </KpiGrid>

          <ChartsGrid cols={2}>
            <ChartCard title="Croissance commerçants — 6 derniers mois">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={stats.monthlyGrowth}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="aFillM6" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} {...axisProps} />
                  <YAxis {...axisProps} width={28} />
                  <Tooltip content={<DarkTooltip suffix="commerçant(s)" />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={ACCENT}
                    strokeWidth={2}
                    fill="url(#aFillM6)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: ACCENT,
                      stroke: "#0a0d04",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Distribution des plans">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.planDistribution.map((p) => ({
                      name: PLAN_LABELS[p.name] ?? p.name,
                      value: p.value,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {stats.planDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(16,18,12,0.97)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.55)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartsGrid>

          <ChartsGrid cols={1}>
            <ChartCard title="Activité globale — 30 derniers jours">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={stats.activity30}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="aFillAct30" x1="0" y1="0" x2="0" y2="1">
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
                  <Tooltip content={<DarkTooltip suffix="scan(s)" />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={ACCENT}
                    strokeWidth={2}
                    fill="url(#aFillAct30)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: ACCENT,
                      stroke: "#0a0d04",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartsGrid>

          <ChartsGrid cols={1}>
            <ChartCard title="Top 5 commerçants par scans">
              {stats.topMerchants.length === 0 ? (
                <p
                  style={{
                    color: MUTED,
                    fontSize: 13,
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  Aucune donnée pour le moment.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={stats.topMerchants}
                    layout="vertical"
                    margin={{ top: 6, right: 30, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.05)"
                      horizontal={false}
                    />
                    <XAxis type="number" {...axisProps} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      {...axisProps}
                      width={140}
                      tick={{
                        fill: "rgba(255,255,255,0.55)",
                        fontSize: 11,
                        fontFamily: MONO,
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(212,255,78,0.07)" }}
                      contentStyle={{
                        background: "rgba(16,18,12,0.97)",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Scans"
                      fill={ACCENT_FILL}
                      stroke={ACCENT}
                      strokeWidth={1}
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </ChartsGrid>
        </>
      )}
    </div>
  );
}
