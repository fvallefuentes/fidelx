import type { Metadata } from "next";
import Link from "next/link";
import { listBlogPosts } from "@/lib/blog";
import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog Fidlify — Conseils fidélisation pour commerçants suisses",
  description:
    "Articles et guides pratiques pour fidéliser vos clients en Suisse : cartes digitales, Apple Wallet, Google Wallet, statistiques, campagnes marketing.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog Fidlify",
    description:
      "Conseils et guides pour fidéliser vos clients dans le commerce de proximité suisse.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
};

export default async function BlogIndexPage() {
  const posts = await listBlogPosts();

  return (
    <div className="landing">
      <div className="ambient" />
      <div className="grid-overlay" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav />

        <section className="blog-hero">
          <div className="wrap">
            <div className="blog-hero-eyebrow">
              <span className="blog-hero-dot" /> Blog Fidlify
            </div>
            <h1 className="blog-hero-title">
              Conseils &amp; guides pour fidéliser
              <br />
              <span className="blog-hero-accent">vos clients en Suisse</span>
            </h1>
            <p className="blog-hero-subtitle">
              Articles pratiques pour commerçants : cartes digitales, Apple Wallet
              et Google Wallet, statistiques, campagnes marketing, conformité LPD.
            </p>
          </div>
        </section>

        <main className="wrap blog-list">
          {posts.length === 0 ? (
            <p className="blog-empty">Premiers articles bientôt en ligne — restez connecté.</p>
          ) : (
            <ul className="blog-cards">
              {posts.map((post) => (
                <li key={post.slug} className="blog-card">
                  <Link href={`/blog/${post.slug}`} className="blog-card-link-wrap">
                    <article>
                      <div className="blog-card-meta">
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString("fr-CH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                        <span className="blog-meta-sep">·</span>
                        <span>{post.readingTimeMin} min de lecture</span>
                      </div>
                      <h2 className="blog-card-title">{post.title}</h2>
                      <p className="blog-card-desc">{post.description}</p>
                      {post.tags && post.tags.length > 0 && (
                        <div className="blog-card-tags">
                          {post.tags.map((t) => (
                            <span key={t} className="blog-tag">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="blog-card-cta">
                        Lire l&apos;article
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m13 5 7 7-7 7" />
                        </svg>
                      </span>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
