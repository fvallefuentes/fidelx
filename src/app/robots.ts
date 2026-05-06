import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Bloquer les surfaces non-publiques / authentifiées :
      disallow: [
        "/api/",
        "/admin",
        "/admin/",
        "/dashboard",
        "/dashboard/",
        "/checkout/",
        "/stamp/",
        "/join/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
