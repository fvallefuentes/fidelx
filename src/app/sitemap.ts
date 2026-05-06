import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap public.
 * Pour l'instant : home + auth (login / register).
 * Les pages légales (mentions, CGU, CGV, DPA, confidentialité, cookies)
 * seront ajoutées dès qu'elles seront publiées.
 * Les pages verticales SEO (cafés, restaurants, etc.) sont prévues phase 30-60j.
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
  ];
}
