import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Essayer Fidlify gratuitement — Carte de fidélité digitale",
  description:
    "Créez gratuitement votre carte de fidélité digitale Apple Wallet et Google Wallet en 3 minutes. Sans carte bancaire, sans engagement, support en français.",
  alternates: { canonical: "/register" },
  openGraph: {
    title: "Essayer Fidlify gratuitement — Carte de fidélité digitale",
    description:
      "Créez votre programme de fidélité digital pour commerçants en 3 minutes. Sans application à télécharger.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
