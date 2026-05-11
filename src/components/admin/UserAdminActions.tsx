"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  Check,
  Copy,
  KeyRound,
  Loader2,
  RotateCcw,
  ShieldOff,
  AlertTriangle,
  ScrollText,
  X,
} from "lucide-react";

type LoginLog = {
  id: string;
  email: string;
  ipPrefix: string | null;
  userAgent: string | null;
  result:
    | "SUCCESS"
    | "WRONG_PASSWORD"
    | "USER_NOT_FOUND"
    | "EMAIL_NOT_VERIFIED"
    | "SUSPENDED"
    | "ERROR";
  reason: string | null;
  createdAt: string;
};

const RESULT_COLORS: Record<LoginLog["result"], string> = {
  SUCCESS: "#d4ff4e",
  WRONG_PASSWORD: "#ff7a6b",
  USER_NOT_FOUND: "#ff7a6b",
  EMAIL_NOT_VERIFIED: "#ffd66b",
  SUSPENDED: "#ff7a6b",
  ERROR: "#ff7a6b",
};
const RESULT_LABELS: Record<LoginLog["result"], string> = {
  SUCCESS: "Succès",
  WRONG_PASSWORD: "Mauvais MDP",
  USER_NOT_FOUND: "Compte inexistant",
  EMAIL_NOT_VERIFIED: "Email non vérifié",
  SUSPENDED: "Suspendu",
  ERROR: "Erreur",
};

/**
 * Panneau d'actions admin pour un user spécifique :
 * - Suspendre / Désuspendre (toggle)
 * - Générer un lien de reset password (copy-paste à l'utilisateur)
 * - Voir l'historique des 100 dernières connexions
 */
