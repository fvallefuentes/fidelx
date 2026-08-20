"use client";

import { useEffect } from "react";
import {
  CalendarDays,
  ContactRound,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  WalletCards,
} from "lucide-react";

type TrackingType =
  | "PHONE_CLICK"
  | "EMAIL_CLICK"
  | "WEBSITE_CLICK"
  | "WHATSAPP_CLICK"
  | "DIRECTIONS_CLICK"
  | "BOOKING_CLICK";

type Props = {
  slug: string;
  appleUrl: string;
  googleUrl: string;
  vcardUrl: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  whatsappUrl?: string | null;
  directionsUrl?: string | null;
  bookingUrl?: string | null;
  accentColor: string;
};

export function ContactCardPublicActions(props: Props) {
  useEffect(() => {
    void fetch(`/api/contact-card/${props.slug}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "VIEW" }),
      keepalive: true,
    });
  }, [props.slug]);

  function track(type: TrackingType) {
    void fetch(`/api/contact-card/${props.slug}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    });
  }

  return (
    <>
      <div className="public-contact-wallet-actions">
        <a href={props.appleUrl} className="public-wallet-button apple"><WalletCards />Ajouter à Apple Wallet</a>
        <a href={props.googleUrl} className="public-wallet-button google"><WalletCards />Ajouter à Google Wallet</a>
        <a href={props.vcardUrl} className="public-wallet-button contact" style={{ backgroundColor: props.accentColor }}><ContactRound />Ajouter aux contacts</a>
      </div>

      <div className="public-contact-quick-actions">
        {props.phone && <a href={`tel:${props.phone}`} onClick={() => track("PHONE_CLICK")}><Phone /><span>Appeler</span></a>}
        {props.email && <a href={`mailto:${props.email}`} onClick={() => track("EMAIL_CLICK")}><Mail /><span>E-mail</span></a>}
        {props.whatsappUrl && <a href={props.whatsappUrl} onClick={() => track("WHATSAPP_CLICK")} target="_blank" rel="noreferrer"><MessageCircle /><span>WhatsApp</span></a>}
        {props.directionsUrl && <a href={props.directionsUrl} onClick={() => track("DIRECTIONS_CLICK")} target="_blank" rel="noreferrer"><MapPin /><span>Itinéraire</span></a>}
        {props.bookingUrl && <a href={props.bookingUrl} onClick={() => track("BOOKING_CLICK")} target="_blank" rel="noreferrer"><CalendarDays /><span>Réserver</span></a>}
        {props.website && <a href={props.website} onClick={() => track("WEBSITE_CLICK")} target="_blank" rel="noreferrer"><ExternalLink /><span>Site</span></a>}
      </div>
    </>
  );
}
