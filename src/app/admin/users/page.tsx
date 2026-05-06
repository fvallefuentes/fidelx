"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users as UsersIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shield,
  Briefcase,
  UserCog,
} from "lucide-react";
import { PLAN_LABELS } from "@/lib/plan-labels";

const ACCENT = "#d4ff4e";
const MUTED = "rgba(255,255,255,0.38)";
const BORDER = "rgba(255,255,255,0.08)";
const CARD_BG = "rgba(255,255,255,0.04)";
const VAL_COLOR = "rgba(255,255,255,0.92)";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER" | "STAFF";
  plan: string;
  phone: string | null;
  createdAt: string;
  stripeSubscriptionId: string | null;
  manualPlanUntil: string | null;
  manualPlanReason: string | null;
  employerMerchant: { id: string; name: string | null; email: string } | null;
  cardCount: number;
  _count: { programs: number; staff: number };
}

type SortKey = "name" | "role" | "plan" | "programs" | "clients" | "createdAt";
type SortDir = "asc" | "desc";
type RoleFilter = "all" | "USER" | "STAFF" | "ADMIN";
type PlanFilter = "all" | "FREE" | "ESSENTIAL" | "GROWTH" | "MULTI_SITE";

const PLAN_ORDER: Record<string, number> = {
  FREE: 0,
  ESSENTIAL: 1,
  GROWTH: 2,
  MULTI_SITE: 3,
};
const ROLE_ORDER: Record<string, number> = { ADMIN: 0, USER: 1, STAFF: 2 };

const ROLE_META: Record<
  string,
  { label: string; icon: typeof Shield; color: string; bg: string; border: string }
> = {
  ADMIN: {
    label: "Admin",
    icon: Shield,
    color: "#ff9966",
    bg: "rgba(255,153,102,0.1)",
    border: "rgba(255,153,102,0.2)",
  },
  USER: {
    label: "Commerçant",
    icon: Briefcase,
    color: "#d4ff4e",
    bg: "rgba(212,255,78,0.1)",
    border: "rgba(212,255,78,0.18)",
  },
  STAFF: {
    label: "Staff",
    icon: UserCog,
    color: "#82d8ff",
    bg: "rgba(130,216,255,0.1)",
    border: "rgba(130,216,255,0.2)",
  },
};

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.USER;
  const Icon = meta.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        color: meta.color,
        fontWeight: 600,
      }}
    >
      <Icon size={11} strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      style={{
        background: "rgba(212,255,78,0.1)",
        border: "1px solid rgba(212,255,78,0.18)",
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        color: ACCENT,
        fontWeight: 600,
      }}
    >
      {PLAN_LABELS[plan] ?? plan}
    </span>
  );
}