export function UserAdminActions({
  userId,
  email,
  role,
  suspendedAt,
  suspendedReason,
  onUpdated,
}: {
  userId: string;
  email: string;
  role: "ADMIN" | "USER" | "STAFF";
  suspendedAt: string | null;
  suspendedReason: string | null;
  onUpdated: () => void;
}) {
  const [suspending, setSuspending] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [suspendReasonInput, setSuspendReasonInput] = useState("");

  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [copied, setCopied] = useState(false);

  const [showLogs, setShowLogs] = useState(false);

  const isAdmin = role === "ADMIN";
  const isSuspended = !!suspendedAt;

  async function handleSuspend() {
    setSuspending(true);
    const res = await fetch(`/api/admin/users/${userId}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: suspendReasonInput.trim() || undefined }),
    });
    setSuspending(false);
    if (res.ok) {
      setShowSuspendConfirm(false);
      setSuspendReasonInput("");
      onUpdated();
    }
  }

  async function handleUnsuspend() {
    setSuspending(true);
    const res = await fetch(`/api/admin/users/${userId}/suspend`, {
      method: "DELETE",
    });
    setSuspending(false);
    if (res.ok) onUpdated();
  }

  async function handleGenerateReset() {
    setResetLoading(true);
    setResetError("");
    setResetLink(null);
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
    });
    setResetLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error || "Erreur");
      return;
    }
    setResetLink(data.resetUrl);
  }

  function handleCopy() {
    if (!resetLink) return;
    navigator.clipboard.writeText(resetLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="user-admin-actions">
      <h3 className="user-admin-actions-title">Actions admin</h3>

      {/* Suspension status banner */}
      {isSuspended && (
        <div className="user-admin-banner-suspended">
          <AlertTriangle size={14} />
          <div>
            <strong>Compte suspendu</strong>
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>
              {suspendedReason || "Aucune raison renseignée"}
              <br />
              Depuis le{" "}
              {new Date(suspendedAt!).toLocaleString("fr-CH", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Action 1 : Reset password */}
      <div className="user-admin-action-row">
        <div className="user-admin-action-meta">
          <KeyRound size={14} />
          <div>
            <div className="user-admin-action-label">
              Réinitialiser le mot de passe
            </div>
            <div className="user-admin-action-sub">
              Génère un lien à transmettre à l&apos;utilisateur (valide 24h)
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerateReset}
          disabled={resetLoading}
          className="user-admin-btn user-admin-btn-ghost"
        >
          {resetLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <KeyRound size={12} />
          )}
          Générer un lien
        </button>
      </div>

      {resetError && (
        <div className="user-admin-error">{resetError}</div>
      )}

      {resetLink && (
        <div className="user-admin-reset-link">
          <p className="user-admin-action-sub" style={{ marginBottom: 6 }}>
            Lien généré ✓ — Transmettez-le à <strong>{email}</strong> par email,
            SMS ou autre canal sécurisé. Valide 24h.
          </p>
          <div className="user-admin-reset-url">{resetLink}</div>
          <button
            type="button"
            onClick={handleCopy}
            className="user-admin-btn user-admin-btn-primary"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copié" : "Copier le lien"}
          </button>
        </div>
      )}

      {/* Action 2 : Suspendre / Désuspendre */}
      {!isAdmin && (
        <div className="user-admin-action-row">
          <div className="user-admin-action-meta">
            {isSuspended ? <RotateCcw size={14} /> : <Ban size={14} />}
            <div>
              <div className="user-admin-action-label">
                {isSuspended
                  ? "Réactiver le compte"
                  : "Suspendre le compte"}
              </div>
              <div className="user-admin-action-sub">
                {isSuspended
                  ? "L'utilisateur pourra se reconnecter immédiatement"
                  : "Empêche la connexion. Les données sont préservées."}
              </div>
            </div>
          </div>
          {isSuspended ? (
            <button
              type="button"
              onClick={handleUnsuspend}
              disabled={suspending}
              className="user-admin-btn user-admin-btn-primary"
            >
              {suspending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              Réactiver
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSuspendConfirm(true)}
              className="user-admin-btn user-admin-btn-danger"
            >
              <Ban size={12} /> Suspendre
            </button>
          )}
        </div>
      )}

      {/* Suspend confirm modal inline */}
      {showSuspendConfirm && !isSuspended && (
        <div className="user-admin-suspend-confirm">
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#c9ccc3" }}>
            Raison de la suspension (optionnel mais recommandé) :
          </p>
          <input
            type="text"
            value={suspendReasonInput}
            onChange={(e) => setSuspendReasonInput(e.target.value)}
            placeholder="Ex: Activité suspecte, non-paiement, demande user…"
            className="user-admin-input"
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setShowSuspendConfirm(false);
                setSuspendReasonInput("");
              }}
              className="user-admin-btn user-admin-btn-ghost"
            >
              <X size={12} /> Annuler
            </button>
            <button
              type="button"
              onClick={handleSuspend}
              disabled={suspending}
              className="user-admin-btn user-admin-btn-danger"
            >
              {suspending ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
              Confirmer la suspension
            </button>
          </div>
        </div>
      )}

      {/* Action 3 : Voir les logs de connexion */}
      <div className="user-admin-action-row">
        <div className="user-admin-action-meta">
          <ScrollText size={14} />
          <div>
            <div className="user-admin-action-label">
              Historique des connexions
            </div>
            <div className="user-admin-action-sub">
              100 dernières tentatives (succès et échecs)
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLogs((v) => !v)}
          className="user-admin-btn user-admin-btn-ghost"
        >
          <ScrollText size={12} />
          {showLogs ? "Masquer" : "Afficher"}
        </button>
      </div>

      {showLogs && <LoginLogsTable userId={userId} />}
    </div>
  );
}

function LoginLogsTable({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<LoginLog[] | null>(null);
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users/${userId}/login-logs`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <Loader2 size={18} className="animate-spin inline-block" />
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="user-admin-logs-empty">
        Aucune tentative de connexion enregistrée pour ce compte.
      </div>
    );
  }

  return (
    <div className="user-admin-logs-table-wrap">
      <table className="user-admin-logs-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Résultat</th>
            <th>IP</th>
            <th>User-Agent</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="user-admin-logs-date">
                {new Date(log.createdAt).toLocaleString("fr-CH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td>
                <span
                  className="user-admin-logs-result"
                  style={{
                    color: RESULT_COLORS[log.result],
                    background: `${RESULT_COLORS[log.result]}1a`,
                    border: `1px solid ${RESULT_COLORS[log.result]}3a`,
                  }}
                >
                  {RESULT_LABELS[log.result]}
                </span>
              </td>
              <td className="user-admin-logs-ip">
                {log.ipPrefix || <span style={{ color: "#565a52" }}>—</span>}
              </td>
              <td className="user-admin-logs-ua">
                {log.userAgent ? (
                  <span title={log.userAgent}>
                    {log.userAgent.slice(0, 50)}
                    {log.userAgent.length > 50 ? "…" : ""}
                  </span>
                ) : (
                  <span style={{ color: "#565a52" }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
