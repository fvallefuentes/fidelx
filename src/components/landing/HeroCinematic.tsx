"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const prog = Math.max(0, Math.min(1, -rect.top / total));
      setP(prog);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);
  return p;
}

function tween(p: number, frames: { at: number; val: number }[]) {
  if (p <= frames[0].at) return frames[0].val;
  if (p >= frames[frames.length - 1].at) return frames[frames.length - 1].val;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i], b = frames[i + 1];
    if (p >= a.at && p <= b.at) {
      const t = (p - a.at) / (b.at - a.at);
      const e = t * t * (3 - 2 * t);
      return a.val + (b.val - a.val) * e;
    }
  }
  return frames[frames.length - 1].val;
}

function PremiumCard() {
  return (
    <div className="hcc-card">
      <div className="hcc-card-inner">
        <div className="hcc-card-shine" />
        <div className="hcc-card-grain" />
        <div className="hcc-card-head">
          <div className="hcc-card-mark">
            <span className="hcc-card-glyph" />
            <span className="hcc-card-name">FIDLIFY</span>
          </div>
          <div className="hcc-card-chip" />
        </div>
        <div className="hcc-card-mid">
          <div className="hcc-card-lbl">CARTE DE FIDÉLITÉ</div>
          <div className="hcc-card-shop">Café Lumen</div>
        </div>
        <div className="hcc-card-foot">
          <div>
            <div className="hcc-card-lbl">PROGRESSION</div>
            <div className="hcc-card-progress">
              <div className="hcc-card-progress-fill" />
            </div>
          </div>
          <div className="hcc-card-num">06 / 10</div>
        </div>
      </div>
      <div className="hcc-card-edge" />
    </div>
  );
}

