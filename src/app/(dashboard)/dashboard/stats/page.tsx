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
import type { FullStatsResponse } from "@/app/api/merchants/stats/full/route";

const ACCENT = "#d4ff4e";
const ACCENT_FILL = "rgba(212,255,78,0.15)";
const MUTED = "rgba(255,255,255,0.4)";
const BORDER = "rgba(255,255,255,0.08)";
const CARD_BG = "rgba(255,255,255,0.04)";
const TICK_COLOR = "#8a8e84";
const MONO = "var(--font-geist-mono, monospace)";

const PLAN_ORDER: Record<string, number> = {
  FREE: 0,
  ESSENTIAL: 1,
  GROWTH: 2,
  MULTI_SITE: 3,
};
const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratuit",
  ESSENTIAL: "Essentiel",
  GROWTH: "Croissance",
  MULTI_SITE: "Multi-sites",
};

/* ─── KPI card ─────────────────────────────────────────────── */
function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <p
        style={{
          color: MUTED,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p style={{ color: ACCENT, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</p>
      {sub && (
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 6 }}>{sub}</p>
      )}
    </div>
  );
}

/* ─── Chart card wrapper ────────────────────────────────────── */
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
        borderRadius: 12,
        padding: "20px 24px",
        ...style,
      }}
    >
      <p
        style={{
          color: MUTED,
          fontSize: 12,
          letterSpacing: "0.08em",
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
    <div
      style={{
        background: "rgba(20,22,16,0.95)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
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
          {suffix && <span>{suffix}</span>}
          {entry.name && !suffix && <span style={{ color: MUTED }}>{entry.name}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Common chart axis props ────────────────────────────────── */
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

/* ─── KPI grid wrapper ──────────────────────────────────────── */
function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16,
        marginBottom: 32,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Charts grid ────────────────────────────────────────────── */
function ChartsGrid({ cols, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols ?? 2}, 1fr)`,
        gap: 16,
        marginBottom: 32,
      }}
    >
      {children}
    </div>
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
    <div
      style={{
        background: "rgba(212,255,78,0.06)",
        border: `1px solid rgba(212,255,78,0.2)`,
        borderRadius: 12,
        padding: "20px 24px",
        marginTop: 8,
      }}
    >
      <p
        style={{
          color: ACCENT,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Passez au plan {info.next} pour debloquer :
      </p>
      <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
        {info.features.map((f) => (
          <li
            key={f}
            style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 4 }}
          >
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Loading spinner ────────────────────────────────────────── */
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

/* ─── Plan sections ─────────────────────────────────────────── */

function FreeSection({ stats }: { stats: FullStatsResponse }) {
  return (
    <>
      <KpiGrid>
        <KpiCard label="Clients inscrits" value={stats.totalClients} />
        <KpiCard label="Cartes actives" value={stats.activeCards} />
        <KpiCard label="Scans réalisés" value={stats.totalStamps} />
        <KpiCard label="Récompenses débloquées" value={stats.rewardsClaimed} />
        <KpiCard
          label="Progression moyenne"
          value={stats.avgProgressionPct !== null ? `${stats.avgProgressionPct}%` : "—"}
          sub="Sur les cartes à tampons"
        />
      </KpiGrid>

      <ChartCard title="Activité — 7 derniers jours" style={{ marginBottom: 32 }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={stats.activityLast7} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="aFill7" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
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
      <KpiGrid>
        <KpiCard
          label="Nouvelles inscriptions (30j)"
          value={stats.newClientsLast30 ?? 0}
          sub="Clients créés ce mois"
        />
        <KpiCard
          label="Taux ajout Wallet"
          value={stats.walletInstallRate !== null ? `${stats.walletInstallRate}%` : "—"}
          sub="Cartes avec pass installé"
        />
        <KpiCard
          label="Clients actifs (30j)"
          value={stats.activeClientsLast30 ?? 0}
          sub="Au moins 1 scan ce mois"
        />
        <KpiCard
          label="Nombre de scans"
          value={stats.totalStamps}
          sub="Total depuis le début"
        />
        <KpiCard
          label="Scans / client"
          value={stats.scansPerClient !== null ? stats.scansPerClient : "—"}
          sub="Moyenne par client"
        />
        <KpiCard label="Récompenses débloquées" value={stats.rewardsClaimed} />
        <KpiCard label="Récompenses utilisées" value={stats.rewardsRedeemed ?? 0} />
        <KpiCard
          label="Proches d'une récompense"
          value={stats.nearRewardCount ?? 0}
          sub="≥ 80% de progression"
        />
      </KpiGrid>

      <ChartsGrid cols={2}>
        <ChartCard title="Inscriptions — 30 derniers jours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={stats.inscriptionsLast30 ?? []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="aFillInsc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
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
              <Tooltip content={<DarkTooltip suffix="inscription(s)" />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={ACCENT}
                strokeWidth={2}
                fill="url(#aFillInsc)"
                dot={false}
                activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Scans — 30 derniers jours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={stats.scansLast30 ?? []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="aFillScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
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
                fill="url(#aFillScans)"
                dot={false}
                activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Récompenses débloquées — 30 derniers jours" style={{ gridColumn: "1 / -1" }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={stats.rewardsLast30 ?? []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtShortDate}
                {...axisProps}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis {...axisProps} width={28} />
              <Tooltip
                content={<DarkTooltip suffix="récompense(s)" />}
                cursor={{ fill: "rgba(212,255,78,0.08)" }}
              />
              <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartsGrid>
    </>
  );
}

function GrowthSection({ stats }: { stats: FullStatsResponse }) {
  const PIE_COLORS = [ACCENT, "rgba(212,255,78,0.3)"];

  return (
    <>
      <KpiGrid>
        <KpiCard
          label="Clients actifs (30j)"
          value={stats.activeClientsLast30 ?? 0}
          sub="Au moins 1 scan ce mois"
        />
        <KpiCard
          label="Clients inactifs"
          value={stats.inactiveClients ?? 0}
          sub="Aucun scan depuis 60j"
        />
        <KpiCard label="Taux de réactivation" value="Bientôt" sub="Données insuffisantes" />
        <KpiCard label="Campagnes envoyées" value={stats.campaignsSent ?? 0} />
        <KpiCard
          label="Taux d'ouverture"
          value={stats.openRate !== null ? `${stats.openRate}%` : "—"}
          sub={`${stats.notifDelivered ?? 0} / ${stats.notifTotal ?? 0} livrées`}
        />
        <KpiCard label="Retours après campagne" value="Bientôt" sub="Analyse en cours" />
        <KpiCard
          label="Temps moyen vers récompense"
          value={stats.avgDaysToReward !== null ? `${stats.avgDaysToReward}j` : "—"}
          sub="Depuis inscription"
        />
        <KpiCard label="Top segment" value="Bientôt" sub="Segmentation avancée" />
        <KpiCard label="Récompenses utilisées" value={stats.rewardsRedeemed ?? 0} />
        <KpiCard label="Visites répétées (estim.)" value="Bientôt" sub="Analyse prédictive" />
      </KpiGrid>

      <ChartsGrid cols={2}>
        <ChartCard title="Actifs vs Inactifs">
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
              <Tooltip
                contentStyle={{
                  background: "rgba(20,22,16,0.95)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Performance des campagnes (Top 5)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.campaignPerformance ?? []}
              layout="vertical"
              margin={{ top: 6, right: 30, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis
                dataKey="name"
                type="category"
                {...axisProps}
                width={80}
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: MONO }}
              />
              <Tooltip
                cursor={{ fill: "rgba(212,255,78,0.08)" }}
                contentStyle={{
                  background: "rgba(20,22,16,0.95)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sentCount" name="Envoyés" fill={ACCENT_FILL} radius={[0, 4, 4, 0]} maxBarSize={16} />
              <Bar dataKey="deliveredCount" name="Livrés" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribution de progression des clients">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.clientProgressionDist ?? []}
              layout="vertical"
              margin={{ top: 6, right: 30, left: 16, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis
                dataKey="range"
                type="category"
                {...axisProps}
                width={68}
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: MONO }}
              />
              <Tooltip
                content={<DarkTooltip suffix="carte(s)" />}
                cursor={{ fill: "rgba(212,255,78,0.08)" }}
              />
              <Bar dataKey="count" fill={ACCENT} radius={[0, 6, 6, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution mensuelle (6 mois)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={stats.monthlyGrowth ?? []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="aFillMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tickFormatter={fmtMonth} {...axisProps} />
              <YAxis {...axisProps} width={28} />
              <Tooltip content={<DarkTooltip suffix="client(s)" />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={ACCENT}
                strokeWidth={2}
                fill="url(#aFillMonthly)"
                dot={false}
                activeDot={{ r: 5, fill: ACCENT, stroke: "#0a0d04", strokeWidth: 2 }}
              />
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
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            color: MUTED,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Comparatif par établissement
        </p>
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                {["Établissement", "Clients", "Scans", "Récompenses"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
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
              {ests.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "24px 16px",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 13,
                    }}
                  >
                    Aucun établissement configuré
                  </td>
                </tr>
              ) : (
                ests.map((e, i) => (
                  <tr
                    key={e.id}
                    style={{
                      borderBottom: i < ests.length - 1 ? `1px solid ${BORDER}` : undefined,
                    }}
                  >
                    <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
                      {e.name}
                    </td>
                    <td style={{ padding: "14px 16px", color: ACCENT, fontSize: 14, fontWeight: 600 }}>
                      {e.clientCount}
                    </td>
                    <td style={{ padding: "14px 16px", color: ACCENT, fontSize: 14, fontWeight: 600 }}>
                      {e.scanCount}
                    </td>
                    <td style={{ padding: "14px 16px", color: ACCENT, fontSize: 14, fontWeight: 600 }}>
                      {e.rewardCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
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
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Erreur inconnue")
      )
      .finally(() => setLoading(false));
  }, []);

  const plan = stats?.plan ?? session?.user?.plan ?? "FREE";
  const planLevel = PLAN_ORDER[plan] ?? 0;

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Statistiques</h1>
        <p className="dx-page-sub">
          Analyse détaillée de votre programme de fidélité —{" "}
          <span style={{ color: ACCENT }}>{PLAN_LABELS[plan] ?? plan}</span>
        </p>
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <div
          style={{
            background: "rgba(255,60,60,0.08)",
            border: "1px solid rgba(255,60,60,0.2)",
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
          {/* FREE is always shown */}
          <FreeSection stats={stats} />

          {planLevel >= PLAN_ORDER.ESSENTIAL && <EssentialSection stats={stats} />}

          {planLevel >= PLAN_ORDER.GROWTH && <GrowthSection stats={stats} />}

          {planLevel >= PLAN_ORDER.MULTI_SITE && <MultiSiteSection stats={stats} />}

          {planLevel < PLAN_ORDER.MULTI_SITE && <UpgradeBanner currentPlan={plan} />}
        </>
      )}
    </div>
  );
}
