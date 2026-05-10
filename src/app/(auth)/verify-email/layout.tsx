import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vérification email",
  description:
    "Saisissez le code de vérification envoyé par email pour finaliser votre inscription Fidlify.",
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
