"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/* ─── Loyalty card (visual mock) ─────────────────────────── */
function LoyaltyCard({
  shop,
  cardName,
  rewardText,
  filled = 6,
  total = 10,
}: {
  shop: string;
  cardName: string;
  rewardText: string;
  filled?: number;
  total?: number;
}) {
  return (
    <div className="loy-card">
      <div className="loy-head">
        <div className="loy-brand">FIDLIFY · WALLET</div>
        <div className="loy-icon" />
      </div>
      <div className="loy-name">{cardName}</div>
      <div className="loy-shop">{shop}</div>
      <div className="loy-stamps">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`loy-stamp${i < filled ? " full" : ""}`}>
            {i < filled ? "★" : ""}
          </div>
        ))}
      </div>
      <div className="loy-foot">
        <div className="loy-progress">
          <strong>{filled}</strong>/{total} · {rewardText}
        </div>
        <div className="loy-qr" />
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────── */
export default function SectionDemo() {
  const [active, setActive] = useState(0);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const t = useTranslations("Landing.demoSection");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.idx);
            setActive(i);
          }
        });
      },
      { threshold: 0.5, rootMargin: "-30% 0px -30% 0px" }
    );
    itemsRef.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const steps = t.raw("steps") as Array<{ title: string; body: string }>;
  const cardName = t("cardName");
  const rewardText = t("rewardText");

  const visuals = [
    <div key="0" style={{ display: "flex", justifyContent: "center" }}>
      <LoyaltyCard shop={t("shops.yourShop")} cardName={cardName} rewardText={rewardText} filled={0} total={10} />
    </div>,
    <div
      key="1"
      style={{
        width: 200,
        height: 200,
        borderRadius: 22,
        background: "#fff",
        padding: 18,
        boxShadow: "0 0 60px rgba(212,255,78,0.3)",
      }}
    >
      <div className="loy-qr" style={{ width: "100%", height: "100%" }} />
    </div>,
    <div
      key="2"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          color: "#8a8e84",
          fontSize: 13,
          fontFamily: "var(--font-geist-mono, monospace)",
        }}
      >
        {/* Apple icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20.94c1.5 0 2.75-.65 3.5-1.5 1.7-1.95 3.5-4.94 3.5-7.5 0-2.5-2-4.5-4.5-4.5-1.5 0-3 .94-3 .94S10 7.44 8.5 7.44C6 7.44 4 9.44 4 11.94c0 2.56 1.8 5.55 3.5 7.5.75.85 2 1.5 3.5 1.5" />
          <path d="M10 5c0-1.5 1-3 3-3" />
        </svg>
        <span>+</span>
        {/* Google icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.8 10H12v4h5.6c-.5 2.5-2.5 4-5.6 4a6 6 0 1 1 0-12c1.5 0 2.8.5 3.8 1.5l3-3A10 10 0 1 0 12 22c5.5 0 10-4 10-10 0-.7-.1-1.3-.2-2Z" />
        </svg>
      </div>
      <LoyaltyCard shop={t("shops.cafe")} cardName={cardName} rewardText={rewardText} filled={1} total={10} />
    </div>,
    <div key="3" style={{ width: 300, display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(14px)",
          padding: "14px 16px",
          display: "flex",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "#d4ff4e",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0a0d04",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 0 20px rgba(212,255,78,0.5)",
          }}
        >
          F
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#f4f5f1",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span>{t("shops.cafe")}</span>
            <span style={{ fontSize: 11, color: "#8a8e84", fontWeight: 400 }}>
              {t("now")}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#c9ccc3", lineHeight: 1.35 }}>
            {t("offer")}
          </div>
        </div>
      </div>
    </div>,
    <div key="4" style={{ display: "flex", justifyContent: "center" }}>
      <LoyaltyCard shop={t("shops.cafe")} cardName={cardName} rewardText={rewardText} filled={9} total={10} />
    </div>,
  ];

  return (
    <section className="section" id="demo">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow">
            <span className="dot" />
            <span>{t("eyebrow")}</span>
          </div>
          <h2 className="h-section">
            {t("titleA")} <span className="accent">{t("titleB")}</span>
          </h2>
          <p className="lede">{t("lede")}</p>
        </div>

        <div className="demo-grid" style={{ marginTop: 80 }}>
          <div className="demo-stage">{visuals[active]}</div>

          <div className="timeline">
            {steps.map((s, i) => (
              <div
                key={i}
                ref={(el) => {
                  itemsRef.current[i] = el;
                }}
                data-idx={i}
                className={`timeline-item${active === i ? " active" : ""}`}
              >
                <span className="step">
                  — {t("stepLabel")} {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
