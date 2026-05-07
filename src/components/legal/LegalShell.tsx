import Link from "next/link";
import { LEGAL_LAST_UPDATE, LEGAL_VERSION, LEGAL_PAGES } from "@/lib/legal";

/**
 * Shell partagé pour toutes les pages légales publiques.
 * - Header : eyebrow LEGAL, H1, dernière mise à jour
 * - Sidebar (desktop) : navigation entre pages légales
 * - Container max 760px de lecture confortable
 */
export default function LegalShell({
  title,
  intro,
  current,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  /** Path de la page courante (pour highlight nav). */
  current: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-page">
      <div className="wrap">
        <header className="legal-head reveal-on">
          <div className="eyebrow">
            <span className="dot" />
            <span>LÉGAL</span>
          </div>
          <h1 className="legal-h1">{title}</h1>
          <p className="legal-meta">
            Dernière mise à jour&nbsp;: {LEGAL_LAST_UPDATE} · Version{" "}
            {LEGAL_VERSION}
          </p>
          {intro && <div className="legal-intro">{intro}</div>}
        </header>

        <div className="legal-grid">
          <aside className="legal-aside" aria-label="Navigation pages légales">
            <div className="legal-aside-inner">
              <h2 className="legal-aside-title">Pages légales</h2>
              <nav>
                <ul>
                  {LEGAL_PAGES.map((p) => (
                    <li
                      key={p.href}
                      className={p.href === current ? "is-current" : ""}
                    >
                      {p.href === current ? (
                        <span aria-current="page">{p.short}</span>
                      ) : (
                        <Link href={p.href}>{p.short}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          <article className="legal-content">{children}</article>
        </div>
      </div>
    </main>
  );
}
