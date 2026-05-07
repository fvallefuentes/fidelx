import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/legal/LegalShell";
import {
  COFOUNDERS,
  HOST,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_SITE_DOMAIN,
  PUBLIC_SITE_URL,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales / Impressum",
  description:
    "Mentions légales et impressum du site Fidlify : éditeur, hébergeur, propriété intellectuelle, droit applicable.",
  alternates: { canonical: "/mentions-legales" },
  robots: { index: true, follow: true },
};

/* TODO post-immatriculation : réintégrer les sections suivantes (actuellement
   masquées car dépendent d'informations non encore disponibles) :
   - Raison sociale officielle, forme juridique
   - Siège social complet
   - Numéro IDE / CHE
   - Inscription au registre du commerce + canton
   - Mention "Associés indéfiniment et solidairement responsables"
   - Canton de juridiction explicite (actuellement formulé "tribunaux suisses
     compétents") */

export default function MentionsLegalesPage() {
  return (
    <LegalShell title="Mentions légales / Impressum" current="/mentions-legales">
      <div className="legal-prose">
        <h2>1. Éditeurs du site</h2>
        <p>
          Le site <strong>{PUBLIC_SITE_DOMAIN}</strong> (ci-après «&nbsp;le Site&nbsp;»)
          est édité conjointement, à titre de coéditeurs et coresponsables de la
          publication, par les porteurs du projet&nbsp;:
        </p>
        <ul>
          {COFOUNDERS.map((c) => (
            <li key={c.name}>
              <strong>M. {c.name}</strong> — {c.role}
            </li>
          ))}
        </ul>
        <p>
          Contact public&nbsp;:{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
          <br />
          Site web&nbsp;:{" "}
          <a href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">
            {PUBLIC_SITE_URL}
          </a>
        </p>
        <p className="legal-note">
          Le Site est actuellement publié sous l&apos;identité personnelle de ses
          porteurs de projet, dans l&apos;attente de la constitution d&apos;une
          structure d&apos;exploitation dédiée. Cette page sera mise à jour dès
          l&apos;immatriculation officielle.
        </p>

        <h2>2. Directeurs de la publication</h2>
        <p>
          Les directeurs de la publication sont les coéditeurs nommés à
          l&apos;article 1. Ils assument conjointement la responsabilité éditoriale
          du contenu publié sur le Site.
        </p>
        <p>
          Toute demande relative au contenu éditorial peut être adressée à&nbsp;:{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
        </p>

        <h2>3. Hébergeur</h2>
        <p>Le Site est hébergé par&nbsp;:</p>
        <p>
          <strong>{HOST.name}</strong>
          <br />
          {HOST.country}
          <br />
          <a href={HOST.url} target="_blank" rel="noreferrer">
            {HOST.url}
          </a>
        </p>
        <p>
          Les serveurs hébergeant les données sont situés en{" "}
          <strong>{HOST.country}</strong>, dans des centres de données certifiés
          ISO&nbsp;27001.
        </p>

        <h2>4. Activité</h2>
        <p>
          Le Site exploite le Service <strong>Fidlify</strong>, une plateforme SaaS
          de fidélisation client permettant aux commerçants professionnels de
          créer, déployer et gérer des programmes de fidélité digitaux compatibles
          avec Apple&nbsp;Wallet et Google&nbsp;Wallet.
        </p>
        <p>
          Le détail des prestations est décrit dans les{" "}
          <Link href="/cgu">Conditions générales d&apos;utilisation</Link>{" "}
          accessibles depuis le pied de page du Site.
        </p>

        <h2>5. Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments composant le Site (textes, logos, marques,
          images, vidéos, illustrations, charte graphique, code source, base de
          données, structure et arborescence) est la propriété exclusive des
          coéditeurs ou de leurs partenaires, et est protégé par les législations
          suisses et internationales relatives à la propriété intellectuelle,
          notamment&nbsp;:
        </p>
        <ul>
          <li>la Loi fédérale suisse sur le droit d&apos;auteur (LDA)&nbsp;;</li>
          <li>la Loi fédérale suisse sur la protection des marques (LPM)&nbsp;;</li>
          <li>
            le Code de la propriété intellectuelle français (pour les utilisateurs
            français/européens).
          </li>
        </ul>
        <p>
          La marque <strong>«&nbsp;Fidlify&nbsp;»</strong> ainsi que le logo
          associé constituent des éléments distinctifs propres aux coéditeurs,
          dont l&apos;usage par tout tiers est strictement interdit sans
          autorisation écrite préalable.
        </p>
        <p>
          Toute reproduction, représentation, modification, adaptation, traduction,
          exploitation commerciale ou diffusion totale ou partielle du Site ou de
          l&apos;un de ses éléments, par quelque procédé que ce soit, est
          strictement interdite sans l&apos;autorisation écrite préalable des
          coéditeurs, sous peine de poursuites civiles et pénales.
        </p>
        <p>
          Les marques, logos et contenus de tiers (notamment Apple&nbsp;Wallet,
          Google&nbsp;Wallet, Stripe, Infomaniak) demeurent la propriété de leurs
          ayants droit respectifs et sont utilisés conformément aux accords de
          licence applicables.
        </p>

        <h2>6. Liens vers des sites tiers</h2>
        <p>
          Le Site peut contenir des liens hypertextes vers des sites internet
          exploités par des tiers. Les coéditeurs n&apos;exercent aucun contrôle
          sur ces sites et déclinent toute responsabilité quant à leur contenu,
          leur disponibilité, leurs pratiques en matière de protection des
          données personnelles ou tout dommage résultant de leur consultation.
        </p>
        <p>
          L&apos;utilisateur est invité à consulter les conditions
          d&apos;utilisation et les politiques de confidentialité de ces sites
          tiers avant toute interaction.
        </p>

        <h2>7. Protection des données personnelles</h2>
        <p>
          Le traitement des données personnelles collectées par le Site est régi
          par notre{" "}
          <Link href="/politique-de-confidentialite">
            Politique de confidentialité
          </Link>
          , conforme&nbsp;:
        </p>
        <ul>
          <li>
            à la <strong>Loi fédérale suisse sur la protection des données
            (nLPD)</strong>{" "}
            entrée en vigueur le 1<sup>er</sup> septembre 2023&nbsp;;
          </li>
          <li>
            au <strong>Règlement Général sur la Protection des Données
            (RGPD&nbsp;— UE 2016/679)</strong>{" "}
            pour les utilisateurs situés dans l&apos;Union européenne.
          </li>
        </ul>
        <p>
          L&apos;utilisation des cookies et traceurs est détaillée dans notre{" "}
          <Link href="/politique-cookies">Politique cookies</Link>.
        </p>
        <p>
          Pour exercer vos droits (accès, rectification, effacement, opposition,
          portabilité, limitation), vous pouvez nous contacter par courriel à&nbsp;:{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
        </p>

        <h2>8. Limitation de responsabilité</h2>
        <p>
          Les coéditeurs mettent tout en œuvre pour assurer l&apos;exactitude et
          la mise à jour des informations diffusées sur le Site. Toutefois, ils
          ne sauraient garantir l&apos;exhaustivité, la précision ou l&apos;absence
          d&apos;erreurs des contenus publiés.
        </p>
        <p>
          L&apos;utilisateur reconnaît utiliser le Site sous sa seule
          responsabilité. Les coéditeurs ne pourront être tenus pour
          responsables&nbsp;:
        </p>
        <ul>
          <li>
            des dommages directs ou indirects résultant de l&apos;utilisation du
            Site ou de l&apos;impossibilité d&apos;y accéder&nbsp;;
          </li>
          <li>des erreurs ou omissions dans les contenus diffusés&nbsp;;</li>
          <li>
            des dysfonctionnements techniques du réseau Internet ou des
            équipements de l&apos;utilisateur.
          </li>
        </ul>
        <p>
          Les conditions précises de responsabilité contractuelle dans le cadre
          de l&apos;utilisation du Service Fidlify sont détaillées dans les{" "}
          <Link href="/cgu">CGU</Link>.
        </p>

        <h2>9. Loi applicable et juridiction</h2>
        <p>
          Les présentes mentions légales sont régies par le{" "}
          <strong>droit suisse</strong>.
        </p>
        <p>
          Tout litige relatif à leur interprétation ou à leur exécution relève de
          la compétence exclusive des <strong>tribunaux suisses compétents</strong>,
          sous réserve des dispositions impératives applicables aux consommateurs
          résidant dans l&apos;Union européenne, qui peuvent saisir les
          juridictions de leur lieu de résidence.
        </p>

        <h2>10. Modifications</h2>
        <p>
          Les coéditeurs se réservent le droit de modifier les présentes mentions
          légales à tout moment, notamment pour les adapter aux évolutions
          législatives, réglementaires ou techniques.
        </p>
        <p>
          Les modifications entrent en vigueur dès leur publication sur le Site.
          Il appartient à l&apos;utilisateur de consulter régulièrement la
          version en vigueur.
        </p>

        <h2>11. Contact</h2>
        <p>Pour toute question relative aux présentes mentions légales&nbsp;:</p>
        <p>
          📧{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
            <strong>{PUBLIC_CONTACT_EMAIL}</strong>
          </a>
          <br />
          🌐{" "}
          <a href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">
            {PUBLIC_SITE_URL}
          </a>
        </p>
      </div>
    </LegalShell>
  );
}
