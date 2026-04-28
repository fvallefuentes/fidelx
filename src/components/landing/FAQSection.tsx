"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const questions = [
  {
    q: "Est-ce que mes clients doivent télécharger une application ?",
    a: "Non, jamais. La carte Fidlify s'installe directement dans Apple Wallet ou Google Wallet — déjà présents sur 100% des smartphones modernes. Un simple tap depuis un QR code suffit.",
  },
  {
    q: "Est-ce compatible Apple Wallet ET Google Wallet ?",
    a: "Oui, Fidlify génère automatiquement la version compatible selon l'appareil de votre client. Aucune configuration de votre côté — la magie opère en arrière-plan.",
  },
  {
    q: "Puis-je envoyer des notifications à mes clients ?",
    a: "Oui. Vous pouvez envoyer des notifications push directement sur le téléphone de vos clients — promotions, nouveautés, anniversaires, rappels. Le taux d'ouverture moyen tourne autour de 94%.",
  },
  {
    q: "Puis-je personnaliser le design de la carte ?",
    a: "Entièrement. Logo, couleurs, photo de fond, type de récompense (tampons, points, paliers), texte. Votre carte ressemble à votre commerce — pas à Fidlify.",
  },
  {
    q: "Combien de temps pour créer une carte ?",
    a: "Environ 3 minutes. Vous remplissez les informations de votre commerce, choisissez le design, définissez la récompense — c'est en ligne et prêt à être distribué.",
  },
  {
    q: "Est-ce adapté aux petits commerces ?",
    a: "C'est précisément pour eux que Fidlify existe. Notre offre Starter démarre à 19 CHF/mois, sans engagement. Aucune compétence technique nécessaire.",
  },
  {
    q: "Puis-je utiliser un QR code en magasin ?",
    a: "Oui — vous générez votre QR code depuis le dashboard, l'imprimez (sticker, chevalet de table, addition) et vos clients scannent pour ajouter la carte au Wallet en un tap.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="section-head center" style={{ marginBottom: 0 }}>
          <div className="eyebrow"><span className="dot" /><span>FAQ</span></div>
          <h2 className="h-section">
            Les questions <em>qu&apos;on nous pose souvent.</em>
          </h2>
        </div>

        <div className="faq-list">
          {questions.map((item, i) => (
            <div
              key={i}
              className={`faq-item${open === i ? " open" : ""}`}
            >
              <div
                className="faq-q"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className="toggle">
                  <Plus size={14} />
                </span>
              </div>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
