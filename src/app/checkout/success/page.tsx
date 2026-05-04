"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoMark from "@/components/landing/LogoMark";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(t);
          router.push("/dashboard");
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="landing auth-shell">
      <div className="ambient" />
      <div className="grid-overlay" />
      <div className="auth-card" style={{ textAlign: "center", gap: 24 }}>
        <div className="auth-head">
          <Link href="/" className="auth-brand">
            <LogoMark size={36} />
            <span>FIDLIFY</span>
          </Link>
        </div>
        <div style={{ fontSize: 48 }}>✓</div>
        <h1 className="auth-title" style={{ color: "#d4ff4e" }}>Paiement confirmé !</h1>
        <p className="auth-desc">
          Votre abonnement est actif. Redirection vers le dashboard dans {seconds}s…
        </p>
        <Link href="/dashboard" className="auth-submit" style={{ display: "inline-flex", justifyContent: "center" }}>
          Aller au dashboard
        </Link>
      </div>
    </div>
  );
}
