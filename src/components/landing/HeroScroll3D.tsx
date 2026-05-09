"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/**
 * HeroScroll3D — animation cinématographique pilotée par le scroll.
 *
 * Adapté du design Anthropic Design "hero-scroll-3d.html" :
 * - Section sticky 220vh
 * - Stage central avec carte FIDLIFY 3D (Z-translate + rotateX/Y)
 * - 2 cartes orbitales en arrière-plan (chap. 02)
 * - Tampons qui se remplissent (chap. 02 → 03)
 * - Headline qui s'efface
 * - Dim final + CTAs qui apparaissent (chap. 04)
 * - Pips de chapitre (right side)
 *
 * Toutes les classes sont préfixées `h3d-` pour ne pas entrer en conflit
 * avec les classes existantes de la landing.
 *
 * Le scroll progress est appliqué en CSS variables sur le ROOT de la section
 * (pas document.documentElement) pour rester scoped.
 */
export default function HeroScroll3D() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stampsRef = useRef<HTMLDivElement>(null);
  const stampCountRef = useRef<HTMLSpanElement>(null);
  const pipsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = sectionRef.current;
    const scroller = scrollerRef.current;
    if (!root || !scroller) return;

    let raf = 0;
    let target = 0;
    let current = 0;

    const ease = (t: number) =>
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const setVar = (name: string, value: string | number) => {
      root.style.setProperty(name, String(value));
    };

    function update() {
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0005) current = target;

      const p = current;
      const p1 = Math.min(1, p / 0.35);
      const p2 = Math.max(0, Math.min(1, (p - 0.3) / 0.35));
      const p3 = Math.max(0, Math.min(1, (p - 0.7) / 0.3));
      const pHeadOut = Math.max(0, Math.min(1, (p - 0.65) / 0.15));
      const pScene = Math.max(0, Math.min(1, p / 0.75));
      const pSceneY = Math.max(0, Math.min(1, (p - 0.5) / 0.25));

      setVar("--p", p);
      setVar("--p1", ease(p1));
      setVar("--p2", ease(p2));
      setVar("--p3", ease(p3));
      setVar("--pHead", ease(p1));
      setVar("--pHeadOut", ease(pHeadOut));
      setVar("--pScene", ease(pScene));
      setVar("--pSceneY", ease(pSceneY));
      setVar("--pDim", ease(p3));
      setVar("--ctaEvents", p3 > 0.5 ? "auto" : "none");

      // Tampons : 0 → 10 entre 30% et 85%
      const sp = Math.max(0, Math.min(1, (p - 0.3) / 0.55));
      const filled = Math.round(sp * 10);
      const stampsEl = stampsRef.current;
      if (stampsEl) {
        const items = stampsEl.querySelectorAll(".h3d-st");
        items.forEach((el, i) => el.classList.toggle("on", i < filled));
      }
      if (stampCountRef.current) {
        stampCountRef.current.textContent = String(filled);
      }

      // Pips
      const stage = p < 0.25 ? 0 : p < 0.55 ? 1 : p < 0.8 ? 2 : 3;
      pipsRef.current.forEach((pip, i) =>
        pip?.classList.toggle("on", i === stage)
      );

      raf = requestAnimationFrame(update);
    }

    function onScroll() {
      const rect = scroller!.getBoundingClientRect();
      const total = scroller!.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      target = Math.max(0, Math.min(1, scrolled / Math.max(1, total)));
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    raf = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className="h3d-root">
      <div ref={scrollerRef} className="h3d-scroll3d">
        <div className="h3d-stage">
          <div className="h3d-ambient" />
          <div className="h3d-rays" />

          {/* Headline */}
          <div className="h3d-headline">
            <span className="h3d-eyebrow">
              <span className="h3d-dot" />
              <span>FIDLIFY · FAITES DÉFILER</span>
            </span>
            <h2 className="h3d-title">
              La fidélité qui donne <br />
              <span className="h3d-acc">envie de revenir.</span>
            </h2>
            <p className="h3d-lede">
              Créez un programme de fidélité digital dans Apple Wallet et Google
              Wallet, sans application à télécharger.
            </p>
          </div>

          {/* Scène 3D */}
          <div className="h3d-scene">
            {/* Cartes orbitales */}
            <div className="h3d-orbit h3d-o1">
              <div className="h3d-row">
                <span className="h3d-gly" aria-hidden>
                  ✂
                </span>
                <div>
                  <div className="h3d-o-tag">FIDLIFY</div>
                  <div className="h3d-o-shop">Salon Atlas</div>
                </div>
              </div>
              <div className="h3d-bar">
                <i style={{ width: "55%" }} />
              </div>
            </div>
            <div className="h3d-orbit h3d-o2">
              <div className="h3d-row">
                <span className="h3d-gly" aria-hidden>
                  🥖
                </span>
                <div>
                  <div className="h3d-o-tag">FIDLIFY</div>
                  <div className="h3d-o-shop">Boulangerie Pré</div>
                </div>
              </div>
              <div className="h3d-bar">
                <i style={{ width: "80%" }} />
              </div>
            </div>

            {/* Carte hero */}
            <div className="h3d-card">
              <div className="h3d-card-head">
                <div className="h3d-card-brand">
                  <span className="h3d-card-glyph" aria-hidden>
                    ☕
                  </span>
                  <div>
                    <div className="h3d-card-org">FIDLIFY</div>
                    <div className="h3d-card-shop">Café Lumen</div>
                  </div>
                </div>
                <div className="h3d-card-mark" aria-hidden />
              </div>
              <div className="h3d-card-body">
                <div className="h3d-card-lbl">
                  PROGRESSION ·{" "}
                  <span ref={stampCountRef}>0</span>/10
                </div>
                <div ref={stampsRef} className="h3d-stamps">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h3d-st">
                      <i />
                    </div>
                  ))}
                </div>
              </div>
              <div className="h3d-card-foot">
                <div>
                  <div className="h3d-card-lbl">RÉCOMPENSE</div>
                  <div className="h3d-card-reward">1 café offert</div>
                </div>
                <Qr />
              </div>
            </div>
          </div>

          {/* Sparks */}
          <span className="h3d-spark h3d-spark1" aria-hidden>
            ★
          </span>
          <span className="h3d-spark h3d-spark2" aria-hidden>
            ★
          </span>
          <span className="h3d-spark h3d-spark3" aria-hidden>
            ★
          </span>
          <span className="h3d-spark h3d-spark4" aria-hidden>
            ★
          </span>

          {/* Feature mid-scroll */}
          <div className="h3d-feature">
            <div className="h3d-feature-lbl">CHAPITRE 02</div>
            <div className="h3d-feature-ttl">
              Apple Wallet · sans app · sans friction
            </div>
          </div>

          <div className="h3d-dim" />

          {/* End line + CTAs */}
          <div className="h3d-endline">
            <div className="h3d-endline-l1">PRÊT EN 5 MINUTES</div>
            <div className="h3d-endline-l2">
              Lancez votre programme dès aujourd&apos;hui.
            </div>
          </div>
          <div className="h3d-endcta">
            <Link href="/register" className="h3d-btn h3d-btn-primary">
              Créer ma carte fidélité
            </Link>
            <Link href="#demo" className="h3d-btn h3d-btn-light">
              ▶ Démo 90s
            </Link>
          </div>

          <div className="h3d-hint" aria-hidden>
            <i />
            <span>FAITES DÉFILER</span>
          </div>
          <div className="h3d-vignette" aria-hidden />
          <div className="h3d-grain" aria-hidden />
        </div>
      </div>

      {/* Pips de chapitre */}
      <div className="h3d-pips" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            ref={(el) => {
              pipsRef.current[i] = el;
            }}
            className="h3d-pip"
          />
        ))}
      </div>
    </section>
  );
}

/* QR mock — 9×9 grid avec pattern déterministe (équivalent du QR du design) */
function Qr() {
  const cells = Array.from({ length: 81 }, (_, i) => ((i * 7) % 5) > 1);
  return (
    <div className="h3d-qr" aria-hidden>
      {cells.map((on, i) => (
        <span key={i} style={{ opacity: on ? 1 : 0 }} />
      ))}
    </div>
  );
}
