import Link from "next/link";
import HeroCinematic from "@/components/landing/HeroCinematic";
import JourneySection from "@/components/landing/JourneySection";
import FAQSection from "@/components/landing/FAQSection";
import SectionDemo from "@/components/landing/SectionDemo";
import RevealInit from "@/components/landing/RevealInit";
import LogoMark from "@/components/landing/LogoMark";

/* ─── Tiny SVG icon helper ────────────────────────────────── */
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h14" {...s}/><path d="m13 5 7 7-7 7" {...s}/></>,
    check: <path d="M20 6 9 17l-5-5" {...s}/>,
    x:     <><path d="M18 6 6 18" {...s}/><path d="m6 6 12 12" {...s}/></>,
    minus: <path d="M5 12h14" {...s}/>,
    paper: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s}/><path d="M14 2v6h6" {...s}/></>,
    clock: <><circle cx="12" cy="12" r="10" {...s}/><polyline points="12 6 12 12 16 14" {...s}/></>,
    bell:  <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...s}/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" {...s}/></>,
    wallet:<><path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" {...s}/><path d="M16 14h.01" {...s}/><path d="M3 7V5a2 2 0 0 1 2-2h11" {...s}/></>,
    sparkles:<><path d="M9.9 4.6 11 8l3.4 1.1L11 10.2 9.9 13.6 8.8 10.2 5.4 9.1 8.8 8 9.9 4.6Z" {...s}/><path d="M18 5v4" {...s}/><path d="M16 7h4" {...s}/><path d="M18 17v4" {...s}/><path d="M16 19h4" {...s}/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...s}/><circle cx="9" cy="7" r="4" {...s}/><path d="M22 21v-2a4 4 0 0 0-3-3.87" {...s}/><path d="M16 3.13a4 4 0 0 1 0 7.75" {...s}/></>,
    coffee:<><path d="M17 8h1a4 4 0 1 1 0 8h-1" {...s}/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" {...s}/><path d="M6 2v3" {...s}/><path d="M10 2v3" {...s}/><path d="M14 2v3" {...s}/></>,
    scissors:<><circle cx="6" cy="6" r="3" {...s}/><circle cx="6" cy="18" r="3" {...s}/><path d="M20 4 8.12 15.88" {...s}/><path d="M14.47 14.48 20 20" {...s}/><path d="M8.12 8.12 12 12" {...s}/></>,
    sparkle:<path d="m12 3 1.9 5.6L19.5 11l-5.6 1.9L12 19l-1.9-6.1L4.5 11l5.6-1.4L12 3Z" {...s}/>,
    bag:   <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" {...s}/><path d="M3 6h18" {...s}/><path d="M16 10a4 4 0 0 1-8 0" {...s}/></>,
    dumbbell:<><path d="M14.4 14.4 9.6 9.6" {...s}/><path d="M18.66 5.34 21.5 8.18" {...s}/><path d="m17.24 6.76 2.83-2.83" {...s}/><path d="M14.4 18.66l1.41 1.41a2 2 0 0 0 2.83 0l2.83-2.83a2 2 0 0 0 0-2.83l-1.41-1.42" {...s}/><path d="m4.93 14.4 1.42 1.41a2 2 0 0 1 0 2.83L3.51 21.5" {...s}/><path d="M5.34 18.66 2.5 15.82" {...s}/><path d="M9.6 9.6 8.18 8.18a2 2 0 0 0-2.82 0L2.5 11.04a2 2 0 0 0 0 2.83l1.42 1.41" {...s}/></>,
    truck: <><path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v11" {...s}/><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-2" {...s}/><circle cx="7" cy="18" r="2" {...s}/><circle cx="17" cy="18" r="2" {...s}/></>,
    store: <><path d="m2 7 1-4h18l1 4" {...s}/><path d="M2 7v13a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7" {...s}/><path d="M6 11v10" {...s}/><path d="M18 11v10" {...s}/><path d="M2 7c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" {...s}/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {paths[name]}
    </svg>
  );
}

/* ─── Loyalty card visual mock ────────────────────────────── */
function LoyaltyCard({
  shop = "Café Lumen",
  filled = 6,
  total = 10,
}: {
  shop?: string;
  filled?: number;
  total?: number;
}) {
  return (
    <div className="loy-card">
      <div className="loy-head">
        <div className="loy-brand">FIDLIFY · WALLET</div>
        <div className="loy-icon" />
      </div>
      <div className="loy-name">Carte de fidélité</div>
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
          <strong>{filled}</strong>/{total} · 1 café offert au 10ᵉ
        </div>
        <div className="loy-qr" />
      </div>
    </div>
  );
}

