import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — Espace commerçant",
  description:
    "Connectez-vous à votre espace Fidlify pour gérer vos cartes de fidélité digitales, vos clients, vos campagnes et vos statistiques.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
