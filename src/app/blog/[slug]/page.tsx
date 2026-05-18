import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBlogPost,
  getBlogPostMeta,
  listBlogSlugs,
  listBlogPosts,
} from "@/lib/blog";
import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await listBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getBlogPostMeta(slug);
  if (!meta) {
    return { title: "Article introuvable" };
  }
  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url,
      type: "article",
      publishedTime: meta.date,
      authors: meta.author ? [meta.author] : undefined,
      tags: meta.tags,
      images: [meta.image ?? DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [meta.image ?? DEFAULT_OG_IMAGE],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  // Related articles (2 derniers hors article courant)
  const all = await listBlogPosts();
  const related = all.filter((p) => p.slug !== slug).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.author ?? SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    image: post.image ? `${SITE_URL}${post.image}` : DEFAULT_OG_IMAGE,
    keywords: post.tags?.join(", "),
  };

  return (
    <div className="landing">
      <div className="ambient" />
      <div className="grid-overlay" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav />

        <article className="blog-article">
          <div className="wrap">
            <div className="blog-article-head">
              <Link href="/blog" className="blog-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
                Tous les articles
              </Link>

              <div className="blog-article-meta">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("fr-CH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span className="blog-meta-sep">·</span>
                <span>{post.readingTimeMin} min de lecture</span>
                {post.author && (
                  <>
                    <span className="blog-meta-sep">·</span>
                    <span>Par {post.author}</span>
                  </>
                )}
              </div>

              <h1 className="blog-article-title">{post.title}</h1>
              <p className="blog-article-desc">{post.description}</p>

              {post.tags && post.tags.length > 0 && (
                <div className="blog-article-tags">
                  {post.tags.map((t) => (
                    <span key={t} className="blog-tag">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            <div className="blog-article-cta">
              <h3>Prêt à digitaliser votre fidélité ?</h3>
              <p>
                Créez votre 1ère carte digitale en 3 minutes. Apple Wallet +
                Google Wallet inclus. Plan gratuit pour démarrer.
              </p>
              <Link href="/register" className="btn btn-primary blog-cta-btn">
                Démarrer gratuitement
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m13 5 7 7-7 7" />
                </svg>
              </Link>
            </div>

            {related.length > 0 && (
              <aside className="blog-related">
                <h3>Articles à lire ensuite</h3>
                <ul>
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/blog/${r.slug}`} className="blog-related-card">
                        <span className="blog-related-date">
                          {new Date(r.date).toLocaleDateString("fr-CH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="blog-related-title">{r.title}</span>
                        <span className="blog-related-desc">{r.description}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </article>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Footer />
      </div>
    </div>
  );
}