function SortTh({
  label,
  col,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  col: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right" | "center";
}) {
  const isActive = active === col;
  const Icon = isActive ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      style={{
        padding: "12px 16px",
        textAlign: align,
        color: MUTED,
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      <button
        onClick={() => onSort(col)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: isActive ? ACCENT : MUTED,
          background: "transparent",
          border: 0,
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {label}
        <Icon size={13} style={{ opacity: 0.7 }} />
      </button>
    </th>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = users
    .filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (
        planFilter !== "all" &&
        (u.role !== "USER" || u.plan !== planFilter)
      )
        return false;
      if (!q) return true;
      const name = (u.name ?? "").toLowerCase();
      const email = u.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "role":
          cmp = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
          break;
        case "plan":
          cmp = (PLAN_ORDER[a.plan] ?? 0) - (PLAN_ORDER[b.plan] ?? 0);
          break;
        case "programs":
          cmp = a._count.programs - b._count.programs;
          break;
        case "clients":
          cmp = a.cardCount - b.cardCount;
          break;
        case "createdAt":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const counts = {
    all: users.length,
    USER: users.filter((u) => u.role === "USER").length,
    STAFF: users.filter((u) => u.role === "STAFF").length,
    ADMIN: users.filter((u) => u.role === "ADMIN").length,
  };

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Utilisateurs</h1>
        <p className="dx-page-sub">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""} —{" "}
          {counts.USER} commerçant{counts.USER !== 1 ? "s" : ""},{" "}
          {counts.STAFF} staff, {counts.ADMIN} admin
          {counts.ADMIN !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: MUTED,
            }}
          />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 14px 11px 38px",
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              background: CARD_BG,
              color: VAL_COLOR,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: MUTED, marginRight: 6 }}>
            Rôle :
          </span>
          {(
            [
              { val: "all", label: `Tous (${counts.all})` },
              { val: "USER", label: `Commerçants (${counts.USER})` },
              { val: "STAFF", label: `Staff (${counts.STAFF})` },
              { val: "ADMIN", label: `Admins (${counts.ADMIN})` },
            ] as { val: RoleFilter; label: string }[]
          ).map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setRoleFilter(val)}
              style={{
                fontSize: 12,
                padding: "5px 11px",
                borderRadius: 999,
                border: "1px solid",
                cursor: "pointer",
                fontFamily: "inherit",
                ...(roleFilter === val
                  ? {
                      background: ACCENT,
                      color: "#0a0d04",
                      borderColor: ACCENT,
                      fontWeight: 600,
                    }
                  : {
                      background: "transparent",
                      borderColor: "rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.5)",
                    }),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {(roleFilter === "all" || roleFilter === "USER") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: MUTED, marginRight: 6 }}>
              Plan :
            </span>
            {(
              [
                { val: "all", label: "Tous" },
                { val: "FREE", label: "Gratuit" },
                { val: "ESSENTIAL", label: "Essentiel" },
                { val: "GROWTH", label: "Croissance" },
                { val: "MULTI_SITE", label: "Multi-sites" },
              ] as { val: PlanFilter; label: string }[]
            ).map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setPlanFilter(val)}
                style={{
                  fontSize: 12,
                  padding: "5px 11px",
                  borderRadius: 999,
                  border: "1px solid",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  ...(planFilter === val
                    ? {
                        background: ACCENT,
                        color: "#0a0d04",
                        borderColor: ACCENT,
                        fontWeight: 600,
                      }
                    : {
                        background: "transparent",
                        borderColor: "rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.5)",
                      }),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
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
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: "60px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <UsersIcon size={36} color={MUTED} strokeWidth={1.5} />
          <p
            style={{
              marginTop: 14,
              color: VAL_COLOR,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {search || roleFilter !== "all" || planFilter !== "all"
              ? "Aucun résultat"
              : "Aucun utilisateur"}
          </p>
          <p style={{ marginTop: 4, color: MUTED, fontSize: 13 }}>
            {search || roleFilter !== "all" || planFilter !== "all"
              ? "Essayez d'ajuster les filtres"
              : "Aucun compte n'est encore inscrit"}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <SortTh
                    label="Nom"
                    col="name"
                    active={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th
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
                    Email
                  </th>
                  <SortTh
                    label="Rôle"
                    col="role"
                    active={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label="Plan / Employeur"
                    col="plan"
                    active={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label="Programmes"
                    col="programs"
                    active={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                  <SortTh
                    label="Clients"
                    col="clients"
                    active={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                  <SortTh
                    label="Inscrit le"
                    col="createdAt"
                    active={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: MUTED,
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom:
                        i < filtered.length - 1
                          ? `1px solid rgba(255,255,255,0.06)`
                          : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        color: VAL_COLOR,
                        fontWeight: 500,
                      }}
                    >
                      {u.name || "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "rgba(255,255,255,0.55)",
                      }}
                    >
                      {u.email}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <RoleBadge role={u.role} />
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {u.role === "USER" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <PlanBadge plan={u.plan} />
                          {u.manualPlanUntil && (
                            <span
                              title={`Plan offert${u.manualPlanReason ? ` — ${u.manualPlanReason}` : ""} jusqu'au ${new Date(u.manualPlanUntil).toLocaleDateString("fr-CH")}`}
                              style={{
                                fontSize: 10,
                                padding: "2px 7px",
                                borderRadius: 20,
                                background: "rgba(255,200,80,0.12)",
                                border: "1px solid rgba(255,200,80,0.25)",
                                color: "#ffc850",
                                fontWeight: 600,
                              }}
                            >
                              MANUEL
                            </span>
                          )}
                        </span>
                      ) : u.role === "STAFF" ? (
                        u.employerMerchant ? (
                          <span
                            style={{
                              fontSize: 12,
                              color: "rgba(255,255,255,0.55)",
                            }}
                          >
                            {u.employerMerchant.name ||
                              u.employerMerchant.email}
                          </span>
                        ) : (
                          <span style={{ color: MUTED, fontSize: 12 }}>—</span>
                        )
                      ) : (
                        <span style={{ color: MUTED, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: u.role === "USER" ? ACCENT : MUTED,
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      {u.role === "USER" ? u._count.programs : "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: u.role === "USER" ? ACCENT : MUTED,
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      {u.role === "USER" ? u.cardCount : "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 12,
                      }}
                    >
                      {new Date(u.createdAt).toLocaleDateString("fr-CH")}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link
                        href={`/admin/users/${u.id}`}
                        style={{
                          display: "inline-block",
                          padding: "6px 14px",
                          borderRadius: 8,
                          background: "rgba(212,255,78,0.1)",
                          border: "1px solid rgba(212,255,78,0.2)",
                          color: ACCENT,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
