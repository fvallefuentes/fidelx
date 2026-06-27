"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  Users,
  CreditCard,
  ScanLine,
  Gift,
  TrendingUp,
  UserPlus,
  Smartphone,
  Activity,
  CheckCircle2,
  Zap,
  UserMinus,
  Bell,
  MailOpen,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import type { FullStatsResponse } from "@/app/api/merchants/stats/full/route";
import { StatsInsights } from "@/components/dashboard/StatsInsights";

const ACCENT      = "#b7f238";
const ACCENT_FILL = "rgba(183,242,56,0.18)";
const BORDER      = "var(--line)";
const TICK_COLOR  = "#8a8e84";
const MONO        = "var(--font-geist-mono, monospace)";

const PLAN_ORDER: Record<string, number> = {
  FREE: 0, ESSENTIAL: 1, GROWTH: 2, MULTI_SITE: 3,
};
const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratuit", ESSENTIAL: "Essentiel", GROWTH: "Croissance", MULTI_SITE: "Multi-sites",
};

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
    <div className="dx-stat-card">
      <div className="dx-stat-top">
        <span className="dx-stat-label">{label}</span>
        {Icon && (
          <div className="dx-stat-icon">
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          </div>
        )}
      </div>

      <div className="dx-stat-value">{value}</div>

      {footer && (
        <div className="dx-stat-foot">
          {delta !== undefined && (
            <span className="dx-trend up">
              <ArrowUpRight size={11} strokeWidth={2.5} />
              +{delta}
            </span>
          )}
          {(deltaLabel ?? sub) && (
            <span className="dx-stat-sub">
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
      className="dx-chart-card"
      style={{
        ...style,
      }}
    >
      <div className="dx-chart-head">
        <div className="dx-chart-eyebrow">{title}</div>
      </div>
      {children}
    </div>
  );
}

/* ─── Shared tooltip ────────────────────────────────────────── */
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
      ? new Date(dateKey + "-01").toLocaleDateString("fr-CH", { month: "long", year: "numeric" })
      : new Date(dateKey).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  return (
    <div className="dx-tt">
      {displayDate && <div className="dx-tt-date">{displayDate}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="dx-tt-row">
          <span className="dx-tt-dot" />
          <strong>{entry.value}</strong>
          {suffix && <span>{suffix}</span>}
          {entry.name && !suffix && <span>{entry.name}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Axis props ─────────────────────────────────────────────── */
const axisProps = {
  axisLine: false as const,
  tickLine: false as const,
  tick: { fill: TICK_COLOR, fontSize: 11, fontFamily: MONO },
};

function fmtShortDate(s: string) {
  return new Date(s).toLocaleDateString("fr-CH", { day: "2-digit", month: "short" });
}
function fmtMonth(s: string) {
  return new Date(s + "-01").toLocaleDateString("fr-CH", { month: "short", year: "2-digit" });
}

/* ─── KPI grid ───────────────────────────────────────────────── */
function KpiGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`dx-stats-grid stats-kpi-grid stats-kpi-grid-${cols}`}>
      {children}
    </div>
  );
}

/* ─── Charts grid ────────────────────────────────────────────── */
function ChartsGrid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div className={`dx-charts-row stats-charts-grid stats-charts-grid-${cols}`}>
      {children}
    </div>
  );
}

