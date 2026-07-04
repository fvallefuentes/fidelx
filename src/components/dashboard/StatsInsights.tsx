"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Calendar,
  Users,
  Lock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { InsightsResponse } from "@/app/api/merchants/stats/insights/route";

const ACCENT = "#b7f238";
const ACCENT_RGB = "183,242,56";
const RED = "#ff7a6b";
const MUTED = "rgb(var(--ovr) / 0.38)";
const BORDER = "rgb(var(--ovr) / 0.08)";
const CARD_BG = "var(--card-surface)";
const VAL_COLOR = "rgb(var(--ovr) / 0.92)";

export function StatsInsights({ isFree }: { isFree: boolean }) {
  const t = useTranslations("Dashboard.statsInsights");
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetch("/api/merchants/stats/insights")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) return null;
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PeriodComparison comparison={data.comparison} />

      {data.available ? (
        <HeatmapPanel cells={data.heatmap} />
      ) : (
        <LockedFeaturePanel
          title={t("lockedHeatmapTitle")}
          description={t("lockedHeatmapDescription")}
        />
      )}

      {data.available && data.cohorts.length > 0 ? (
        <CohortPanel cohorts={data.cohorts} />
      ) : !data.available ? (
        <LockedFeaturePanel
          title={t("lockedCohortTitle")}
          description={t("lockedCohortDescription")}
        />
      ) : null}

      {isFree && (
        <p style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>
          {t("freeHint")}
        </p>
      )}
    </div>
  );
}

function PeriodComparison({
  comparison,
}: {
  comparison: InsightsResponse["comparison"];
}) {
  const t = useTranslations("Dashboard.statsInsights");
  const metrics = comparison.metrics;
  const items: { key: keyof typeof metrics; label: string; unit?: string }[] = [
    { key: "newClients", label: t("metrics.newClients") },
    { key: "scans", label: t("metrics.scans") },
    { key: "rewards", label: t("metrics.rewards") },
    { key: "activeClients", label: t("metrics.activeClients") },
    {
      key: "avgScansPerClient",
      label: t("metrics.avgScansPerClient"),
      unit: "",
    },
  ];

  return (
    <section>
      <SectionHeader
        icon={<Calendar size={14} />}
        title={t("periodTitle")}
        sub={t("periodSub", {
          days: comparison.period.days,
          from: comparison.previousPeriod.from,
          to: comparison.previousPeriod.to,
        })}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((item) => {
          const m = metrics[item.key];
          return (
            <DeltaCard
              key={item.key}
              label={item.label}
              current={m.current}
              previous={m.previous}
              deltaPct={m.deltaPct}
              unit={item.unit}
            />
          );
        })}
      </div>
    </section>
  );
}

function DeltaCard({
  label,
  current,
  previous,
  deltaPct,
  unit = "",
}: {
  label: string;
  current: number;
  previous: number;
  deltaPct: number | null;
  unit?: string;
}) {
  const t = useTranslations("Dashboard.statsInsights");
  const isUp = deltaPct !== null && deltaPct > 0;
  const isDown = deltaPct !== null && deltaPct < 0;
  const isFlat = deltaPct === 0;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? ACCENT : isDown ? RED : MUTED;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: VAL_COLOR }}>
        {current}
        {unit}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            color,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Icon size={12} />
          {deltaPct === null
            ? "-"
            : `${deltaPct > 0 ? "+" : ""}${deltaPct}%`}
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>
          {t("deltaPrevious", { previous, unit })}
          {isFlat ? t("stable") : ""}
        </span>
      </div>
    </div>
  );
}

