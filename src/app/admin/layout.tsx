import Link from "next/link";
import LogoMark from "@/components/landing/LogoMark";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0d04", color: "#fff" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <LogoMark size={28} />
        <span style={{ fontWeight: 700, letterSpacing: "0.06em", fontSize: 15 }}>FIDLIFY ADMIN</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          <Link href="/dashboard" style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</Link>
        </span>
      </header>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
    </div>
  );
}
