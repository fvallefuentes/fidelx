import type { Metadata } from "next";
import Link from "next/link";
import { listBlogPosts } from "@/lib/blog";
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
    <div className="blog-shell">
      <header className="blog-header">
        <div className="wrap">
          <Link href="/" className="blog-back">
            ← Retour à Fidlify
          </Link>
          <h1 className="blog-title">Le blog Fidlify</h1>
          <p className="blog-subtitle">
            Conseils et guides pratiques pour fidéliser vos clients dans le commerce
            de proximité suisse.
          </p>
        </div>
      </header>

      <main className="wrap blog-list">
        {posts.length === 0 ? (
          <p className="blog-empty">Premiers articles bientôt en ligne — restez connecté.</p>
        ) : (
          <ul className="blog-cards">
            {posts.map((post) => (
              <li key={post.slug} className="blog-card">
                <article>
                  <div className="blog-card-meta">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("fr-CH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span>·</span>
                    <span>{post.readingTimeMin} min de lecture</span>
                  </div>
                  <h2 className="blog-card-title">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
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
                  <Link href={`/blog/${post.slug}`} className="blog-card-link">
                    Lire l&apos;article →
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}
