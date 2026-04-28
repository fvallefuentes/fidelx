"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate,
} from "framer-motion";

/* ─── Scenes (text left side) ─────────────────────────────── */
const scenes = [
  {
    range: [0.00, 0.05, 0.20, 0.25] as const,
    kicker: "ÉTAPE 01 · CRÉATION",
    title: "Une carte fidélité.",
    sub: "Conçue pour vivre dans le Wallet de vos clients.",
  },
  {
    range: [0.20, 0.28, 0.40, 0.48] as const,
    kicker: "ÉTAPE 02 · INSTALLATION",
    title: "Elle arrive dans le téléphone.",
    sub: "Apple Wallet ou Google Wallet — sans aucune app à télécharger.",
  },
  {
    range: [0.42, 0.50, 0.60, 0.68] as const,
    kicker: "ÉTAPE 03 · ACTIVATION",
    title: "Toujours dans la poche.",
    sub: "Présente à chaque visite, à chaque achat, à chaque trajet.",
  },
  {
    range: [0.62, 0.70, 0.80, 0.88] as const,
    kicker: "ÉTAPE 04 · ENGAGEMENT",
    title: "Une notification, un retour.",
    sub: "94 % d'ouverture. Le canal le plus direct vers vos clients.",
  },
  {
    range: [0.80, 0.88, 0.97, 1.00] as const,
    kicker: "ÉTAPE 05 · CROISSANCE",
    title: null,
    sub: "Vendez plus.",
    finale: true,
  },
];

const BAR_HEIGHTS = [35, 50, 42, 60, 55, 72, 65, 80, 75, 92];

/* ─── One bar that grows driven by statH ─────────────────── */
function DashBar({ h, statH }: { h: number; statH: ReturnType<typeof useSpring> }) {
  const height = useTransform(statH, [0, 1], [2, h]);
  const heightStr = useMotionTemplate`${height}%`;
  return (
    <motion.span
      className="j-dash-bar"
      style={{ height: heightStr }}
    />
  );
}

/* ─── Scene text block ────────────────────────────────────── */
function SceneText({
  scene,
  p,
}: {
  scene: typeof scenes[number];
  p: ReturnType<typeof useSpring>;
}) {
  const opacity = useTransform(p, [...scene.range], [0, 1, 1, 0]);
  const y       = useTransform(p, [...scene.range], [40, 0, 0, -40]);
  const blur    = useTransform(p, [...scene.range], [10, 0, 0, 10]);
  const filter  = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.div className="journey-scene-text" style={{ opacity, y, filter }}>
      <div className="js-kicker">{scene.kicker}</div>
      {scene.finale ? (
        <h2 className="js-title">
          Fidélisez. <span style={{ color: "#8a8e84" }}>Notifiez.</span>
          <br />
          <span style={{ color: "#d4ff4e" }}>Vendez plus.</span>
        </h2>
      ) : (
        <h2 className="js-title">{scene.title}</h2>
      )}
      <p className="js-sub">{scene.sub}</p>
    </motion.div>
  );
}

/* ─── Progress dot ────────────────────────────────────────── */
function ProgressDot({
  scene,
  p,
}: {
  scene: typeof scenes[number];
  p: ReturnType<typeof useSpring>;
}) {
  const active  = useTransform(p, [scene.range[1], scene.range[2]], [0, 1]);
  const bg      = useTransform(active, (v) => v > 0.5 ? "#d4ff4e" : "rgba(255,255,255,0.15)");
  const width   = useTransform(active, (v) => v > 0.5 ? 28 : 14);
  return <motion.span className="jdot" style={{ background: bg, width }} />;
}