export default function HeroCinematic() {
  const containerRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(containerRef);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const titleOpacity = tween(p, [{ at: 0, val: 1 }, { at: 0.35, val: 1 }, { at: 0.55, val: 0 }]);
  const titleY = tween(p, [{ at: 0, val: 0 }, { at: 0.55, val: -30 }]);
  const finalOpacity = tween(p, [{ at: 0.78, val: 0 }, { at: 0.92, val: 1 }]);
  const finalY = tween(p, [{ at: 0.78, val: 24 }, { at: 0.92, val: 0 }]);
  const cardScale = tween(p, [{ at: 0, val: 1 }, { at: 0.25, val: 1.08 }, { at: 0.5, val: 0.95 }, { at: 0.75, val: 0.7 }, { at: 1, val: 0.7 }]);
  const cardX = tween(p, [{ at: 0, val: 0 }, { at: 0.5, val: 0 }, { at: 0.75, val: 130 }, { at: 1, val: 130 }]);
  const cardY = tween(p, [{ at: 0, val: 0 }, { at: 0.75, val: 30 }, { at: 1, val: 30 }]);
  const cardRotY = tween(p, [{ at: 0, val: -8 }, { at: 0.25, val: -2 }, { at: 0.5, val: 6 }, { at: 0.75, val: -4 }, { at: 1, val: -4 }]);
  const cardRotX = tween(p, [{ at: 0, val: 6 }, { at: 0.5, val: 2 }, { at: 0.75, val: 0 }]);
  const cardZ = tween(p, [{ at: 0, val: 0 }, { at: 0.25, val: 80 }, { at: 0.5, val: 40 }, { at: 0.75, val: 60 }, { at: 1, val: 60 }]);
  const cardGlow = tween(p, [{ at: 0, val: 0.35 }, { at: 0.25, val: 0.7 }, { at: 0.5, val: 0.5 }, { at: 0.75, val: 0.6 }, { at: 1, val: 0.5 }]);
  const phoneOpacity = tween(p, [{ at: 0.4, val: 0 }, { at: 0.62, val: 1 }]);
  const phoneScale = tween(p, [{ at: 0.4, val: 0.9 }, { at: 0.62, val: 1 }, { at: 1, val: 1 }]);
  const phoneBlur = tween(p, [{ at: 0.4, val: 14 }, { at: 0.62, val: 0 }]);
  const phoneX = tween(p, [{ at: 0.4, val: -30 }, { at: 0.75, val: -110 }, { at: 1, val: -110 }]);
  const phoneY = tween(p, [{ at: 0.4, val: 20 }, { at: 0.62, val: 0 }]);
  const phoneRotY = tween(p, [{ at: 0.4, val: 8 }, { at: 1, val: 6 }]);
  const notifOpacity = tween(p, [{ at: 0.7, val: 0 }, { at: 0.85, val: 1 }, { at: 1, val: 1 }]);
  const notifX = tween(p, [{ at: 0.7, val: -30 }, { at: 0.85, val: 0 }]);
  const notifY = tween(p, [{ at: 0.7, val: 20 }, { at: 0.85, val: 0 }]);
  const ambient = tween(p, [{ at: 0, val: 0.35 }, { at: 0.3, val: 0.7 }, { at: 0.7, val: 0.55 }, { at: 1, val: 0.5 }]);
  const ctaOpacity = tween(p, [{ at: 0, val: 1 }, { at: 0.35, val: 1 }, { at: 0.5, val: 0 }]);
  const ctaY = tween(p, [{ at: 0, val: 0 }, { at: 0.5, val: -20 }]);
  const cueOpacity = tween(p, [{ at: 0, val: 1 }, { at: 0.06, val: 1 }, { at: 0.18, val: 0 }]);

  const introCls = mounted ? "in" : "";

  return (
    <section ref={containerRef} className="hcc-container" id="top">
      <div className="hcc-halo" style={{ opacity: ambient }} />
      <div className="hcc-dust">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} style={{
            ["--x" as string]: `${(i * 71 + 13) % 100}%`,
            ["--y" as string]: `${(i * 47 + 21) % 100}%`,
            ["--d" as string]: `${10 + (i % 5) * 2}s`,
            ["--del" as string]: `${(i % 7) * 0.6}s`,
          }} />
        ))}
      </div>

      <div className="hcc-sticky">
        {/* Title */}
        <div
          className={`hcc-title-wrap ${introCls}`}
          style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
        >
          <h1 className="h-display hcc-title">
            <span className="hcc-line"><span>Transformez chaque client</span></span>
            <span className="hcc-line"><span>en <em className="hcc-accent">client fidèle.</em></span></span>
          </h1>
          <p className="hcc-lede">
            Créez des cartes de fidélité digitales pour Apple Wallet et Google Wallet,
            envoyez des notifications ciblées et augmentez vos ventes sans application à télécharger.
          </p>
          <div
            className="hcc-cta-row"
            style={{ opacity: ctaOpacity, transform: `translateY(${ctaY}px)` }}
          >
            <Link href="/register" className="hcc-btn-primary" style={{ color: "#0a0d04" }}>
              Créer ma carte fidélité
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0d04" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="#demo" className="hcc-btn-ghost">
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(212,255,78,0.15)", border: "1px solid rgba(212,255,78,0.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#d4ff4e" }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3v18l15-9Z" /></svg>
              </span>
              Voir la démo
            </Link>
          </div>
        </div>

        {/* 3D Stage */}
        <div className="hcc-stage">
          {/* Phone */}
          <div
            className="hcc-phone-wrap"
            style={{
              opacity: phoneOpacity,
              filter: `blur(${phoneBlur}px)`,
              transform: `translate3d(calc(-50% + ${phoneX}px), calc(-50% + ${phoneY}px), 0) scale(${phoneScale}) rotateY(${phoneRotY}deg)`,
            }}
          >
            <div className="hcc-phone">
              <div className="hcc-phone-screen">
                <div className="hcc-phone-notch" />
                <div className="hcc-phone-status">
                  <span>9:41</span>
                  <svg width="12" height="8" viewBox="0 0 14 10" fill="currentColor">
                    <rect x="0" y="6" width="2" height="4" rx="1" /><rect x="4" y="4" width="2" height="6" rx="1" /><rect x="8" y="2" width="2" height="8" rx="1" /><rect x="12" y="0" width="2" height="10" rx="1" />
                  </svg>
                </div>
                <div className="hcc-wallet-label">Wallet</div>
              </div>
            </div>
          </div>

          {/* Card */}
          <div
            className="hcc-card-wrap"
            style={{
              ["--card-glow" as string]: cardGlow,
              transform: `translate3d(calc(-50% + ${cardX}px), calc(-50% + ${cardY}px), ${cardZ}px) scale(${cardScale}) rotateY(${cardRotY}deg) rotateX(${cardRotX}deg)`,
            }}
          >
            <PremiumCard />
          </div>

          {/* Notification */}
          <div
            className="hcc-notif"
            style={{
              opacity: notifOpacity,
              transform: `translate3d(calc(-50% + ${notifX}px), calc(-50% + ${notifY}px), 0)`,
            }}
          >
            <div className="hcc-notif-inner">
              <div className="hcc-notif-bar" />
              <div className="hcc-notif-body">
                <div className="hcc-notif-head">
                  <div className="hcc-notif-ic">F</div>
                  <div className="hcc-notif-meta">
                    <div className="hcc-notif-app">FIDLIFY · CAFÉ LUMEN</div>
                    <div className="hcc-notif-time">maintenant</div>
                  </div>
                </div>
                <div className="hcc-notif-msg">Votre prochaine visite est offerte. À tout de suite ☕</div>
              </div>
            </div>
          </div>
        </div>

        {/* Final phrase */}
        <div
          className="hcc-final"
          style={{ opacity: finalOpacity, transform: `translateY(${finalY}px)` }}
        >
          <p>
            <em>Une carte dans le Wallet.</em><br />
            <span style={{ color: "#d4ff4e" }}>Un lien direct avec vos clients.</span>
          </p>
        </div>

        {/* Scroll cue */}
        <div className="hcc-cue" style={{ opacity: cueOpacity }}>
          <span className="hcc-cue-line" />
          <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.18em", color: "#8a8e84" }}>SCROLL</span>
        </div>
      </div>
    </section>
  );
}