/* ─── Nav ─────────────────────────────────────────────────── */
function Nav() {
  return (
    <nav className="nav">
      <div className="wrap">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <LogoMark size={40} />
            <span>FIDLIFY</span>
          </Link>
          <div className="nav-links">
            <a href="#solution">Solution</a>
            <a href="#features">Fonctionnalités</a>
            <a href="#demo">Démo</a>
            <a href="#pricing">Tarifs</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-cta">
            <Link href="/login" className="btn btn-ghost" style={{ height: 40, padding: "0 18px", fontSize: 14 }}>
              Connexion
            </Link>
            <Link href="/register" className="btn btn-primary" style={{ height: 40, padding: "0 18px", fontSize: 14 }}>
              Essayer gratuitement <Icon name="arrow" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ─── Problem ─────────────────────────────────────────────── */
const problems = [
  { ic: "paper",    num: "01", title: "Les cartes papier se perdent.", body: "Tampons effacés, cartes oubliées au fond du sac, clients qui repartent sans rien." },
  { ic: "clock",    num: "02", title: "Les clients oublient de revenir.", body: "Aucun moyen de les recontacter. Une fois sortis, ils ne pensent plus à votre commerce." },
  { ic: "bell",     num: "03", title: "Les promos passent inaperçues.", body: "Affiches, flyers, posts Instagram. 90 % des clients ne les voient jamais." },
  { ic: "wallet",   num: "04", title: "Les apps coûtent une fortune.", body: "10 000 CHF de développement. Et un client sur cent accepte de la télécharger." },
  { ic: "sparkles", num: "05", title: "La fidélisation est compliquée.", body: "Outils éparpillés, données dispersées, aucun ROI mesurable. Un casse-tête." },
  { ic: "users",    num: "06", title: "Vous ne connaissez pas vos clients.", body: "Combien sont revenus ce mois-ci ? Qui sont vos meilleurs clients ? Aucune idée." },
];

function SectionProblem() {
  return (
    <section className="section" id="problem">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow"><span className="dot" /><span>LE PROBLÈME</span></div>
          <h2 className="h-section">
            La fidélité client ne devrait pas être <em>compliquée.</em>
          </h2>
          <p className="lede">
            Aujourd&apos;hui, garder un client coûte plus cher que d&apos;en acquérir un nouveau.
            Pourtant, la plupart des commerçants n&apos;ont aucun outil pour le faire.
          </p>
        </div>

        <div className="problem-grid">
          {problems.map((p, i) => (
            <div className="problem-card reveal" key={i} style={{ transitionDelay: `${i * 60}ms` }}>
              <div>
                <div className="ic-wrap"><Icon name={p.ic} size={20} /></div>
                <div className="num mono">— {p.num}</div>
                <h3 style={{ marginTop: 8 }}>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Solution ────────────────────────────────────────────── */
function SectionSolution() {
  return (
    <section className="section" id="solution" style={{ paddingTop: 60 }}>
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow"><span className="dot" /><span>LA SOLUTION</span></div>
          <h2 className="h-section">
            Une carte. Des notifications.<br />
            <span className="accent">Plus de ventes.</span>
          </h2>
          <p className="lede">
            Fidlify remplace votre carte papier par une carte digitale dans le Wallet de vos clients —
            et ouvre un canal direct vers eux.
          </p>
        </div>

        <div className="solution-steps">
          {/* Step 1 */}
          <div className="sol-step reveal" style={{ transitionDelay: "0ms" }}>
            <div className="step-num mono">— ÉTAPE 01</div>
            <h3>Créez votre carte digitale.</h3>
            <p>En 3 minutes. Choisissez vos couleurs, votre logo, vos récompenses. Aucune compétence technique requise.</p>
            <div className="visual" style={{ justifyContent: "center" }}>
              <div style={{ transform: "scale(0.85)", transformOrigin: "bottom center" }}>
                <LoyaltyCard shop="Votre commerce" filled={4} total={10} />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="sol-step reveal" style={{ transitionDelay: "100ms" }}>
            <div className="step-num mono">— ÉTAPE 02</div>
            <h3>Installez-la dans le Wallet.</h3>
            <p>Le client scanne un QR code en magasin. La carte s&apos;ajoute en un tap dans Apple Wallet ou Google Wallet.</p>
            <div className="visual" style={{ justifyContent: "center", gap: 18 }}>
              <div style={{ width: 70, height: 70, borderRadius: 12, background: "#fff", padding: 7 }}>
                <div className="loy-qr" style={{ width: "100%", height: "100%" }} />
              </div>
              <Icon name="arrow" size={20} />
              <div style={{ width: 52, height: 78, borderRadius: 10, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(212,255,78,0.2)" }}>
                <Icon name="wallet" size={22} />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="sol-step reveal" style={{ transitionDelay: "200ms" }}>
            <div className="step-num mono">— ÉTAPE 03</div>
            <h3>Envoyez des offres ciblées.</h3>
            <p>Notification push directement dans le téléphone du client. 94 % d&apos;ouverture en moyenne. Plus de ventes, instantanément.</p>
            <div className="visual">
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="notif-row">
                  <span className="dot-sm" />
                  <span className="who">Café Lumen</span>
                  <span style={{ color: "#c9ccc3", fontSize: 12 }}>—10% sur ton prochain café ☕</span>
                  <span className="when">2m</span>
                </div>
                <div className="notif-row" style={{ opacity: 0.6 }}>
                  <span className="dot-sm" style={{ background: "#565a52" }} />
                  <span className="who">Café Lumen</span>
                  <span style={{ color: "#8a8e84", fontSize: 12 }}>Nouvelle saison, nouveau menu.</span>
                  <span className="when">1h</span>
                </div>
                <div className="notif-row" style={{ opacity: 0.35 }}>
                  <span className="dot-sm" style={{ background: "#565a52" }} />
                  <span className="who">Café Lumen</span>
                  <span style={{ color: "#8a8e84", fontSize: 12 }}>Joyeux anniversaire 🎂</span>
                  <span className="when">3j</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ────────────────────────────────────────────── */
const features = [
  {
    tag: "WALLET", span: 2,
    title: "Apple & Google Wallet",
    body: "Compatible avec les deux Wallets natifs — pas d'app à télécharger.",
    visual: (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
        <span className="tag accent-tag" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          Apple Wallet
        </span>
        <span className="tag accent-tag" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google Wallet
        </span>
      </div>
    ),
  },
  {
    tag: "DESIGN",
    title: "Cartes 100% personnalisables",
    body: "Couleurs, logo, récompenses, design — adapté à votre commerce.",
    visual: (
      <div style={{ display: "flex", gap: 6 }}>
        {(["#d4ff4e","#ff7a6b","#7aa2ff","#f4f5f1","#ffd66b"] as string[]).map((c, i) => (
          <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: c, boxShadow: `0 0 12px ${c}55` }} />
        ))}
      </div>
    ),
  },
  {
    tag: "PUSH",
    title: "Notifications ciblées",
    body: "Segmentez, programmez, mesurez. 94 % d'ouverture moyenne.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 5, width: "100%" }}>
        <div style={{ height: 6, borderRadius: 3, background: "linear-gradient(90deg, #d4ff4e, rgba(212,255,78,0.2))", width: "94%" }} />
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", width: "60%" }} />
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", width: "40%" }} />
      </div>
    ),
  },
  {
    tag: "QR CODE",
    title: "Inscription en magasin",
    body: "Le client scanne, sa carte s'installe. C'est tout.",
    visual: <div className="loy-qr" style={{ width: 52, height: 52 }} />,
  },
  {
    tag: "DASHBOARD", span: 2,
    title: "Tableau de bord commerçant",
    body: "Visualisez vos clients, vos retours, vos performances. Données en temps réel.",
    visual: (
      <div className="dash-preview" style={{ height: 110 }}>
        <div className="dash-preview-row"><span>Clients actifs</span><span className="accent">1 248 ↑</span></div>
        <div className="dash-preview-row"><span>Cartes installées (7j)</span><span>+187</span></div>
        <div className="dash-preview-row"><span>Notifications envoyées</span><span>3 412</span></div>
      </div>
    ),
  },
  {
    tag: "OFFRES",
    title: "Promotions ciblées",
    body: "Anniversaires, inactifs, top clients. Automatisez vos campagnes.",
    visual: (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
        <span className="tag">Anniversaire</span>
        <span className="tag">Inactifs 30j</span>
        <span className="tag accent-tag">Top 10 %</span>
      </div>
    ),
  },
  {
    tag: "STATS",
    title: "Statistiques de fidélisation",
    body: "Taux de retour, fréquence, panier moyen — tout est là.",
    visual: (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 50, width: "100%" }}>
        {([30, 45, 40, 65, 55, 80, 75, 95] as number[]).map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: "linear-gradient(180deg, #d4ff4e, rgba(212,255,78,0.2))", borderRadius: "3px 3px 0 0", boxShadow: "0 0 8px rgba(212,255,78,0.2)" }} />
        ))}
      </div>
    ),
  },
  {
    tag: "CLIENTS",
    title: "Gestion des clients",
    body: "Profils, historique d'achat, segmentation. Votre CRM commerçant.",
    visual: (
      <div style={{ display: "flex", marginLeft: 6 }}>
        {(["#d4ff4e", "#7aa2ff", "#ff7a6b", "#ffd66b"] as string[]).map((c, i) => (
          <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: c, marginLeft: i === 0 ? 0 : -6, border: "2px solid #0c0d0c" }} />
        ))}
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "2px solid #0c0d0c", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)", color: "#c9ccc3" }}>+1.2k</div>
      </div>
    ),
  },
];