/* ─── Main component ──────────────────────────────────────── */
export default function JourneySection() {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Smooth spring — identical to prototype
  const p = useSpring(scrollYProgress, { stiffness: 100, damping: 28, mass: 0.4 });

  // ── Card ──
  const cardScale   = useTransform(p, [0, 0.2, 0.45, 0.65, 1],  [1.15, 1.05, 0.7, 0.55, 0.55]);
  const cardY       = useTransform(p, [0, 0.2, 0.45, 0.65, 1],  [0, -10, 60, 80, 80]);
  const cardX       = useTransform(p, [0, 0.2, 0.45, 1],        [0, 0, 0, 0]);
  const cardRotY    = useTransform(p, [0, 0.2, 0.45, 1],        [-12, -8, 0, 0]);
  const cardRotX    = useTransform(p, [0, 0.2, 0.45, 1],        [8, 6, 0, 0]);
  const cardZ       = useTransform(p, [0, 0.4, 0.55, 1],        [120, 80, -20, -20]);
  const cardOpacity = useTransform(p, [0, 0.05, 0.5, 0.65, 1],  [0, 1, 1, 0.95, 0.95]);
  const cardBlur    = useTransform(p, [0, 0.05, 0.65, 0.85, 1], [12, 0, 0, 2, 4]);
  const cardFilter  = useMotionTemplate`blur(${cardBlur}px)`;

  // ── Phone ──
  const phoneScale   = useTransform(p, [0, 0.18, 0.35, 0.65, 0.85, 1], [0.6, 0.7, 1, 1, 0.9, 0.85]);
  const phoneY       = useTransform(p, [0, 0.18, 0.35, 0.85, 1],       [80, 40, 0, 0, -10]);
  const phoneOpacity = useTransform(p, [0, 0.18, 0.3, 0.85, 1],        [0, 0.6, 1, 1, 0.85]);
  const phoneRotY    = useTransform(p, [0, 0.35, 0.65, 1],             [18, -6, -10, -8]);
  const phoneRotX    = useTransform(p, [0, 0.35, 0.65, 1],             [-8, 6, 4, 2]);
  const phoneZ       = useTransform(p, [0, 0.35, 0.55, 1],             [-200, -50, 0, 0]);

  // ── Notification ──
  const notifProgress = useTransform(p, [0.55, 0.78], [0, 1]);
  const notifY        = useTransform(notifProgress, [0, 1],       [40, -120]);
  const notifX        = useTransform(notifProgress, [0, 1],       [0, 60]);
  const notifScale    = useTransform(notifProgress, [0, 0.3, 1],  [0.5, 1.05, 1]);
  const notifOpacity  = useTransform(p, [0.55, 0.62, 0.85, 1],   [0, 1, 1, 0.9]);
  const notifRot      = useTransform(notifProgress, [0, 1],       [-8, -2]);
  const notifZ        = useTransform(notifProgress, [0, 1],       [-50, 80]);

  // ── Dashboard ──
  const dashOpacity = useTransform(p, [0.75, 0.9, 1],  [0, 1, 1]);
  const dashScale   = useTransform(p, [0.75, 0.92, 1], [0.7, 1.02, 1]);
  const dashY       = useTransform(p, [0.75, 0.92, 1], [60, 0, 0]);
  const dashRotY    = useTransform(p, [0.75, 1],        [-18, -10]);
  const dashRotX    = useTransform(p, [0.75, 1],        [12, 6]);
  const statH       = useTransform(p, [0.78, 0.95],     [0, 1]);

  // ── Ambient ──
  const glowOpacity = useTransform(p, [0, 0.2, 0.65, 1], [0.3, 0.6, 0.9, 1]);
  const glowScale   = useTransform(p, [0, 0.5, 1],        [1, 1.2, 1.4]);
  const particleRot = useTransform(p, [0, 1], [0, 18]);
  const particleY   = useTransform(p, [0, 1], [0, -80]);
  const gridY       = useTransform(p, [0, 1], [0, -120]);

  // ── Stat orbs ──
  const orb1Opacity = useTransform(p, [0.85, 0.95], [0, 1]);
  const orb1Y       = useTransform(p, [0.85, 1],    [40, 0]);
  const orb1Scale   = useTransform(p, [0.85, 1],    [0.6, 1]);
  const orb2Opacity = useTransform(p, [0.88, 0.97], [0, 1]);
  const orb2Y       = useTransform(p, [0.88, 1],    [40, 0]);
  const orb2Scale   = useTransform(p, [0.88, 1],    [0.6, 1]);

  return (
    <section ref={containerRef} className="journey" id="journey">
      <div className="journey-sticky">

        {/* Background */}
        <div className="journey-bg">
          <motion.div className="journey-glow"   style={{ opacity: glowOpacity, scale: glowScale }} />
          <motion.div className="journey-grid-bg" style={{ y: gridY }} />
          <motion.div className="journey-particles" style={{ rotate: particleRot, y: particleY }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} style={{
                left: `${(i * 37) % 100}%`,
                top:  `${(i * 53) % 100}%`,
                animationDelay: `${(i % 6) * 0.7}s`,
                opacity: 0.3 + ((i * 7) % 5) / 10,
              }} />
            ))}
          </motion.div>
        </div>

        {/* Main grid */}
        <div className="journey-grid">

          {/* ── Left: text scenes ── */}
          <div className="journey-text">
            <div className="journey-eyebrow">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-geist-mono,monospace)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8e84" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4ff4e", boxShadow: "0 0 12px rgba(212,255,78,.45)", display: "inline-block" }} />
                PRODUCT JOURNEY
              </div>
            </div>

            <div className="journey-text-stack">
              {scenes.map((s, i) => (
                <SceneText key={i} scene={s} p={p} />
              ))}
            </div>

            <div className="journey-dots">
              {scenes.map((s, i) => (
                <ProgressDot key={i} scene={s} p={p} />
              ))}
            </div>
          </div>

          {/* ── Right: 3D stage ── */}
          <div className="journey-stage" style={{ perspective: 1400 }}>
            <div className="journey-3d">

              {/* Ring */}
              <motion.div className="journey-ring" style={{ scale: glowScale, opacity: glowOpacity }} />

              {/* Phone */}
              <motion.div
                className="j-phone"
                style={{ scale: phoneScale, y: phoneY, opacity: phoneOpacity, rotateY: phoneRotY, rotateX: phoneRotX, z: phoneZ }}
              >
                <div className="j-phone-shell">
                  <div className="j-phone-screen">
                    <div className="j-phone-notch" />
                    <div className="j-phone-status">
                      <span>9:41</span>
                      <span style={{ fontFamily: "monospace", letterSpacing: 2 }}>● ● ●</span>
                    </div>
                    <div className="j-phone-label">Wallet</div>
                    <div className="j-phone-slot">
                      <div className="j-phone-slot-glow" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Wallet card */}
              <motion.div
                className="j-card-wrap"
                style={{ scale: cardScale, y: cardY, x: cardX, rotateY: cardRotY, rotateX: cardRotX, z: cardZ, opacity: cardOpacity, filter: cardFilter }}
              >
                <div className="j-card">
                  <div className="j-card-shine" />
                  <div className="j-card-head">
                    <span className="j-card-brand">FIDLIFY · WALLET</span>
                    <span className="j-card-icon" />
                  </div>
                  <div className="j-card-name">Carte de fidélité</div>
                  <div className="j-card-shop">Café Lumen</div>
                  <div className="j-card-stamps">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className={`j-stamp${i < 6 ? " full" : ""}`}>{i < 6 ? "★" : ""}</span>
                    ))}
                  </div>
                  <div className="j-card-foot">
                    <span style={{ fontFamily: "var(--font-geist-mono,monospace)", fontSize: 11, color: "#8a8e84" }}>
                      <strong style={{ color: "#f4f5f1" }}>6</strong>/10 · 1 café offert
                    </span>
                    <span className="j-qr" />
                  </div>
                </div>
              </motion.div>

              {/* Notification */}
              <motion.div
                className="j-notif"
                style={{ y: notifY, x: notifX, scale: notifScale, opacity: notifOpacity, rotate: notifRot, z: notifZ }}
              >
                <div className="j-notif-ic">F</div>
                <div className="j-notif-body">
                  <div className="j-notif-ttl">
                    Café Lumen
                    <span style={{ fontFamily: "var(--font-geist-mono,monospace)", fontSize: 11, color: "#8a8e84" }}>maintenant</span>
                  </div>
                  <div className="j-notif-msg">Plus que 4 cafés et le 10ᵉ est offert ☕</div>
                </div>
              </motion.div>

              {/* Dashboard */}
              <motion.div
                className="j-dash"
                style={{ opacity: dashOpacity, scale: dashScale, y: dashY, rotateY: dashRotY, rotateX: dashRotX }}
              >
                <div className="j-dash-head">
                  <span style={{ fontFamily: "var(--font-geist-mono,monospace)", fontSize: 11, color: "#8a8e84", letterSpacing: "0.1em" }}>REVENUS · 30 JOURS</span>
                  <span className="j-dash-pill">+24 %</span>
                </div>
                <div className="j-dash-num">CHF 18 420</div>
                <div className="j-dash-sub">↑ +3 580 vs mois précédent</div>
                <div className="j-dash-bars">
                  {BAR_HEIGHTS.map((h, i) => (
                    <DashBar key={i} h={h} statH={statH} />
                  ))}
                </div>
                <div className="j-dash-foot">
                  <span>S1</span><span>S2</span><span>S3</span><span>S4</span>
                </div>
              </motion.div>

              {/* Stat orbs */}
              <motion.div className="j-orb j-orb-1" style={{ opacity: orb1Opacity, y: orb1Y, scale: orb1Scale }}>
                <div className="j-orb-num">+187</div>
                <div className="j-orb-lbl">nouveaux clients</div>
              </motion.div>
              <motion.div className="j-orb j-orb-2" style={{ opacity: orb2Opacity, y: orb2Y, scale: orb2Scale }}>
                <div className="j-orb-num">94 %</div>
                <div className="j-orb-lbl">d&apos;ouverture</div>
              </motion.div>

            </div>
          </div>
        </div>

        <div className="journey-cue">SCROLL ↓</div>
      </div>
    </section>
  );
}
