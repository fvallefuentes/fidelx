import type { Metadata } from "next";
import { TrialBannerView } from "@/components/dashboard/TrialBanner";

/**
 * PAGE TEMPORAIRE — aperçu visuel du bandeau d'essai / mode veille.
 *
 * Sert uniquement à contrôler le rendu des trois états sans session
 * authentifiée. À supprimer une fois la vérification faite.
 */
export const metadata: Metadata = {
  title: "Aperçu bandeau",
  robots: { index: false, follow: false },
};

const etats = [
  { titre: "Essai en cours (20 jours restants)", state: "TRIAL" as const, daysLeft: 20 },
  { titre: "Essai bientôt terminé (2 jours) — passage en urgence", state: "TRIAL" as const, daysLeft: 2 },
  { titre: "Mode veille (essai terminé)", state: "DORMANT" as const, daysLeft: 0 },
];

export default function ApercuBandeauPage() {
  return (
    <div className="dashboard" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ color: "var(--ink)", fontSize: 22, marginBottom: 6 }}>
          Aperçu du bandeau d&apos;essai
        </h1>
        <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 30 }}>
          Rendu réel du composant, dans ses trois états. Page temporaire.
        </p>

        {etats.map((e) => (
          <div key={e.titre} style={{ marginBottom: 30 }}>
            <div
              style={{
                color: "var(--ink-3)",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              {e.titre}
            </div>
            <TrialBannerView state={e.state} daysLeft={e.daysLeft} />
          </div>
        ))}
      </div>
    </div>
  );
}