function SectionFeatures() {
  return (
    <section className="section" id="features">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow"><span className="dot" /><span>FONCTIONNALITÉS</span></div>
          <h2 className="h-section">
            Tout ce dont vous avez besoin pour<br />
            <em>faire revenir vos clients.</em>
          </h2>
          <p className="lede">Une plateforme complète, pensée pour les commerçants. Pas pour les développeurs.</p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div className={`feature-card reveal${f.span === 2 ? " span-2" : ""}`} key={i} style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
              <div className="ftag">{f.tag}</div>
              <h4>{f.title}</h4>
              <p>{f.body}</p>
              <div className="visual">{f.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── For Who ─────────────────────────────────────────────── */
const businessItems = [
  { ic: "coffee",   name: "Restaurants",          body: "Menu fidélité, plat offert, retours en cuisine." },
  { ic: "coffee",   name: "Cafés",                body: "Le 10ᵉ café offert. Le classique qui marche." },
  { ic: "scissors", name: "Salons de coiffure",   body: "Coupe gratuite après 5 visites." },
  { ic: "sparkle",  name: "Instituts de beauté",  body: "Soin offert, anniversaires, programmes VIP." },
  { ic: "bag",      name: "Boutiques",            body: "Bons d'achat, ventes privées, nouveautés." },
  { ic: "dumbbell", name: "Salles de sport",      body: "Récompenses pour les abonnés assidus." },
  { ic: "truck",    name: "Food trucks",          body: "Localisation, horaires, offres flash." },
  { ic: "store",    name: "Commerces locaux",     body: "Tout commerce de proximité qui veut grandir." },
];

function SectionForWho() {
  return (
    <section className="section" id="for-who">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow"><span className="dot" /><span>POUR QUI</span></div>
          <h2 className="h-section">
            Pensé pour les commerces<br />
            <em>qui veulent faire revenir leurs clients.</em>
          </h2>
        </div>
        <div className="business-grid">
          {businessItems.map((it, i) => (
            <div className="biz-card reveal" key={i} style={{ transitionDelay: `${(i % 4) * 50}ms` }}>
              <div className="icon"><Icon name={it.ic} size={20} /></div>
              <div>
                <h4>{it.name}</h4>
                <p style={{ marginTop: 6 }}>{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Benefits ────────────────────────────────────────────── */
const benefits = [
  { num: "01", title: "Augmentez la fréquence d'achat.", body: "Un client fidèle revient 5x plus souvent qu'un nouveau. Fidlify le déclenche." },
  { num: "02", title: "Gardez le contact avec vos clients.", body: "Plus besoin d'attendre qu'ils repassent. Une notification suffit." },
  { num: "03", title: "Remplacez les cartes papier.", body: "Plus de tampons, plus d'oublis, plus de cartes perdues. Tout est dans le téléphone." },
  { num: "04", title: "Lancez des offres instantanément.", body: "Une promo de dernière minute ? 30 secondes pour la diffuser à toute votre base." },
  { num: "05", title: "Créez une expérience moderne.", body: "Vos clients voient votre commerce comme une marque premium. Sans investir comme une marque premium." },
  { num: "06", title: "Fidélisez sans application.", body: "0 téléchargement, 0 friction. La carte s'ajoute au Wallet et y reste." },
];

function SectionBenefits() {
  return (
    <section className="section" id="benefits">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow"><span className="dot" /><span>BÉNÉFICES BUSINESS</span></div>
          <h2 className="h-section">
            Plus qu&apos;une carte de fidélité.<br />
            <em>Un canal direct vers vos clients.</em>
          </h2>
        </div>
        <div className="benefits-grid">
          {benefits.map((b, i) => (
            <div className="benefit-card reveal" key={i} style={{ transitionDelay: `${(i % 2) * 80}ms` }}>
              <div className="num">{b.num}</div>
              <div>
                <h4>{b.title}</h4>
                <p>{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Compare ─────────────────────────────────────────────── */
function CmpYes() {
  return (
    <span className="cmp-mark cmp-yes">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </span>
  );
}
function CmpNo() {
  return (
    <span className="cmp-mark cmp-no">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </span>
  );
}
function CmpMid() {
  return (
    <span className="cmp-mark cmp-mid">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
    </span>
  );
}

const compareRows: [string, React.ReactNode, React.ReactNode, React.ReactNode][] = [
  ["Pas d'application à télécharger",  <CmpNo key="a"/>,  <CmpNo key="b"/>,  <CmpYes key="c"/>],
  ["Notifications push",               <CmpNo key="a"/>,  <CmpYes key="b"/>, <CmpYes key="c"/>],
  ["Toujours dans la poche du client", <CmpNo key="a"/>,  <CmpMid key="b"/>, <CmpYes key="c"/>],
  ["Mise en place rapide",             <CmpYes key="a"/>, <CmpNo key="b"/>,  <CmpYes key="c"/>],
  ["Coût raisonnable",                 <CmpYes key="a"/>, <CmpNo key="b"/>,  <CmpYes key="c"/>],
  ["Données et statistiques",          <CmpNo key="a"/>,  <CmpMid key="b"/>, <CmpYes key="c"/>],
  ["Design professionnel",             <CmpMid key="a"/>, <CmpMid key="b"/>, <CmpYes key="c"/>],
  ["Maintenance simple",               <CmpYes key="a"/>, <CmpNo key="b"/>,  <CmpYes key="c"/>],
];

function SectionCompare() {
  return (
    <section className="section" id="compare">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow"><span className="dot" /><span>COMPARAISON</span></div>
          <h2 className="h-section">
            Pourquoi <span className="accent">Fidlify</span> et pas autre chose ?
          </h2>
        </div>
        <div className="compare-table reveal">
          <div className="compare-row head">
            <div></div>
            <div>Carte papier</div>
            <div>App mobile dédiée</div>
            <div className="col-fid">FIDLIFY</div>
          </div>
          {compareRows.map((r, i) => (
            <div className="compare-row" key={i}>
              <div className="label">{r[0]}</div>
              <div>{r[1]}</div>
              <div>{r[2]}</div>
              <div className="col-fid">{r[3]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────── */
const tiers = [
  {
    name: "Starter",
    desc: "Pour les petits commerces qui veulent démarrer.",
    price: "Dès 19 CHF",
    sub: "/ mois — facturé annuellement",
    features: [
      "Jusqu'à 250 cartes actives",
      "1 carte de fidélité personnalisable",
      "Apple Wallet & Google Wallet",
      "Notifications push (200/mois)",
      "Tableau de bord de base",
    ],
    cta: "Commencer",
    href: "/register",
    featured: false,
  },
  {
    name: "Pro",
    desc: "Pour les commerces qui veulent automatiser leur fidélisation.",
    price: "Dès 49 CHF",
    sub: "/ mois — facturé annuellement",
    features: [
      "Jusqu'à 2 000 cartes actives",
      "Cartes illimitées personnalisables",
      "Notifications push illimitées",
      "Segmentation et automatisations",
      "Statistiques avancées",
      "QR codes en magasin illimités",
    ],
    cta: "Choisir Pro",
    href: "/register",
    featured: true,
  },
  {
    name: "Business",
    desc: "Pour les commerces avec plusieurs points de vente.",
    price: "Dès 129 CHF",
    sub: "/ mois — facturé annuellement",
    features: [
      "Cartes actives illimitées",
      "Multi-établissements",
      "Gestion d'équipe",
      "API & intégrations",
      "Account manager dédié",
      "SLA 99,9 %",
    ],
    cta: "Parler à l'équipe",
    href: "/register",
    featured: false,
  },
];

function SectionPricing() {
  return (
    <section className="section" id="pricing">
      <div className="wrap">
        <div className="section-head center reveal">
          <div className="eyebrow"><span className="dot" /><span>TARIFS</span></div>
          <h2 className="h-section">Une formule pour <em>chaque commerce.</em></h2>
          <p className="lede">14 jours d&apos;essai gratuit. Sans carte bancaire. Sans engagement.</p>
        </div>

        <div className="pricing-grid">
          {tiers.map((t, i) => (
            <div className={`price-card reveal${t.featured ? " featured" : ""}`} key={i} style={{ transitionDelay: `${i * 80}ms` }}>
              {t.featured && <div className="featured-badge">Recommandé</div>}
              <div className="name">{t.name}</div>
              <div className="desc">{t.desc}</div>
              <div className="price-val">{t.price}</div>
              <div className="price-sub">{t.sub}</div>
              <ul>
                {t.features.map((f, j) => (
                  <li key={j}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4ff4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}><path d="M20 6 9 17l-5-5"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={t.href} className={`btn${t.featured ? " btn-primary" : " btn-ghost"}`}>
                {t.cta}
                <Icon name="arrow" size={14} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────── */
function SectionFinalCTA() {
  return (
    <section id="cta">
      <div className="wrap">
        <div className="final-cta reveal">
          <div style={{ position: "relative", zIndex: 2 }}>
            <div className="eyebrow" style={{ justifyContent: "center", marginBottom: 28 }}>
              <span className="dot" /><span>PRÊT À COMMENCER ?</span>
            </div>
            <h2 className="h-display" style={{ fontSize: "clamp(36px, 5.5vw, 72px)", textAlign: "center" }}>
              Votre prochaine vente commence par<br />
              <span className="accent">une carte dans le Wallet</span> de votre client.
            </h2>
            <p className="lede" style={{ margin: "30px auto 0", textAlign: "center" }}>
              Lancez votre programme de fidélité digital en quelques minutes et gardez vos clients connectés à votre commerce.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 44 }}>
              <Link href="/register" className="btn btn-primary" style={{ height: 54, padding: "0 28px", fontSize: 16 }}>
                Commencer maintenant <Icon name="arrow" size={16} />
              </Link>
              <Link href="#" className="btn btn-ghost" style={{ height: 54, padding: "0 28px", fontSize: 16 }}>
                Réserver une démo
              </Link>
            </div>
            <div style={{ marginTop: 28, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-geist-mono, monospace)", letterSpacing: "0.05em", textAlign: "center" }}>
              14 JOURS GRATUITS · SANS CARTE BANCAIRE · SANS ENGAGEMENT
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="brand" style={{ marginBottom: 16 }}>
                <LogoMark size={40} />
                <span>FIDLIFY</span>
              </div>
              <p style={{ color: "var(--ink-3)", fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
                La fidélité digitale pour les commerçants suisses.
                Apple Wallet, Google Wallet, zéro app.
              </p>
            </div>
            <div>
              <h5>Produit</h5>
              <ul>
                <li><a href="#features">Fonctionnalités</a></li>
                <li><a href="#pricing">Tarifs</a></li>
                <li><a href="#demo">Démo</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h5>Compte</h5>
              <ul>
                <li><Link href="/register">Créer un compte</Link></li>
                <li><Link href="/login">Connexion</Link></li>
                <li><Link href="/dashboard">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h5>Légal</h5>
              <ul>
                <li><a href="#">Conditions d&apos;utilisation</a></li>
                <li><a href="#">Confidentialité</a></li>
                <li><a href="#">LPD suisse</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 FIDLIFY · Made in Switzerland 🇨🇭</span>
            <span style={{ color: "var(--ink-4)" }}>fidelx.balise.ch</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─────────────────────────────────────────────────
   CORRECT ORDER (matching prototype app.jsx):
   Nav → Hero → Problem → Solution → Journey → Features →
   Demo → ForWho → Benefits → Compare → Pricing → FAQ →
   FinalCTA → Footer
   ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing">
      <RevealInit />
      <div className="ambient" />
      <div className="grid-overlay" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav />
        <HeroCinematic />
        <SectionProblem />
        <SectionSolution />
        <JourneySection />
        <SectionFeatures />
        <SectionDemo />
        <SectionForWho />
        <SectionBenefits />
        <SectionCompare />
        <SectionPricing />
        <FAQSection />
        <SectionFinalCTA />
        <Footer />
      </div>
    </div>
  );
}