function HeatmapPanel({ cells }: { cells: InsightsResponse["heatmap"] }) {
  const t = useTranslations("Dashboard.statsInsights");
  const dayLabels = t.raw("days") as string[];
  const max = Math.max(1, ...cells.map((c) => c.count));
  const cellMap = new Map<string, number>();
  cells.forEach((c) => cellMap.set(`${c.day}-${c.hour}`, c.count));
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <section>
      <SectionHeader
        icon={<Activity size={14} />}
        title={t("heatmapTitle")}
        sub={t("heatmapSub")}
      />
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 16,
          overflowX: "auto",
        }}
      >
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 2,
            margin: "0 auto",
            fontSize: 10,
          }}
        >
          <thead>
            <tr>
              <th />
              {dayOrder.map((d) => (
                <th
                  key={d}
                  style={{
                    color: MUTED,
                    fontWeight: 500,
                    width: 28,
                    padding: "2px 0",
                  }}
                >
                  {dayLabels[d].slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 24 }).map((_, hour) => (
              <tr key={hour}>
                <td
                  style={{
                    color: MUTED,
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: 9,
                    padding: "0 6px 0 0",
                    textAlign: "right",
                  }}
                >
                  {String(hour).padStart(2, "0")}h
                </td>
                {dayOrder.map((d) => {
                  const count = cellMap.get(`${d}-${hour}`) || 0;
                  const intensity = count / max;
                  return (
                    <td key={d}>
                      <div
                        title={t("scanCount", {
                          day: dayLabels[d],
                          hour,
                          count,
                        })}
                        style={{
                          width: 24,
                          height: 14,
                          borderRadius: 3,
                          background:
                            count === 0
                              ? "rgb(var(--ovr) / 0.03)"
                              : `rgba(${ACCENT_RGB},${0.15 + intensity * 0.75})`,
                          cursor: "default",
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 12,
            fontSize: 10,
            color: MUTED,
          }}
        >
          <span>{t("less")}</span>
          {[0.15, 0.3, 0.5, 0.7, 0.9].map((i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: `rgba(${ACCENT_RGB},${i})`,
              }}
            />
          ))}
          <span>{t("more")}</span>
        </div>
      </div>
    </section>
  );
}

function CohortPanel({ cohorts }: { cohorts: InsightsResponse["cohorts"] }) {
  const t = useTranslations("Dashboard.statsInsights");
  const maxWeeks = Math.max(0, ...cohorts.map((c) => c.retention.length));

  return (
    <section>
      <SectionHeader
        icon={<Users size={14} />}
        title={t("cohortTitle")}
        sub={t("cohortSub")}
      />
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 16,
          overflowX: "auto",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 12,
            minWidth: 600,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>{t("cohort")}</th>
              <th style={thStyle}>{t("signups")}</th>
              {Array.from({ length: maxWeeks }).map((_, i) => (
                <th key={i} style={thStyle}>
                  {t("weekPrefix", { week: i + 1 })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts
              .slice()
              .reverse()
              .map((c) => (
                <tr key={c.cohortWeek}>
                  <td style={tdStyle}>
                    <span style={{ color: VAL_COLOR, fontWeight: 500 }}>
                      {c.cohortWeek}
                    </span>
                    <div
                      style={{
                        fontSize: 10,
                        color: MUTED,
                        fontFamily: "var(--font-geist-mono, monospace)",
                      }}
                    >
                      {c.weekStart}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: VAL_COLOR }}>
                    {c.signups}
                  </td>
                  {Array.from({ length: maxWeeks }).map((_, i) => {
                    const retained = c.retention[i];
                    if (retained === undefined) {
                      return (
                        <td key={i} style={{ ...tdStyle, color: MUTED }}>
                          -
                        </td>
                      );
                    }
                    const pct = c.signups > 0 ? (retained / c.signups) * 100 : 0;
                    const intensity = pct / 100;
                    return (
                      <td
                        key={i}
                        style={{
                          ...tdStyle,
                          background: `rgba(${ACCENT_RGB},${
                            0.05 + intensity * 0.55
                          })`,
                          color: intensity > 0.5 ? "#0a0d04" : VAL_COLOR,
                          fontWeight: 500,
                          textAlign: "center",
                          width: 60,
                        }}
                        title={t("activeTitle", {
                          retained,
                          signups: c.signups,
                          week: i + 1,
                        })}
                      >
                        {Math.round(pct)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: ACCENT,
          fontFamily: "var(--font-geist-mono, monospace)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {icon}
        {title}
      </div>
      {sub && <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>}
    </div>
  );
}

function LockedFeaturePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <SectionHeader icon={<Lock size={12} />} title={title} />
      <div
        style={{
          background: CARD_BG,
          border: `1px dashed ${BORDER}`,
          borderRadius: 12,
          padding: 22,
          textAlign: "center",
        }}
      >
        <Lock size={20} style={{ color: MUTED, marginBottom: 8 }} />
        <p style={{ margin: 0, fontSize: 13, color: "rgb(var(--ovr) / 0.6)" }}>
          {description}
        </p>
      </div>
    </section>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  color: MUTED,
  fontWeight: 500,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: `1px solid ${BORDER}`,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: `1px solid ${BORDER}`,
};
