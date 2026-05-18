import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBlogPost,
  getBlogPostMeta,
  listBlogSlugs,
} from "@/lib/blog";
import Footer from "@/components/landing/Footer";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";

export const dynamic = "force-static";
export const revalidate = 3600; // ISR : revalide 1 fois/h pour les drafts qui passent en publié

/** Génération statique de toutes les pages article au build. */
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

  // JSON-LD BlogPosting pour rich result Google
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
    <div className="blog-shell">
      <header className="blog-header blog-header-article">
        <div className="wrap">
          <Link href="/blog" className="blog-back">
            ← Tous les articles
          </Link>
        </div>
      </header>

      <article className="wrap blog-article">
        <div className="blog-article-meta">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("fr-CH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>·</span>
          <span>{post.readingTimeMin} min de lecture</span>
          {post.author && (
            <>
              <span>·</span>
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

        <div
          className="blog-prose"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        <div className="blog-article-cta">
          <h3>Prêt à digitaliser votre fidélité ?</h3>
          <p>
            Créez votre 1ère carte digitale en 3 minutes. Apple Wallet + Google
            Wallet inclus. Plan gratuit pour démarrer.
          </p>
          <Link href="/register" className="blog-cta-btn">
            Démarrer gratuitement →
          </Link>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Footer />
    </div>
  );
}
