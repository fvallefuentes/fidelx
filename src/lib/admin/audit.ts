import { prisma } from "@/lib/prisma";
import { extractContext } from "@/lib/anti-abuse/fingerprint";

/**
 * Trace immuable des actions admin sensibles pour conformité LPD/RGPD
 * et investigations de sécurité.
 *
 * Principe :
 * - Fire-and-forget : ne throw jamais (un log raté ne doit jamais bloquer
 *   une action admin légitime).
 * - À appeler APRÈS la mutation réussie (sinon on logue des actions qui
 *   n'ont pas réellement eu lieu).
 * - Le log capture qui (adminId), quoi (action + target), quand (auto),
 *   d'où (IP anonymisée + UA), et optionnellement les détails (metadata).
 */

export type AdminActionType =
  | "SUSPEND_USER"
  | "UNSUSPEND_USER"
  | "RESET_USER_PASSWORD"
  | "GRANT_MANUAL_PLAN"
  | "REVOKE_MANUAL_PLAN"
  | "UPDATE_USER_ROLE"
  | "BLOCK_IP"
  | "UNBLOCK_IP"
  | "DELETE_USER"
  | "OTHER";

export type AdminAuditInput = {
  adminId: string;
  action: AdminActionType;
  targetType: "USER" | "IP" | "PROGRAM" | "OTHER";
  targetId?: string | null;
  /** Label lisible (email, IP) — préservé si la cible est supprimée plus tard. */
  targetLabel?: string | null;
  /** Détails libres : reason, oldValue, newValue, plan, etc. */
  metadata?: Record<string, unknown>;
  /** Request pour extraire IP + UA. Optionnelle (ex: action depuis un cron). */
  req?: Request;
};

/**
 * Loggue une action admin. Ne throw jamais : un échec d'écriture log
 * loggue une erreur console mais ne casse pas le caller.
 */
export async function logAdminAction(input: AdminAuditInput): Promise<void> {
  try {
    const ctx = input.req
      ? extractContext(input.req)
      : { ipPrefix: null, userAgent: null };

    await prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        targetLabel: input.targetLabel ?? null,
        metadata: (input.metadata ?? null) as never,
        ipPrefix: ctx.ipPrefix,
        userAgent: ctx.userAgent,
      },
    });
  } catch (err) {
    console.error(
      "[admin/audit] logAdminAction failed (action=%s, target=%s):",
      input.action,
      input.targetId,
      err
    );
  }
}

/** Type des entrées exposées à l'UI admin. */
export type AdminAuditEntry = {
  id: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string;
  action: AdminActionType | string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  ipPrefix: string | null;
  createdAt: string;
};

/**
 * Liste paginée des entrées audit pour la page /admin/audit.
 * Filtres optionnels : par adminId, action, targetType.
 */
export async function listAdminAuditEntries(opts: {
  adminId?: string;
  action?: string;
  targetType?: string;
  limit?: number;
  cursor?: string;
}): Promise<AdminAuditEntry[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (opts.adminId) where.adminId = opts.adminId;
  if (opts.action) where.action = opts.action;
  if (opts.targetType) where.targetType = opts.targetType;

  const rows = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: {
      admin: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return rows.slice(0, limit).map((r) => ({
    id: r.id,
    adminId: r.adminId,
    adminName: r.admin.name,
    adminEmail: r.admin.email,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    targetLabel: r.targetLabel,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    ipPrefix: r.ipPrefix,
    createdAt: r.createdAt.toISOString(),
  }));
}
