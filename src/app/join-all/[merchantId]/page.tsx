import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LogoMark from "@/components/landing/LogoMark";
import JoinAllForm from "@/components/join-all/JoinAllForm";

export const metadata: Metadata = {
  title: "Rejoindre les cartes de fidélité",
  robots: { index: false, follow: false },
};

/** Construit un label de récompense lisible à partir du programme. */
function buildRewardLabel(program: {
  type: string;
  config: Record<string, unknown>;
  rewards: { name: string; threshold: number }[];
}): string {
  if (program.rewards.length > 0) {
    const r = program.rewards[0];
    return `${r.name} (${r.threshold} ${program.type === "POINTS" ? "points" : "tampons"})`;
  }
  const config = program.config as Record<string, unknown>;
  if (program.type === "STAMPS" || program.type === "HYBRID") {
    const max = (config.maxStamps as number) || 10;
    return `Récompense après ${max} tampons`;
  }
  if (program.type === "POINTS") {
    return `Récompense en points`;
  }
  return `Carte de fidélité`;
}

export default async function JoinAllPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;

  const merchant = await prisma.user.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      name: true,
      suspendedAt: true,
      programs: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          config: true,
          rewards: { select: { name: true, threshold: true }, orderBy: { threshold: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!merchant || merchant.suspendedAt) {
    notFound();
  }

  const programs = merchant.programs.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    rewardLabel: buildRewardLabel({
      type: p.type,
      config: p.config as Record<string, unknown>,
      rewards: p.rewards,
    }),
  }));

  if (programs.length === 0) {
    return (
      <div className="join-shell">
        <div className="join-main">
          <header className="join-brand-bar">
            <Link href="/" className="join-brand">
              <LogoMark size={32} />
              <span>FIDLIFY</span>
            </Link>
          </header>
          <div className="join-card">
            <div className="join-eyebrow">
              <span className="join-dot" /> {merchant.name ?? "Commerce"}
            </div>
            <h1 className="join-h1">Aucun programme disponible</h1>
            <p className="join-sub">
              Ce commerçant n&apos;a pas encore de programme de fidélité actif.
              Revenez bientôt !
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-shell">
      <div className="join-main">
        <header className="join-brand-bar">
          <Link href="/" className="join-brand">
            <LogoMark size={32} />
            <span>FIDLIFY</span>
          </Link>
        </header>

        <div className="join-card">
          <div className="join-eyebrow">
            <span className="join-dot" /> {merchant.name ?? "Commerce"}
          </div>

          <JoinAllForm
            merchantId={merchant.id}
            merchantName={merchant.name ?? "ce commerce"}
            programs={programs}
          />

          <p className="join-fineprint">
            En vous inscrivant, vous acceptez que vos données soient utilisées
            pour la gestion de votre carte de fidélité, conformément à la{" "}
            <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
          </p>
        </div>
      </div>

      <footer className="join-footer">
        <Link href="/" className="join-brand-tiny">
          <LogoMark size={20} />
          <span>FIDLIFY</span>
        </Link>
        <span>Fait en Suisse romande 🇨🇭</span>
      </footer>
    </div>
  );
}