/* ─── Section label ──────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="dx-chart-eyebrow stats-section-label">
      {children}
    </p>
  );
}

/* ─── Upgrade banner ─────────────────────────────────────────── */
function UpgradeBanner({ currentPlan }: { currentPlan: string }) {
  const upgrades: Record<string, { next: string; features: string[] }> = {
    FREE: {
      next: "Essentiel",
      features: [
        "Nouvelles inscriptions & taux Wallet",
        "Graphiques : scans, inscriptions, récompenses sur 30 jours",
        "Clients proches de la récompense",
      ],
    },
    ESSENTIAL: {
      next: "Croissance",
      features: [
        "Clients actifs vs inactifs (segmentation)",
        "Performance des campagnes",
        "Distribution de progression & évolution mensuelle",
        "Temps moyen vers récompense",
      ],
    },
  };
  const info = upgrades[currentPlan];
  if (!info) return null;
  return (
    <div className="stats-upgrade-card">
      <p className="stats-upgrade-title">
        Passez au plan {info.next} pour débloquer :
      </p>
      <ul className="stats-upgrade-list">
        {info.features.map((f) => (
          <li key={f}>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Spinner ────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="dx-loading-inline">
      <div className="dx-spinner" />
    </div>
  );
}

/* ═══ Plan sections ══════════════════════════════════════════ */

function FreeSection({ stats }: { stats: FullStatsResponse }) {
  const scansLast7 = stats.activityLast7.reduce((s, d) => s + d.count, 0);
  return (
    <>
      <SectionLabel>Vue générale</SectionLabel>
      <KpiGrid cols={4}>
        <KpiCard
          label="Clients inscrits"
          value={stats.totalClients}
          icon={Users}
          sub="Total cumulé"
        />
        <KpiCard
          label="Cartes actives"
          value={stats.activeCards}
          icon={CreditCard}
          sub={`Sur ${stats.totalClients} carte${stats.totalClients !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Scans réalisés"
          value={stats.totalStamps}
          icon={ScanLine}
          delta={scansLast7}
          deltaLabel="7 derniers jours"
        />
        <KpiCard
          label="Récompenses débloquées"
          value={stats.rewardsClaimed}
          icon={Gift}
          sub="Total depuis le début"
        />
      </KpiGrid>

      <ChartCard title="Activité — 7 derniers jours" style={{ marginBottom: 28 }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={stats.activityLast7} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="aFill7" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgb(var(--ovr) / 0.05)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtShortDate} {...axisProps} />
            <YAxis {...axisProps} width={28} />
            <Tooltip content={<DarkTooltip suffix="scan(s)" />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={ACCENT}
              strokeWidth={2}
              fill="url(#aFill7)"
              dot={false}
              activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

function EssentialSection({ stats }: { stats: FullStatsResponse }) {
  return (
    <>
      <SectionLabel>Activité — 30 derniers jours</SectionLabel>
      <KpiGrid cols={4}>
        <KpiCard
          label="Nouvelles inscriptions"
          value={stats.newClientsLast30 ?? 0}
          icon={UserPlus}
          delta={stats.newClientsLast30 ?? 0}
          deltaLabel="Ce mois"
        />
        <KpiCard
          label="Taux ajout Wallet"
          value={stats.walletInstallRate !== null ? `${stats.walletInstallRate}%` : "—"}
          icon={Smartphone}
          sub="Cartes avec pass installé"
        />
        <KpiCard
          label="Clients actifs (30j)"
          value={stats.activeClientsLast30 ?? 0}
          icon={Activity}
          sub="Au moins 1 scan ce mois"
        />
        <KpiCard
          label="Scans / client"
          value={stats.scansPerClient !== null ? stats.scansPerClient : "—"}
          icon={ScanLine}
          sub="Moyenne par client"
        />
        <KpiCard
          label="Récompenses débloquées"
          value={stats.rewardsClaimed}
          icon={Gift}
          sub="Total cumulé"
        />
        <KpiCard
          label="Récompenses utilisées"
          value={stats.rewardsRedeemed ?? 0}
          icon={CheckCircle2}
          sub="Statut REDEEMED"
        />
        <KpiCard
          label="Proches d'une récompense"
          value={stats.nearRewardCount ?? 0}
          icon={Zap}
          sub="≥ 80 % de progression"
        />
        <KpiCard
          label="Progression moyenne"
          value={stats.avgProgressionPct !== null ? `${stats.avgProgressionPct}%` : "—"}
          icon={TrendingUp}
          sub="Cartes à tampons"
        />
      </KpiGrid>

      <ChartsGrid cols={2}>
        <ChartCard title="Inscriptions — 30 jours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.inscriptionsLast30 ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aFillInsc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(var(--ovr) / 0.05)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtShortDate} {...axisProps} interval="preserveStartEnd" minTickGap={40} />
              <YAxis {...axisProps} width={28} />
              <Tooltip content={<DarkTooltip suffix="inscription(s)" />} />
              <Area type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} fill="url(#aFillInsc)" dot={false}
                activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Scans — 30 jours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.scansLast30 ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aFillScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(var(--ovr) / 0.05)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtShortDate} {...axisProps} interval="preserveStartEnd" minTickGap={40} />
              <YAxis {...axisProps} width={28} />
              <Tooltip content={<DarkTooltip suffix="scan(s)" />} />
              <Area type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} fill="url(#aFillScans)" dot={false}
                activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Récompenses débloquées — 30 jours" style={{ gridColumn: "1 / -1" }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.rewardsLast30 ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--ovr) / 0.05)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtShortDate} {...axisProps} interval="preserveStartEnd" minTickGap={40} />
              <YAxis {...axisProps} width={28} />
              <Tooltip content={<DarkTooltip suffix="récompense(s)" />} cursor={{ fill: "rgba(212,255,78,0.07)" }} />
              <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartsGrid>
    </>
  );
}

function GrowthSection({ stats }: { stats: FullStatsResponse }) {
  const PIE_COLORS = [ACCENT, "rgba(212,255,78,0.25)"];
  return (
    <>
      <SectionLabel>Engagement & Campagnes</SectionLabel>
      <KpiGrid cols={3}>
        <KpiCard
          label="Clients actifs (30j)"
          value={stats.activeClientsLast30 ?? 0}
          icon={Activity}
          sub="Au moins 1 scan ce mois"
        />
        <KpiCard
          label="Clients inactifs"
          value={stats.inactiveClients ?? 0}
          icon={UserMinus}
          sub="Aucun scan depuis 60j"
        />
        <KpiCard
          label="Campagnes envoyées"
          value={stats.campaignsSent ?? 0}
          icon={Bell}
          sub="Total cumulé"
        />
        <KpiCard
          label="Taux de livraison"
          value={stats.openRate !== null ? `${stats.openRate}%` : "—"}
          icon={MailOpen}
          sub={`${stats.notifDelivered ?? 0} / ${stats.notifTotal ?? 0} livrées`}
        />
        <KpiCard
          label="Temps moyen récompense"
          value={stats.avgDaysToReward !== null ? `${stats.avgDaysToReward}j` : "—"}
          icon={Clock}
          sub="Depuis inscription"
        />
        <KpiCard
          label="Récompenses utilisées"
          value={stats.rewardsRedeemed ?? 0}
          icon={CheckCircle2}
          sub="Statut REDEEMED"
        />
      </KpiGrid>

      <ChartsGrid cols={2}>
        <ChartCard title="Actifs vs Inactifs (30j)">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.activeVsInactiveLast30 ?? []}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                paddingAngle={3}
              >
                {(stats.activeVsInactiveLast30 ?? []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(16,18,12,0.97)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "rgb(var(--ovr) / 0.55)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Performance campagnes (Top 5)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.campaignPerformance ?? []}
              layout="vertical"
              margin={{ top: 6, right: 30, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke="rgb(var(--ovr) / 0.05)" horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis dataKey="name" type="category" {...axisProps} width={80}
                tick={{ fill: "rgb(var(--ovr) / 0.55)", fontSize: 10, fontFamily: MONO }} />
              <Tooltip cursor={{ fill: "rgba(212,255,78,0.07)" }}
                contentStyle={{ background: "rgba(16,18,12,0.97)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sentCount" name="Envoyés" fill={ACCENT_FILL} radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar dataKey="deliveredCount" name="Livrés" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribution progression clients">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.clientProgressionDist ?? []}
              layout="vertical"
              margin={{ top: 6, right: 30, left: 16, bottom: 0 }}
            >
              <CartesianGrid stroke="rgb(var(--ovr) / 0.05)" horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis dataKey="range" type="category" {...axisProps} width={68}
                tick={{ fill: "rgb(var(--ovr) / 0.55)", fontSize: 11, fontFamily: MONO }} />
              <Tooltip content={<DarkTooltip suffix="carte(s)" />} cursor={{ fill: "rgba(212,255,78,0.07)" }} />
              <Bar dataKey="count" fill={ACCENT} radius={[0, 6, 6, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution mensuelle (6 mois)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.monthlyGrowth ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aFillMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(var(--ovr) / 0.05)" vertical={false} />
              <XAxis dataKey="month" tickFormatter={fmtMonth} {...axisProps} />
              <YAxis {...axisProps} width={28} />
              <Tooltip content={<DarkTooltip suffix="client(s)" />} />
              <Area type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} fill="url(#aFillMonthly)"
                dot={false} activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartsGrid>
    </>
  );
}

function MultiSiteSection({ stats }: { stats: FullStatsResponse }) {
  const ests = stats.establishments ?? [];
  return (
    <>
      <SectionLabel>Comparatif par établissement</SectionLabel>
      <div className="stats-table-card">
        <table className="stats-table">
          <thead>
            <tr>
              {["Établissement", "Clients", "Scans", "Récompenses"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ests.length === 0 ? (
              <tr>
                <td colSpan={4} className="stats-table-empty">
                  Aucun établissement configuré
                </td>
              </tr>
            ) : (
              ests.map((e, i) => (
                <tr key={e.id} className={i < ests.length - 1 ? "with-border" : undefined}>
                  <td>{e.name}</td>
                  <td className="stats-table-value">{e.clientCount}</td>
                  <td className="stats-table-value">{e.scanCount}</td>
                  <td className="stats-table-value">{e.rewardCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function StatsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<FullStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/merchants/stats/full")
      .then((res) => {
        if (!res.ok) throw new Error("Erreur lors du chargement des statistiques");
        return res.json() as Promise<FullStatsResponse>;
      })
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, []);

  const plan = stats?.plan ?? session?.user?.plan ?? "FREE";
  const planLevel = PLAN_ORDER[plan] ?? 0;

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Statistiques</h1>
        <p className="dx-page-sub">
          Analyse détaillée —{" "}
          <span className="stats-plan-accent">{PLAN_LABELS[plan] ?? plan}</span>
        </p>
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <div className="stats-error">{error}</div>
      )}

      {!loading && !error && stats && (
        <>
          <FreeSection stats={stats} />

          {/* Insights avancés : delta période + heatmap + cohorts. */}
          <div className="stats-insights-wrap">
            <StatsInsights isFree={plan === "FREE"} />
          </div>

          {planLevel >= PLAN_ORDER.ESSENTIAL && <EssentialSection stats={stats} />}
          {planLevel >= PLAN_ORDER.GROWTH && <GrowthSection stats={stats} />}
          {planLevel >= PLAN_ORDER.MULTI_SITE && <MultiSiteSection stats={stats} />}
          {planLevel < PLAN_ORDER.MULTI_SITE && <UpgradeBanner currentPlan={plan} />}
        </>
      )}
    </div>
  );
}
