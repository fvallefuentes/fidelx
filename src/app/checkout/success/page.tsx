"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoMark from "@/components/landing/LogoMark";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [status, setStatus] = useState<"waiting" | "ready">("waiting");

  useEffect(() => {
    let attempts = 0;
    const MAX = 20; // 20s max

    const poll = async () => {
      const updated = await update();
      const plan = (updated?.user as { plan?: string })?.plan ?? "FREE";

      if (plan !== "FREE") {
        setStatus("ready");
        router.push("/dashboard");
        return;
      }

      attempts++;
      if (attempts < MAX) {
        setTimeout(poll, 1000);
      } else {
        // Timeout — redirige quand même, la page dashboard relit la DB au chargement
        router.push("/dashboard");
      }
    };

    // Petit délai initial pour laisser le temps au webhook Stripe d'arriver
    setTimeout(poll, 1500);
  }, [router, update]);

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
          {status === "waiting"
            ? "Activation de votre abonnement en cours…"
            : "Abonnement actif ! Redirection…"}
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "3px solid #d4ff4e", borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite"
          }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
