/**
 * JSON-LD structured data components (server components, render in layout/page).
 * Referenced by audit recommendation #9 (SoftwareApplication + Organization + FAQPage).
 */

import { SITE_URL, SITE_NAME, FAQ_ITEMS } from "@/lib/seo";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description:
          "Fidlify, solution SaaS suisse de carte de fidélité digitale pour commerçants — Apple Wallet, Google Wallet, sans application à télécharger.",
        address: {
          "@type": "PostalAddress",
          addressCountry: "CH",
          addressRegion: "Suisse romande",
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Solution SaaS de carte de fidélité digitale pour commerçants, compatible Apple Wallet et Google Wallet, avec notifications push, QR code, points et tampons.",
        url: SITE_URL,
        offers: [
          {
            "@type": "Offer",
            name: "Gratuit",
            price: "0",
            priceCurrency: "CHF",
          },
          {
            "@type": "Offer",
            name: "Essentiel",
            price: "39",
            priceCurrency: "CHF",
          },
          {
            "@type": "Offer",
            name: "Croissance",
            price: "89",
            priceCurrency: "CHF",
          },
          {
            "@type": "Offer",
            name: "Multi-sites",
            price: "199",
            priceCurrency: "CHF",
          },
        ],
      }}
    />
  );
}

export function FaqJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((it) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: it.a,
          },
        })),
      }}
    />
  );
}
