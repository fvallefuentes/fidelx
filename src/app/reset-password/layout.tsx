import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe",
  description: "Définir un nouveau mot de passe pour votre compte Fidlify.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
