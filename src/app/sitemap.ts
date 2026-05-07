import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { LEGAL_PAGES } from "@/lib/legal";

/**
 * Sitemap public.
 * Pages légales actuellement publiées : mentions, confidentialité, cookies, CGU.
 * CGV et DPA seront ajoutés dès leur publication.
 * Pages verticales SEO (cafés, restaurants, etc.) à ajouter en phase 30-60j.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    ...LEGAL_PAGES.map((p) => ({
      url: `${SITE_URL}${p.href}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
