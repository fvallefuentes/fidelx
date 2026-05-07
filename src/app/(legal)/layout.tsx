import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";

export default function LegalGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing">
      <div className="ambient" />
      <div className="grid-overlay" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav />
        {children}
        <Footer />
      </div>
    </div>
  );
}
