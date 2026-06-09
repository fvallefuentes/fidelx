"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, RotateCcw, Activity, Filter, Ban, X } from "lucide-react";

type Result =
  | "SUCCESS"
  | "RATE_LIMITED"
  | "DUPLICATE_RECOVERY"
  | "PROGRAM_FULL"
  | "PROGRAM_NOT_FOUND"
  | "VALIDATION_ERROR";

type Attempt = {
  id: string;
  programId: string;
  ipPrefix: string | null;
  userAgent: string | null;
  deviceCookie: string | null;
  fingerprint: string | null;
  email: string | null;
  phone: string | null;
  cardId: string | null;
  result: Result;
  blockedReason: string | null;
  createdAt: string;
  program: {
    id: string;
    name: string;
    merchant: { id: string; name: string | null; email: string };
  } | null;
};

type BlockedIp = {
  id: string;
  ipPrefix: string;
  reason: string | null;
  blockedById: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type ApiResponse = {
  stats: {
    total24h: number;
    success24h: number;
    rateLimited24h: number;
    duplicate24h: number;
    total7d: number;
  };
  suspicious: {
    ips: { ipPrefix: string | null; count: number }[];
    cookies: { deviceCookie: string | null; count: number }[];
  };
  blockedIps: BlockedIp[];
  attempts: Attempt[];
};

const RESULT_LABELS: Record<Result, string> = {
  SUCCESS: "Succès",
  RATE_LIMITED: "Rate limited",
  DUPLICATE_RECOVERY: "Récupération",
  PROGRAM_FULL: "Plan plein",
  PROGRAM_NOT_FOUND: "Programme inconnu",
  VALIDATION_ERROR: "Validation échouée",
};

const RESULT_VARIANT: Record<
  Result,
  "default" | "secondary" | "success" | "destructive"
> = {
  SUCCESS: "success",
  RATE_LIMITED: "destructive",
  DUPLICATE_RECOVERY: "secondary",
  PROGRAM_FULL: "secondary",
  PROGRAM_NOT_FOUND: "secondary",
  VALIDATION_ERROR: "secondary",
};

type FilterMode = "all" | "suspicious" | "rate_limited" | "recovery";

export default function AbusePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/abuse?filter=${filter}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-400">Erreur de chargement.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6" /> Anti-abus
        </h1>
        <p className="text-gray-500">
          Tentatives d&apos;inscription via QR code · rate limiting et détection
        </p>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Tentatives 24h"
          value={data.stats.total24h}
          icon={Activity}
        />
        <KpiCard
          label="Succès 24h"
          value={data.stats.success24h}
          icon={Activity}
          color="#d4ff4e"
        />
        <KpiCard
          label="Rate limited 24h"
          value={data.stats.rateLimited24h}
          icon={AlertTriangle}
          color={data.stats.rateLimited24h > 0 ? "#ff7a6b" : undefined}
        />
        <KpiCard
          label="Récupérations 24h"
          value={data.stats.duplicate24h}
          icon={RotateCcw}
        />
        <KpiCard
          label="Tentatives 7j"
          value={data.stats.total7d}
          icon={Activity}
        />
      </div>

      {/* IPs actuellement bloquées — toujours visible pour pouvoir débloquer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-400" />
            IPs actuellement bloquées ({data.blockedIps.length})
          </CardTitle>
          <CardDescription>
            Les requêtes depuis ces IPs reçoivent un 403 (cache 60s par worker)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Déblocage manuel par prefix — pratique si l'IP n'apparaît pas */}
          <ManualUnblockForm onUnblocked={() => window.location.reload()} />

          {data.blockedIps.length === 0 ? (
            <p className="text-xs text-gray-500 italic">
              Aucune IP actuellement bloquée. Les IP bloquées automatiquement
              ou manuellement apparaîtront ici avec un bouton « Débloquer ».
            </p>
          ) : (
            <div className="space-y-1.5">
              {data.blockedIps.map((b) => (
                <BlockedIpRow
                  key={b.id}
                  blocked={b}
                  onUnblocked={() => window.location.reload()}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top IPs / cookies suspects */}
      {(data.suspicious.ips.length > 0 ||
        data.suspicious.cookies.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.suspicious.ips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  IP les plus actives (24h, &gt;3 tentatives)
                </CardTitle>
                <CardDescription>
                  IP anonymisée /24 (IPv4) ou /48 (IPv6)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {data.suspicious.ips.map((g, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center gap-2 py-1.5 px-2 rounded bg-white/[0.02] text-xs"
                    >
                      <code className="font-mono text-gray-300">
                        {g.ipPrefix}
                      </code>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            g.count > 10
                              ? "destructive"
                              : g.count > 5
                              ? "default"
                              : "secondary"
                          }
                        >
                          {g.count} attempts
                        </Badge>
                        {g.ipPrefix && (
                          <BlockIpButton
                            ipPrefix={g.ipPrefix}
                            count={g.count}
                            onBlocked={() => window.location.reload()}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {data.suspicious.cookies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  Devices les plus actifs (24h, &gt;3 tentatives)
                </CardTitle>
                <CardDescription>
                  Cookie fid_dev (UUID device)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {data.suspicious.cookies.map((g, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-1.5 px-2 rounded bg-white/[0.02] text-xs"
                    >
                      <code className="font-mono text-gray-300">
                        {g.deviceCookie?.slice(0, 8)}…
                      </code>
                      <Badge
                        variant={
                          g.count > 10
                            ? "destructive"
                            : g.count > 5
                            ? "default"
                            : "secondary"
                        }
                      >
                        {g.count} attempts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        {(
          [
            { val: "all", label: "Toutes" },
            { val: "suspicious", label: "Suspectes" },
            { val: "rate_limited", label: "Rate limited" },
            { val: "recovery", label: "Récupérations" },
          ] as { val: FilterMode; label: string }[]
        ).map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className="text-xs px-2.5 py-1 rounded-full border transition-colors"
            style={
              filter === val
                ? {
                    background: "#d4ff4e",
                    color: "#0a0d04",
                    borderColor: "#d4ff4e",
                    fontWeight: 600,
                  }
                : {
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.5)",
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste des tentatives */}
      <Card>
        <CardHeader>
          <CardTitle>Tentatives récentes</CardTitle>
          <CardDescription>{data.attempts.length} entrées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="pb-2 px-2 font-medium">Date</th>
                  <th className="pb-2 px-2 font-medium">Résultat</th>
                  <th className="pb-2 px-2 font-medium">Programme</th>
                  <th className="pb-2 px-2 font-medium">IP / Cookie</th>
                  <th className="pb-2 px-2 font-medium">Email / Phone</th>
                  <th className="pb-2 px-2 font-medium">Raison</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02]">
                    <td
                      className="py-2 px-2 text-xs text-gray-400 font-mono whitespace-nowrap"
                      title={new Date(a.createdAt).toISOString()}
                    >
                      {new Date(a.createdAt).toLocaleString("fr-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant={RESULT_VARIANT[a.result]}>
                        {RESULT_LABELS[a.result]}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {a.program ? (
                        <>
                          <div className="text-gray-200">
                            {a.program.name}
                          </div>
                          <div className="text-gray-500">
                            {a.program.merchant.name ||
                              a.program.merchant.email}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {a.ipPrefix && (
                        <div className="text-gray-300 font-mono">
                          {a.ipPrefix}
                        </div>
                      )}
                      {a.deviceCookie && (
                        <div
                          className="text-gray-500 font-mono"
                          title={a.deviceCookie}
                        >
                          {a.deviceCookie.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-300">
                      {a.email && <div>{a.email}</div>}
                      {a.phone && <div className="text-gray-500">{a.phone}</div>}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-500">
                      {a.blockedReason || "—"}
                    </td>
                  </tr>
                ))}
                {data.attempts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-gray-500"
                    >
                      Aucune tentative correspondante.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Form de déblocage manuel par prefix IP ─────────────── */
function ManualUnblockForm({ onUnblocked }: { onUnblocked: () => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ipPrefix = value.trim();
    if (!ipPrefix) return;
    if (!confirm(`Débloquer le prefix « ${ipPrefix} » ?`)) return;

    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/admin/abuse/block-ip", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipPrefix }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("ok");
        setMessage(`Prefix « ${ipPrefix} » débloqué.`);
        setValue("");
        // Reload après une petite pause pour laisser voir la confirmation
        setTimeout(onUnblocked, 700);
      } else {
        setStatus("error");
        setMessage(data?.error || "Erreur lors du déblocage");
      }
    } catch {
      setStatus("error");
      setMessage("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
    >
      <label className="text-xs text-gray-500 block mb-1.5">
        Débloquer une IP manuellement (prefix /24 ou /48)
      </label>
      <div className="flex gap-2 items-stretch">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus("idle");
          }}
          placeholder="Ex: 89.47.50.0/24"
          className="flex-1 h-9 px-3 rounded-md border border-gray-300 text-sm font-mono bg-white"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="ip-block-unblock-btn"
          style={{ padding: "6px 14px", whiteSpace: "nowrap" }}
        >
          {loading ? (
            <RotateCcw size={11} className="animate-spin" />
          ) : (
            <X size={11} />
          )}
          Débloquer
        </button>
      </div>
      {status === "ok" && (
        <p className="text-xs text-green-600 mt-1.5">{message}</p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-500 mt-1.5">{message}</p>
      )}
    </form>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span style={{ color: color || "rgba(255,255,255,0.4)" }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div
        className="text-2xl font-bold mt-1"
        style={{ color: color || "#fff" }}
      >
        {value}
      </div>
    </div>
  );
}

/* ─── Ligne IP bloquée + bouton "Débloquer" ──────────────── */
function BlockedIpRow({
  blocked,
  onUnblocked,
}: {
  blocked: BlockedIp;
  onUnblocked: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function unblock() {
    if (!confirm(`Débloquer l'IP ${blocked.ipPrefix} ?`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/abuse/block-ip/${blocked.id}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) onUnblocked();
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("fr-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  const blockedAtLabel = `bloquée le ${fmt(blocked.createdAt)}`;
  const expiresLabel = blocked.expiresAt
    ? `expire le ${fmt(blocked.expiresAt)}`
    : "permanent";
  const isAutoBlock = !blocked.blockedById;

  return (
    <div className="ip-block-list-row">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <code className="font-mono text-gray-200">{blocked.ipPrefix}</code>
        {isAutoBlock && (
          <Badge variant="secondary" className="text-[10px]">
            AUTO
          </Badge>
        )}
        {blocked.reason && (
          <span className="text-xs text-gray-500 truncate" title={blocked.reason}>
            · {blocked.reason}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="text-[11px] text-gray-500 font-mono text-right leading-tight"
          title={`${blockedAtLabel}\n${expiresLabel}`}
        >
          <span className="block">{blockedAtLabel}</span>
          <span className="block">{expiresLabel}</span>
        </span>
        <button
          type="button"
          onClick={unblock}
          disabled={loading}
          className="ip-block-unblock-btn"
        >
          {loading ? <RotateCcw size={10} className="animate-spin" /> : <X size={10} />}
          Débloquer
        </button>
      </div>
    </div>
  );
}

/* ─── Bouton "Bloquer" sur une ligne IP ────────────────────── */
function BlockIpButton({
  ipPrefix,
  count,
  onBlocked,
}: {
  ipPrefix: string;
  count: number;
  onBlocked: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<"1h" | "24h" | "7d" | "30d" | "forever">("24h");
  const [reason, setReason] = useState("");

  async function block() {
    setLoading(true);
    const res = await fetch("/api/admin/abuse/block-ip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipPrefix,
        reason: reason.trim() || `Auto-block après ${count} attempts en 24h`,
        expiresIn: duration,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      onBlocked();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ip-block-btn"
        title={`Bloquer l'IP ${ipPrefix}`}
      >
        <Ban size={10} /> Bloquer
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,7,7,0.8)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0c0d0c",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: 24,
          maxWidth: 440,
          width: "100%",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          <Ban size={14} style={{ display: "inline", marginRight: 8, verticalAlign: -2, color: "#ff7a6b" }} />
          Bloquer l&apos;IP
        </h3>
        <p style={{ margin: "8px 0 14px", fontSize: 12, color: "#8a8e84" }}>
          Toute requête venant de <code style={{ color: "#f4f5f1", fontFamily: "var(--font-geist-mono, monospace)" }}>{ipPrefix}</code>{" "}
          recevra un 403. {count} tentatives observées sur 24h.
        </p>

        <label style={{ display: "block", fontSize: 11, color: "#8a8e84", marginBottom: 4 }}>Durée</label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as typeof duration)}
          style={{
            width: "100%",
            height: 36,
            padding: "0 10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#f4f5f1",
            borderRadius: 8,
            fontFamily: "inherit",
            marginBottom: 12,
          }}
        >
          <option value="1h">1 heure</option>
          <option value="24h">24 heures</option>
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="forever">Permanent</option>
        </select>

        <label style={{ display: "block", fontSize: 11, color: "#8a8e84", marginBottom: 4 }}>Raison (optionnel)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Bot, attaque brute-force…"
          style={{
            width: "100%",
            height: 36,
            padding: "0 10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#f4f5f1",
            borderRadius: 8,
            fontFamily: "inherit",
            marginBottom: 14,
            fontSize: 12.5,
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ip-block-unblock-btn"
            style={{ padding: "6px 14px" }}
          >
            <X size={11} /> Annuler
          </button>
          <button
            type="button"
            onClick={block}
            disabled={loading}
            className="ip-block-btn"
            style={{ padding: "6px 14px", fontSize: 12 }}
          >
            <Ban size={11} /> {loading ? "Blocage…" : "Confirmer le blocage"}
          </button>
        </div>
      </div>
    </div>
  );
}
