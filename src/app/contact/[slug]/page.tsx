import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { digitsOnly, normalizeWebUrl } from "@/lib/contact-card";
import { ContactCardPublicActions } from "@/components/contact-card/public-actions";

export const dynamic = "force-dynamic";

async function getCard(slug: string) {
  return prisma.contactCard.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card?.isActive) return { title: "Carte indisponible | Fidlify" };
  return {
    title: `${card.displayName} · ${card.companyName}`,
    description: `Coordonnées de ${card.displayName}, ${card.jobTitle || card.companyName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicContactCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card?.isActive) notFound();

  const whatsappNumber = digitsOnly(card.whatsapp);
  const website = normalizeWebUrl(card.website);
  const bookingUrl = normalizeWebUrl(card.bookingUrl);
  const directionsUrl = card.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`
    : null;

  return (
    <main className="public-contact-page" style={{ "--contact-accent": card.accentColor } as React.CSSProperties}>
      <section className="public-contact-shell">
        <div className="public-contact-pass" style={{ background: card.bgColor, color: card.textColor }}>
          <div className="public-contact-pass-head">
            <span className="public-contact-logo">
              {card.logoData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.logoData} alt={`Logo ${card.companyName}`} />
              ) : <Building2 />}
            </span>
            <span>{card.companyName}</span>
          </div>
          {card.photoData && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="public-contact-photo" src={card.photoData} alt={card.displayName} />
          )}
          <div className="public-contact-pass-body">
            {card.jobTitle && <span style={{ color: card.accentColor }}>{card.jobTitle}</span>}
            <h1>{card.displayName}</h1>
            <div className="public-contact-details">
              {card.phone && <p><Phone />{card.phone}</p>}
              {card.email && <p><Mail />{card.email}</p>}
              {card.address && <p><MapPin />{card.address}</p>}
            </div>
          </div>
        </div>

        <div className="public-contact-content">
          <span className="public-contact-eyebrow">CARTE DE CONTACT DIGITALE</span>
          <h2>Gardez mes coordonnées à portée de main.</h2>
          <p>Ajoutez cette carte à votre Wallet ou enregistrez directement le contact sur votre téléphone.</p>

          <ContactCardPublicActions
            slug={slug}
            appleUrl={`/api/wallet/apple/contact/${slug}.pkpass`}
            googleUrl={`/api/wallet/google/contact/${slug}`}
            vcardUrl={`/api/contact-card/${slug}/vcard`}
            phone={card.phone}
            email={card.email}
            website={website}
            whatsappUrl={whatsappNumber ? `https://wa.me/${whatsappNumber}` : null}
            directionsUrl={directionsUrl}
            bookingUrl={bookingUrl}
            accentColor={card.accentColor}
          />

          <small className="public-contact-powered">Propulsé par Fidlify</small>
        </div>
      </section>
    </main>
  );
}
