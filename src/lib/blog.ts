/**
 * Blog Fidlify — articles Markdown stockés dans /src/content/blog/.
 *
 * Chaque article = un fichier `.md` avec frontmatter YAML :
 *
 *     ---
 *     title: "..."
 *     description: "..."
 *     date: "2026-05-20"
 *     author: "Fidlify Team"
 *     tags: ["seo", "fidélité"]
 *     image: "/blog/img/article-cover.jpg"   # optionnel
 *     draft: false                            # optionnel
 *     ---
 *
 *     # Markdown content here…
 *
 * Avantages MD/frontmatter :
 *  - Versionnage Git natif (révisions visibles)
 *  - Zéro DB (rendu statique → SEO + perf optimaux)
 *  - Édition simple en local ou via GitHub web
 *  - Compatible avec n'importe quel CMS Git si on veut migrer plus tard
 */
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string; // ISO YYYY-MM-DD
  author?: string;
  tags?: string[];
  image?: string;
  draft?: boolean;
};

export type BlogPostMeta = BlogFrontmatter & {
  slug: string;
  readingTimeMin: number;
};

export type BlogPost = BlogPostMeta & {
  contentHtml: string;
};

/** Estime le temps de lecture en minutes (200 mots/min). */
function estimateReadingTime(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Liste tous les articles publiés (draft: false), triés par date desc.
 * Côté serveur uniquement — utilise fs.
 */
export async function listBlogPosts(): Promise<BlogPostMeta[]> {
  let files: string[];
  try {
    files = await fs.readdir(BLOG_DIR);
  } catch {
    return []; // pas de dossier blog encore
  }

  const posts: BlogPostMeta[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");
    const post = await getBlogPostMeta(slug);
    if (post && !post.draft) {
      posts.push(post);
    }
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** Tous les slugs publiés (utile pour generateStaticParams). */
export async function listBlogSlugs(): Promise<string[]> {
  const posts = await listBlogPosts();
  return posts.map((p) => p.slug);
}

/** Métadonnées sans rendre le HTML (plus rapide). */
export async function getBlogPostMeta(
  slug: string
): Promise<BlogPostMeta | null> {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.md`);
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);
    const fm = data as BlogFrontmatter;
    if (!fm.title || !fm.date) return null;
    return {
      ...fm,
      slug,
      readingTimeMin: estimateReadingTime(content),
    };
  } catch {
    return null;
  }
}

/** Récupère un article complet (avec HTML rendu). */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.md`);
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);
    const fm = data as BlogFrontmatter;
    if (!fm.title || !fm.date) return null;

    const processed = await remark()
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: false })
      .process(content);

    return {
      ...fm,
      slug,
      readingTimeMin: estimateReadingTime(content),
      contentHtml: String(processed),
    };
  } catch {
    return null;
  }
}
