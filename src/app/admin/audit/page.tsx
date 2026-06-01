"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ScrollText,
  Filter,
  User as UserIcon,
  Ban,
  KeyRound,
  Award,
  Trash2,
  Shield,
  ShieldOff,
  Pencil,
  Loader2,
  ChevronRight,
} from "lucide-react";

type AuditEntry = {
  id: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  ipPrefix: string | null;
  createdAt: string;
};

const ACTION_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "SUSPEND_USER", label: "Suspendre" },
  { value: "UNSUSPEND_USER", label: "Désuspendre" },
  { value: "RESET_USER_PASSWORD", label: "Reset password" },
  { value: "DELETE_USER", label: "Supprimer user" },
  { value: "UPDATE_USER_ROLE", label: "Changer rôle" },
  { value: "GRANT_MANUAL_PLAN", label: "Plan manuel" },
  { value: "REVOKE_MANUAL_PLAN", label: "Révoquer plan" },
  { value: "BLOCK_IP", label: "Bloquer IP" },
  { value: "UNBLOCK_IP", label: "Débloquer IP" },
];

const ACTION_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  SUSPEND_USER: { label: "Suspendre", icon: Ban, color: "text-red-600 bg-red-50" },
  UNSUSPEND_USER: { label: "Désuspendre", icon: UserIcon, color: "text-green-600 bg-green-50" },
  RESET_USER_PASSWORD: { label: "Reset password", icon: KeyRound, color: "text-orange-600 bg-orange-50" },
  DELETE_USER: { label: "Supprimer user", icon: Trash2, color: "text-red-700 bg-red-50" },
  UPDATE_USER_ROLE: { label: "Changer rôle", icon: Pencil, color: "text-blue-600 bg-blue-50" },
  GRANT_MANUAL_PLAN: { label: "Plan manuel offert", icon: Award, color: "text-purple-600 bg-purple-50" },
  REVOKE_MANUAL_PLAN: { label: "Révoquer plan manuel", icon: Award, color: "text-gray-600 bg-gray-50" },
  BLOCK_IP: { label: "Bloquer IP", icon: Shield, color: "text-red-600 bg-red-50" },
  UNBLOCK_IP: { label: "Débloquer IP", icon: ShieldOff, color: "text-green-600 bg-green-50" },
  OTHER: { label: "Autre", icon: ScrollText, color: "text-gray-600 bg-gray-50" },
};

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (cursor?: string | null, replace = true) => {
      const params = new URLSearchParams();
      if (action) params.set("action", action);
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "50");

      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setEntries((prev) => (replace ? data.entries : [...prev, ...data.entries]));
      setNextCursor(data.nextCursor);
    },
    [action]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load(null, true).finally(() => setLoading(false));
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Journal d&apos;audit
        </h1>
        <p className="text-gray-500">
          Trace immuable des actions admin sensibles (RGPD/LPD).
        </p>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 flex-wrap">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Action :</span>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          Aucune action admin enregistrée pour ces filtres.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Cible</th>
                <th className="px-4 py-3 font-medium">Détails</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => {
                const meta = ACTION_META[e.action] ?? ACTION_META.OTHER;
                const Icon = meta.icon;
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${meta.color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{e.adminName ?? "—"}</div>
                      <div className="text-xs text-gray-500">{e.adminEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-xs text-gray-500">{e.targetType}</div>
                      <div className="font-mono text-xs">{e.targetLabel ?? e.targetId ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      {e.metadata && Object.keys(e.metadata).length > 0 ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" /> Voir
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap break-words">
                            {JSON.stringify(e.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString("fr-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {e.ipPrefix ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setLoadingMore(true);
              load(nextCursor, false).finally(() => setLoadingMore(false));
            }}
            disabled={loadingMore}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Charger plus
          </button>
        </div>
      )}
    </div>
  );
}
