"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Building2,
  CalendarDays,
  Check,
  ContactRound,
  Copy,
  Download,
  ExternalLink,
  Eye,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Save,
  Smartphone,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ContactCardData = {
  id: string;
  slug: string;
  displayName: string;
  companyName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  whatsapp: string | null;
  bookingUrl: string | null;
  instagram: string | null;
  linkedin: string | null;
  logoData: string | null;
  photoData: string | null;
  bgColor: string;
  textColor: string;
  accentColor: string;
  isActive: boolean;
};

type ContactResponse = {
  card: ContactCardData;
  publicUrl: string;
  stats: {
    allTime: Record<string, number>;
    last30Days: Record<string, number>;
  };
};

const emptyStats = { allTime: {}, last30Days: {} };

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: typeof UserRound;
}) {
  return (
    <label className="contact-editor-field">
      <span>{label}</span>
      <div className="contact-editor-input-wrap">
        {Icon && <Icon aria-hidden="true" />}
        <input
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
        />
      </div>
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function readFile(file?: File) {
    if (!file) return;
    if (file.size > 500_000) {
      alert("Cette image dépasse 500 Ko.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="contact-image-field">
      <div className="contact-image-copy">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <div className="contact-image-actions">
        <button type="button" className="contact-image-preview" onClick={() => inputRef.current?.click()}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" />
          ) : (
            <ImagePlus aria-hidden="true" />
          )}
        </button>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choisir
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" title={`Retirer ${label.toLowerCase()}`} onClick={() => onChange(null)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => readFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}

export default function ContactCardPage() {
  const [card, setCard] = useState<ContactCardData | null>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [stats, setStats] = useState<ContactResponse["stats"]>(emptyStats);
  const [preview, setPreview] = useState<"apple" | "google">("apple");
  const [cardKind, setCardKind] = useState<"recipient" | "share">("recipient");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const sharePreviewQrRef = useRef<HTMLCanvasElement>(null);

  const qrTargetUrl = useMemo(() => {
    if (!publicUrl || !card) return publicUrl;
    if (cardKind !== "share") return publicUrl;

    try {
      const origin = new URL(publicUrl).origin;
      return preview === "apple"
        ? `${origin}/api/wallet/apple/contact/${card.slug}/share.pkpass`
        : `${origin}/api/wallet/google/contact/${card.slug}/share`;
    } catch {
      return publicUrl;
    }
  }, [card, cardKind, preview, publicUrl]);

  const qrTitle = cardKind === "share" ? "QR d'ajout Wallet" : "QR de partage";
  const qrHint = cardKind === "share"
    ? `À scanner pour ajouter votre carte de partage ${preview === "apple" ? "Apple" : "Google"} Wallet`
    : "À placer au comptoir, sur une facture ou une affiche";

  useEffect(() => {
    fetch("/api/contact-card")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Chargement impossible");
        return data as ContactResponse;
      })
      .then((data) => {
        setCard(data.card);
        setPublicUrl(data.publicUrl);
        setStats(data.stats);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!qrTargetUrl) return;
    const options = {
      width: 280,
      margin: 2,
      color: { dark: "#11140e", light: "#ffffff" },
    };
    if (qrCanvasRef.current) void QRCode.toCanvas(qrCanvasRef.current, qrTargetUrl, options);
  }, [qrTargetUrl]);

  useEffect(() => {
    if (!publicUrl) return;
    const options = {
      width: 280,
      margin: 2,
      color: { dark: "#11140e", light: "#ffffff" },
    };
    if (sharePreviewQrRef.current) void QRCode.toCanvas(sharePreviewQrRef.current, publicUrl, options);
  }, [publicUrl, cardKind, preview]);

  const distributionTotal = useMemo(
    () =>
      (stats.last30Days.APPLE_WALLET || 0) +
      (stats.last30Days.GOOGLE_WALLET || 0) +
      (stats.last30Days.CONTACT_DOWNLOAD || 0),
    [stats]
  );

  function change<K extends keyof ContactCardData>(key: K, value: ContactCardData[K]) {
    setCard((current) => current ? { ...current, [key]: value } : current);
    setSaved(false);
  }

  async function save() {
    if (!card) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/contact-card", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible");
      setCard(data.card);
      setPublicUrl(data.publicUrl);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(qrTargetUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function downloadQr() {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `fidlify-carte-contact-${card?.slug || "qr"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (loading) {
    return <div className="contact-page-loading"><span /></div>;
  }
  if (!card) {
    return <div className="contact-page-error">{error || "Carte indisponible"}</div>;
  }

  return (
    <div className="contact-card-page">
      <header className="contact-page-head">
        <div>
          <span className="contact-page-kicker"><ContactRound /> NOUVEAU MODULE</span>
          <h1>Carte de contact</h1>
          <p>Partagez vos coordonnées dans Wallet et Contacts, sans formulaire client.</p>
        </div>
        <div className="contact-page-head-actions">
          <label className="contact-active-toggle">
            <span>{card.isActive ? "Publiée" : "Désactivée"}</span>
            <input type="checkbox" checked={card.isActive} onChange={(event) => change("isActive", event.target.checked)} />
            <i />
          </label>
          <Button onClick={save} disabled={saving}>
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Enregistrement..." : saved ? "Enregistré" : "Enregistrer"}
          </Button>
        </div>
      </header>

      {error && <div className="contact-page-error">{error}</div>}

      <section className="contact-stats" aria-label="Statistiques des 30 derniers jours">
        <div><Eye /><span>Ouvertures</span><strong>{stats.last30Days.VIEW || 0}</strong></div>
        <div><WalletCards /><span>Ajouts Wallet</span><strong>{(stats.last30Days.APPLE_WALLET || 0) + (stats.last30Days.GOOGLE_WALLET || 0)}</strong></div>
        <div><ContactRound /><span>Ajouts Contacts</span><strong>{stats.last30Days.CONTACT_DOWNLOAD || 0}</strong></div>
        <div><Smartphone /><span>Actions utiles</span><strong>{distributionTotal}</strong></div>
      </section>

      <div className="contact-builder-grid">
        <section className="contact-editor-panel">
          <div className="contact-section-title">
            <div><UserRound /></div>
            <span><strong>Identité et coordonnées</strong><small>Les informations visibles par vos contacts</small></span>
          </div>

          <div className="contact-fields-grid">
            <Field label="Nom affiché" value={card.displayName} onChange={(value) => change("displayName", value)} icon={UserRound} placeholder="Sophie Martin" />
            <Field label="Commerce" value={card.companyName} onChange={(value) => change("companyName", value)} icon={Building2} placeholder="Studio Horizon" />
            <Field label="Fonction" value={card.jobTitle} onChange={(value) => change("jobTitle", value)} placeholder="Fondatrice" />
            <Field label="Téléphone" value={card.phone} onChange={(value) => change("phone", value)} icon={Phone} placeholder="+41 79 123 45 67" type="tel" />
            <Field label="E-mail" value={card.email} onChange={(value) => change("email", value)} icon={Mail} placeholder="bonjour@commerce.ch" type="email" />
            <Field label="Site internet" value={card.website} onChange={(value) => change("website", value)} placeholder="www.commerce.ch" />
            <Field label="Adresse" value={card.address} onChange={(value) => change("address", value)} icon={MapPin} placeholder="Rue du Lac 10, Lausanne" />
            <Field label="WhatsApp" value={card.whatsapp} onChange={(value) => change("whatsapp", value)} icon={Phone} placeholder="+41 79 123 45 67" />
            <Field label="Lien de réservation" value={card.bookingUrl} onChange={(value) => change("bookingUrl", value)} icon={CalendarDays} placeholder="cal.com/mon-commerce" />
            <Field label="Instagram" value={card.instagram} onChange={(value) => change("instagram", value)} placeholder="@moncommerce" />
            <Field label="LinkedIn" value={card.linkedin} onChange={(value) => change("linkedin", value)} placeholder="linkedin.com/in/..." />
          </div>

          <div className="contact-editor-divider" />

          <div className="contact-section-title">
            <div><ImagePlus /></div>
            <span><strong>Identité visuelle</strong><small>Logo recommandé, portrait facultatif</small></span>
          </div>
          <ImageField label="Logo du commerce" value={card.logoData} onChange={(value) => change("logoData", value)} hint="PNG, JPG ou WebP, 500 Ko maximum" />
          <ImageField label="Photo de contact" value={card.photoData} onChange={(value) => change("photoData", value)} hint="Portrait carré recommandé. Visible dans Wallet et dans la fiche Contacts." />

          <div className="contact-color-row">
            {([
              ["bgColor", "Fond"],
              ["textColor", "Texte"],
              ["accentColor", "Accent"],
            ] as const).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <div><input type="color" value={card[key]} onChange={(event) => change(key, event.target.value)} /><code>{card[key]}</code></div>
              </label>
            ))}
          </div>
        </section>

        <aside className="contact-preview-panel">
          <div className="contact-preview-heading">
            <div><strong>Aperçu Wallet</strong><span>Le rendu final peut varier selon l’appareil.</span></div>
            <div className="contact-wallet-tabs">
              <button className={preview === "apple" ? "active" : ""} onClick={() => setPreview("apple")}>Apple</button>
              <button className={preview === "google" ? "active" : ""} onClick={() => setPreview("google")}>Google</button>
            </div>
          </div>

          <div className="contact-apple-kind-tabs" aria-label={`Type de carte ${preview === "apple" ? "Apple" : "Google"} Wallet`}>
            <button className={cardKind === "recipient" ? "active" : ""} onClick={() => setCardKind("recipient")}>Carte client</button>
            <button className={cardKind === "share" ? "active" : ""} onClick={() => setCardKind("share")}><QrCode />Carte de partage</button>
          </div>

          <div className={`contact-wallet-preview ${preview} ${cardKind}`} style={{ background: card.bgColor, color: card.textColor }}>
            <div className="contact-wallet-brand">
              <span className="contact-wallet-logo">
                {card.logoData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.logoData} alt="" />
                ) : <Building2 />}
              </span>
              <strong>{card.companyName || "Votre commerce"}</strong>
              <small>{cardKind === "share" ? "PARTAGER" : preview === "apple" ? "CONTACT" : "Google Wallet"}</small>
            </div>
            {card.photoData && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="contact-wallet-photo" src={card.photoData} alt="" />
            )}
            <div className="contact-wallet-main">
              <span style={{ color: card.accentColor }}>{card.jobTitle || "CARTE DE CONTACT"}</span>
              <h2>{card.displayName || "Votre nom"}</h2>
              <div>
                {card.phone && <p><Phone />{card.phone}</p>}
                {card.email && <p><Mail />{card.email}</p>}
              </div>
            </div>
            {cardKind === "share" && (
              <div className="contact-wallet-share-qr">
                <canvas ref={sharePreviewQrRef} aria-label="QR code vers la carte publique" />
                <span>Scanner pour enregistrer le contact</span>
              </div>
            )}
          </div>

          {cardKind === "share" && (
            <div className="contact-owner-pass-cta">
              <div>
                <strong>Votre carte de partage</strong>
                <span>Ajoutez-la à votre téléphone, puis présentez son QR à vos clients.</span>
              </div>
              <Button asChild>
                <a href={preview === "apple"
                  ? `/api/wallet/apple/contact/${card.slug}/share.pkpass`
                  : `/api/wallet/google/contact/${card.slug}/share`}>
                  <WalletCards className="h-4 w-4" />Ajouter à {preview === "apple" ? "Apple" : "Google"} Wallet
                </a>
              </Button>
            </div>
          )}

          <div className="contact-share-block">
            <div className="contact-section-title compact">
              <div><QrCode /></div>
              <span><strong>{qrTitle}</strong><small>{qrHint}</small></span>
            </div>
            <div className="contact-qr-layout">
              <canvas ref={qrCanvasRef} />
              <div>
                <p>{qrTargetUrl}</p>
                <Button variant="outline" onClick={copyLink}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copié" : "Copier le lien"}</Button>
                <Button variant="outline" onClick={downloadQr}><Download className="h-4 w-4" />Télécharger le QR</Button>
                <Button variant="ghost" asChild>
                  <a href={qrTargetUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />{cardKind === "share" ? "Tester l'ajout Wallet" : "Voir la page publique"}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
