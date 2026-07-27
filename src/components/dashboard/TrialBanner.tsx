"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlanStateResponse = {
  state: "TRIAL" | "DORMANT" | "FREE" | "ESSENTIAL" | "GROWTH" | "MULTI_SITE";
  daysLeft: number;
  trialEndsAt: string | null;
};

/**
 * Bandeau d'essai / mode veille.
 *
 * Volontairement discret pendant l'essai (on ne harcèle pas quelqu'un qui
 * découvre le produit), puis explicite à l'approche de l'échéance, et enfin
 * rassurant en mode veille : le commerçant doit comprendre immédiatement que
 * les cartes de ses clients continuent de fonctionner.
 */
export default function TrialBanner() {
  const [info, setInfo] = useState<PlanStateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/merchants/plan-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setInfo(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;
  if (info.state !== "TRIAL" && info.state !== "DORMANT") return null;

  const dormant = info.state === "DORMANT";
  const urgent = !dormant && info.daysLeft <= 3;

  const accent = dormant ? "var(--danger)" : urgent ? "var(--warn)" : "var(--accent)";
  const jours = info.daysLeft === 1 ? "1 jour" : `${info.daysLeft} jours`;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        margin: "0 0 18px",
        padding: "13px 16px",
        borderRadius: 14,
        border: "1px solid var(--line-2)",
        background: "var(--bg-2)",
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 340px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
          {dormant
            ? "Votre essai est terminé — programme en pause"
            : `Essai gratuit — ${jours} restants`}
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
          {dormant ? (
            <>
              Les cartes déjà installées chez vos clients continuent de
              fonctionner et de cumuler des tampons. En revanche, vous ne pouvez
              plus enregistrer de nouveaux clients ni envoyer de campagne.
            </>
          ) : (
            <>
              Vous avez accès à toutes les fonctionnalités. À la fin de l&apos;essai,
              vos cartes resteront actives pour vos clients, mais vous ne pourrez
              plus en créer de nouvelles.
            </>
          )}
        </div>
      </div>

      <Link
        href="/dashboard/settings"
        style={{
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          minHeight: 38,
          padding: "0 16px",
          borderRadius: 10,
          background: "var(--accent)",
          color: "#0a0d04",
          fontSize: 13.5,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        {dormant ? "Réactiver mon programme" : "Choisir un plan"}
      </Link>
    </div>
  );
}
