"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CreditCard,
  TrendingUp,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  Stamp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

interface DashboardStats {
  totalClients: number;
  activeCards: number;
  totalVisits: number;
  returnRate: number;
  newClientsThisWeek: number;
  newClientsLastWeek: number;
  visitsThisWeek: number;
  visitsLastWeek: number;
  visitsByDay: { date: string; count: number }[];
  newClientsByDay: { date: string; count: number }[];
  stampDistribution: { range: string; count: number }[];
  topPrograms: { id: string; name: string; cards: number }[];
  recentClients: {
    id: string;
    firstName: string;
    email: string | null;
    currentStamps: number;
    lastVisitAt: string | null;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchants/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dx-loading-inline">
        <div className="dx-spinner" />
      </div>
    );
  }

  const dVisits = trendDelta(stats?.visitsThisWeek || 0, stats?.visitsLastWeek || 0);
  const dClients = trendDelta(stats?.newClientsThisWeek || 0, stats?.newClientsLastWeek || 0);

  const statCards = [
    {
      title: "Clients inscrits",
      value: stats?.totalClients || 0,
      icon: Users,
      trend: dClients,
      sub: "Nouveaux 7 derniers jours",
    },
    {
      title: "Cartes actives",
      value: stats?.activeCards || 0,
      icon: CreditCard,
      trend: null,
      sub: `Sur ${stats?.totalClients || 0} cartes`,
    },
    {
      title: "Visites totales",
      value: stats?.totalVisits || 0,
      icon: TrendingUp,
      trend: dVisits,
      sub: "Visites 7 derniers jours",
    },
    {
      title: "Taux de retour",
      value: `${stats?.returnRate || 0}%`,
      icon: Repeat,
      trend: null,
      sub: "Clients revenus ≥ 2 fois",
    },
  ];

  const totalRetention =
    (stats?.stampDistribution.reduce((a, b) => a + b.count, 0) || 0) || 1;

  const radialData = [
    {
      name: "Engagement",
      value: stats?.returnRate || 0,
      fill: "#d4ff4e",
    },
  ];

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Tableau de bord</h1>
        <p className="dx-page-sub">
          Vue d&apos;ensemble de votre programme de fidélité — données en temps réel.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="dx-stats-grid">
        {statCards.map((s) => (
          <div className="dx-stat-card" key={s.title}>
            <div className="dx-stat-top">
              <span className="dx-stat-label">{s.title}</span>
              <div className="dx-stat-icon">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="dx-stat-value">{s.value}</div>
            <div className="dx-stat-foot">
              {s.trend !== null && (
                <span className={`dx-trend ${s.trend.up ? "up" : s.trend.down ? "down" : "flat"}`}>
                  {s.trend.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : s.trend.down ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : null}
                  {s.trend.label}
                </span>
              )}
              <span className="dx-stat-sub">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1: Visits area + Engagement gauge */}
      <div className="dx-charts-row">
        <div className="dx-chart-card span-2">
          <div className="dx-chart-head">
            <div>
              <div className="dx-chart-eyebrow">VISITES — 30 DERNIERS JOURS</div>
              <div className="dx-chart-num">
                {(stats?.visitsByDay || []).reduce((a, b) => a + b.count, 0)}
                <span className="dx-chart-num-sub"> tampons distribués</span>
              </div>
            </div>
            <div className="dx-chart-legend">
              <span className="dx-legend-dot" /> Visites quotidiennes
            </div>
          </div>
          <div className="dx-chart-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.visitsByDay || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4ff4e" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#d4ff4e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtShortDate}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8a8e84", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8a8e84", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                  width={28}
                />
                <Tooltip content={<DarkTooltip suffix="visite(s)" />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#d4ff4e"
                  strokeWidth={2}
                  fill="url(#visitsFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#d4ff4e", stroke: "#0a0d04", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dx-chart-card">
          <div className="dx-chart-head">
            <div>
              <div className="dx-chart-eyebrow">ENGAGEMENT</div>
              <div className="dx-chart-num">
                {stats?.returnRate || 0}<span className="dx-chart-num-sub">%</span>
              </div>
            </div>
          </div>
          <div className="dx-chart-body" style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="80%">
              <RadialBarChart
                innerRadius="72%"
                outerRadius="100%"
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  background={{ fill: "rgba(255,255,255,0.05)" }}
                  dataKey="value"
                  cornerRadius={10}
                  fill="#d4ff4e"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="dx-radial-caption">Clients revenus ≥ 2 fois</div>
          </div>
        </div>
      </div>

      {/* Charts row 2: New clients bar + Stamp distribution */}
      <div className="dx-charts-row">
        <div className="dx-chart-card">
          <div className="dx-chart-head">
            <div>
              <div className="dx-chart-eyebrow">NOUVEAUX CLIENTS — 30 JOURS</div>
              <div className="dx-chart-num">
                {(stats?.newClientsByDay || []).reduce((a, b) => a + b.count, 0)}
                <span className="dx-chart-num-sub"> inscrits</span>
              </div>
            </div>
          </div>
          <div className="dx-chart-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.newClientsByDay || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtShortDate}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8a8e84", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8a8e84", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                  width={28}
                />
                <Tooltip content={<DarkTooltip suffix="nouveau(x)" />} cursor={{ fill: "rgba(212,255,78,0.08)" }} />
                <Bar dataKey="count" fill="#d4ff4e" radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dx-chart-card span-2">
          <div className="dx-chart-head">
            <div>
              <div className="dx-chart-eyebrow">PROGRESSION DES CARTES</div>
              <div className="dx-chart-num">
                {stats?.totalClients || 0}<span className="dx-chart-num-sub"> cartes</span>
              </div>
            </div>
          </div>
          <div className="dx-chart-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.stampDistribution || []}
                layout="vertical"
                margin={{ top: 6, right: 30, left: 16, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8a8e84", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                />
                <YAxis
                  dataKey="range"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#c9ccc3", fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)" }}
                  width={68}
                />
                <Tooltip content={<DarkTooltip suffix="carte(s)" />} cursor={{ fill: "rgba(212,255,78,0.08)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {(stats?.stampDistribution || []).map((entry, i) => {
                    const pct = (entry.count / Math.max(1, totalRetention)) * 100;
                    const color = i === 4 ? "#d4ff4e" : `rgba(212,255,78,${0.25 + pct / 200})`;
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row: Top programs + Recent clients */}
      <div className="dx-charts-row">
        <div className="dx-chart-card">
          <div className="dx-chart-head">
            <div className="dx-chart-eyebrow">TOP PROGRAMMES</div>
          </div>
          <div className="dx-list">
            {stats?.topPrograms && stats.topPrograms.length > 0 ? (
              stats.topPrograms.map((p, i) => {
                const max = stats.topPrograms[0]?.cards || 1;
                const w = Math.max(6, (p.cards / max) * 100);
                return (
                  <div className="dx-list-row" key={p.id}>
                    <div className="dx-list-rank">{String(i + 1).padStart(2, "0")}</div>
                    <div className="dx-list-mid">
                      <div className="dx-list-name">{p.name}</div>
                      <div className="dx-bar-track">
                        <div className="dx-bar-fill" style={{ width: `${w}%` }} />
                      </div>
                    </div>
                    <div className="dx-list-num">{p.cards}</div>
                  </div>
                );
              })
            ) : (
              <div className="dx-empty">Aucun programme actif</div>
            )}
          </div>
        </div>

        <div className="dx-chart-card span-2">
          <div className="dx-chart-head">
            <div className="dx-chart-eyebrow">DERNIERS CLIENTS</div>
          </div>
          <div className="dx-list">
            {stats?.recentClients && stats.recentClients.length > 0 ? (
              stats.recentClients.map((c) => (
                <div className="dx-client-row" key={c.id}>
                  <div className="dx-avatar">
                    {(c.firstName?.charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="dx-client-mid">
                    <div className="dx-client-name">{c.firstName || "Anonyme"}</div>
                    <div className="dx-client-mail">{c.email || "Pas d'email"}</div>
                  </div>
                  <div className="dx-client-stamps">
                    <Stamp className="h-3.5 w-3.5" />
                    {c.currentStamps}
                  </div>
                  {c.lastVisitAt && (
                    <div className="dx-client-date">
                      {new Date(c.lastVisitAt).toLocaleDateString("fr-CH")}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="dx-empty">
                Aucun client pour le moment.<br />
                Partagez votre QR code pour commencer.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */
function fmtShortDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "short" });
}

function trendDelta(current: number, previous: number) {
  if (current === 0 && previous === 0) {
    return { up: false, down: false, label: "—" };
  }
  if (previous === 0) {
    return { up: true, down: false, label: `+${current}` };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { up: true, down: false, label: `+${pct}%` };
  if (pct < 0) return { up: false, down: true, label: `${pct}%` };
  return { up: false, down: false, label: "0%" };
}

interface TooltipPayload {
  payload?: { date?: string };
  value?: number;
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
  const date = p.payload?.date || label;
  return (
    <div className="dx-tt">
      <div className="dx-tt-date">
        {date ? new Date(date).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" }) : ""}
      </div>
      <div className="dx-tt-row">
        <span className="dx-tt-dot" />
        <strong>{p.value}</strong> {suffix}
      </div>
    </div>
  );
}
