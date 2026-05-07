import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/legal/LegalShell";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal";
import OpenCookiePrefsButton from "@/components/cookies/OpenCookiePrefsButton";

export const metadata: Metadata = {
  title: "Politique cookies",
  description:
    "Politique cookies Fidlify : catégories, base légale, gestion du consentement, cookies strictement nécessaires uniquement, aucun tracking marketing.",
  alternates: { canonical: "/politique-cookies" },
  robots: { index: true, follow: true },
};

export default function PolitiqueCookiesPage() {
  return (
    <LegalShell title="Politique cookies" current="/politique-cookies">
      <div className="legal-prose">
        <h2>1. Qu&apos;est-ce qu&apos;un cookie&nbsp;?</h2>
        <p>
          Un <strong>cookie</strong> est un petit fichier texte déposé sur votre
          terminal (ordinateur, tablette, smartphone) lors de votre visite sur
          le Site <strong>fidlify.com</strong>.
        </p>
        <p>
          Les cookies permettent au Site de reconnaître votre terminal lors de
          visites ultérieures, de mémoriser vos choix et de mesurer son
          audience. Cette page utilise le terme «&nbsp;cookies&nbsp;» au sens
          large, pour désigner également les technologies similaires&nbsp;:
          pixels, balises web, stockage local (<code>localStorage</code>,{" "}
          <code>sessionStorage</code>), identifiants de stockage, etc.
        </p>

        <h2>2. Cadre légal applicable</h2>
        <p>Notre utilisation des cookies est régie par&nbsp;:</p>
        <ul>
          <li>
            🇨🇭 La <strong>Loi fédérale suisse sur la protection des données
            (nLPD)</strong>, en vigueur depuis le 1<sup>er</sup> septembre
            2023.
          </li>
          <li>
            🇨🇭 La <strong>Loi sur les télécommunications (LTC)</strong>,
            art.&nbsp;45c.
          </li>
          <li>
            🇪🇺 Le <strong>Règlement Général sur la Protection des Données (RGPD
            — UE 2016/679)</strong>.
          </li>
          <li>
            🇪🇺 La <strong>Directive ePrivacy 2002/58/CE</strong>, transposée en
            droit national de chaque État membre.
          </li>
        </ul>

        <h2>3. Vos droits</h2>
        <p>Vous disposez à tout moment du droit de&nbsp;:</p>
        <ul>
          <li>
            <strong>accepter</strong> ou <strong>refuser</strong> tout ou partie
            des cookies non strictement nécessaires&nbsp;;
          </li>
          <li>
            <strong>modifier vos choix</strong> ultérieurement via le lien
            «&nbsp;Gérer mes cookies&nbsp;» disponible en pied de page&nbsp;;
          </li>
          <li>
            <strong>retirer votre consentement</strong> aussi facilement que
            vous l&apos;avez donné&nbsp;;
          </li>
          <li>
            exercer vos droits d&apos;accès, de rectification et
            d&apos;effacement auprès de{" "}
            <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
              {PUBLIC_CONTACT_EMAIL}
            </a>
            .
          </li>
        </ul>
        <p>
          Le refus des cookies non strictement nécessaires{" "}
          <strong>n&apos;empêche pas</strong> l&apos;accès au Site. Toutefois,
          certaines fonctionnalités peuvent être dégradées.
        </p>
        <div className="legal-cta-box">
          <p>
            Vous pouvez à tout moment ouvrir le panneau de préférences pour
            consulter ou modifier vos choix&nbsp;:
          </p>
          <OpenCookiePrefsButton />
        </div>

        <h2>4. Catégories de cookies utilisés</h2>
        <p>Nous classons les cookies en trois catégories.</p>

        <h3>🟢 4.1 Cookies strictement nécessaires</h3>
        <p>
          Ces cookies sont <strong>indispensables</strong> au fonctionnement du
          Site. Ils ne peuvent pas être désactivés sous peine de rendre le Site
          inutilisable. <em>(Pas de consentement requis.)</em>
        </p>
        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Émetteur</th>
              <th>Finalité</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>next-auth.session-token</code>
              </td>
              <td>fidlify.com (1<sup>re</sup> partie)</td>
              <td>Authentification de l&apos;utilisateur connecté</td>
              <td>30 jours</td>
            </tr>
            <tr>
              <td>
                <code>__Secure-next-auth.session-token</code>
              </td>
              <td>fidlify.com (1<sup>re</sup> partie)</td>
              <td>Authentification (version HTTPS sécurisée)</td>
              <td>30 jours</td>
            </tr>
            <tr>
              <td>
                <code>next-auth.csrf-token</code>
              </td>
              <td>fidlify.com (1<sup>re</sup> partie)</td>
              <td>Protection contre les attaques CSRF</td>
              <td>Session</td>
            </tr>
            <tr>
              <td>
                <code>next-auth.callback-url</code>
              </td>
              <td>fidlify.com (1<sup>re</sup> partie)</td>
              <td>Redirection après authentification</td>
              <td>Session</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Base légale&nbsp;:</strong> intérêt légitime à fournir le
          service demandé (RGPD art.&nbsp;6.1.f) — et exemption ePrivacy
          (cookies strictement nécessaires).
        </p>

        <h3>🟡 4.2 Redirection vers le tunnel de paiement Stripe</h3>
        <p>
          Lorsque vous initiez un paiement, vous êtes <strong>redirigé</strong>{" "}
          vers la plateforme sécurisée <strong>Stripe Checkout</strong>{" "}
          (<code>checkout.stripe.com</code>). Sur cette plateforme, Stripe peut
          déposer des cookies pour assurer la sécurité de la transaction et la
          prévention de la fraude.
        </p>
        <p>
          ⚠️ <strong>Ces cookies sont déposés sur le domaine de Stripe</strong>,
          et non sur <code>fidlify.com</code>. Ils sont régis par la{" "}
          <a
            href="https://stripe.com/cookies-policy/legal"
            target="_blank"
            rel="noreferrer"
          >
            politique cookies de Stripe
          </a>
          .
        </p>
        <p>
          <strong>Sous-traitant&nbsp;:</strong> Stripe Payments Switzerland Ltd,
          Pfingstweidstrasse 60, 8005 Zurich, Suisse.
        </p>

        <h3>🔴 4.3 Cookies de mesure d&apos;audience et marketing</h3>
        <p>
          <strong>
            À ce jour, le Site n&apos;utilise AUCUN cookie de mesure
            d&apos;audience, de profilage ou de marketing.
          </strong>
        </p>
        <p>
          Si nous décidions un jour d&apos;en ajouter (par exemple pour mesurer
          la fréquentation du Site avec un outil d&apos;analytics), nous&nbsp;:
        </p>
        <ol>
          <li>mettrions à jour la présente politique&nbsp;;</li>
          <li>
            déploierions un <strong>bandeau de consentement</strong> vous
            permettant d&apos;accepter, refuser ou personnaliser&nbsp;;
          </li>
          <li>
            <strong>bloquerions le dépôt</strong> de ces cookies tant que vous
            n&apos;avez pas donné votre consentement explicite.
          </li>
        </ol>

        <h2>5. Cookies tiers et transferts hors UE/Suisse</h2>
        <p>
          Le Site <strong>ne charge aucun script tiers</strong> par défaut.
          Aucun cookie publicitaire, de réseau social ou de mesure d&apos;audience
          n&apos;est déposé sans votre action.
        </p>
        <p>
          Lorsque vous initiez un paiement via Stripe, des cookies fonctionnels
          Stripe peuvent être déposés depuis le domaine{" "}
          <code>js.stripe.com</code>. Stripe applique ses propres mesures de
          protection des données conformes au RGPD et à la nLPD. Stripe est
          susceptible de transférer certaines données aux États-Unis&nbsp;; ces
          transferts sont encadrés par les{" "}
          <strong>Clauses Contractuelles Types (CCT)</strong> et la décision
          d&apos;adéquation <strong>EU-US Data Privacy Framework</strong>.
        </p>

        <h2>6. Stockage local <em>(localStorage / sessionStorage)</em></h2>
        <p>
          Le Site utilise un <strong>stockage local minimal</strong> dans votre
          navigateur pour mémoriser votre choix exprimé sur la bannière de
          cookies&nbsp;:
        </p>
        <table>
          <thead>
            <tr>
              <th>Clé</th>
              <th>Finalité</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>fidlify_cookie_choice_v1</code>
              </td>
              <td>
                Mémoriser le fait que vous avez reconnu la bannière
                d&apos;information cookies
              </td>
              <td>12 mois</td>
            </tr>
          </tbody>
        </table>
        <p>
          Aucune autre clé de <code>localStorage</code>, <code>sessionStorage</code>{" "}
          ou <code>IndexedDB</code> n&apos;est utilisée sans votre action.
        </p>

        <h2>7. Comment gérer vos cookies</h2>

        <h3>7.1 Via notre bandeau de consentement</h3>
        <p>
          Lors de votre première visite, un bandeau vous permet d&apos;accepter
          ou de personnaliser vos choix. Vos préférences sont mémorisées pendant{" "}
          <strong>12 mois maximum</strong>, après quoi le bandeau réapparaît.
        </p>
        <p>
          À tout moment, vous pouvez modifier vos choix via le lien{" "}
          <strong>«&nbsp;Gérer mes cookies&nbsp;»</strong> présent en pied de
          page du Site.
        </p>

        <h3>7.2 Via votre navigateur</h3>
        <p>
          Tous les navigateurs modernes permettent de gérer les cookies
          (visualisation, suppression, blocage). Voici les liens d&apos;aide
          officiels&nbsp;:
        </p>
        <ul>
          <li>
            <strong>Google Chrome</strong>&nbsp;:{" "}
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noreferrer"
            >
              support.google.com/chrome
            </a>
          </li>
          <li>
            <strong>Mozilla Firefox</strong>&nbsp;:{" "}
            <a
              href="https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox-ordinateur"
              target="_blank"
              rel="noreferrer"
            >
              support.mozilla.org
            </a>
          </li>
          <li>
            <strong>Safari</strong>&nbsp;:{" "}
            <a
              href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noreferrer"
            >
              support.apple.com/safari
            </a>
          </li>
          <li>
            <strong>Microsoft Edge</strong>&nbsp;:{" "}
            <a
              href="https://support.microsoft.com/fr-fr/microsoft-edge"
              target="_blank"
              rel="noreferrer"
            >
              support.microsoft.com
            </a>
          </li>
        </ul>
        <p className="legal-note">
          La suppression des cookies via le navigateur supprime également vos
          sessions actives&nbsp;; vous devrez vous reconnecter.
        </p>

        <h2>8. Modifications de la présente politique</h2>
        <p>
          Cette politique peut être amendée à tout moment, notamment en cas
          d&apos;évolution technique ou réglementaire. Toute modification
          substantielle (ajout d&apos;un nouveau cookie de mesure
          d&apos;audience, par exemple) déclenchera l&apos;affichage d&apos;un
          nouveau bandeau de consentement.
        </p>

        <h2>9. Contact</h2>
        <p>Pour toute question relative à notre utilisation des cookies&nbsp;:</p>
        <p>
          📧{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
            <strong>{PUBLIC_CONTACT_EMAIL}</strong>
          </a>
        </p>
        <p>
          Pour exercer vos droits relatifs à la protection des données
          personnelles, vous pouvez également consulter notre{" "}
          <Link href="/politique-de-confidentialite">
            Politique de confidentialité
          </Link>
          .
        </p>

        <h2>10. Autorités de contrôle</h2>
        <p>
          Si vous estimez que nous ne respectons pas nos obligations en matière
          de cookies et de protection des données, vous pouvez introduire une
          réclamation auprès de&nbsp;:
        </p>
        <ul>
          <li>
            🇨🇭 <strong>Préposé fédéral à la protection des données et à la
            transparence (PFPDT)</strong>&nbsp;:{" "}
            <a
              href="https://www.edoeb.admin.ch"
              target="_blank"
              rel="noreferrer"
            >
              www.edoeb.admin.ch
            </a>
          </li>
          <li>
            🇫🇷 <strong>Commission Nationale de l&apos;Informatique et des
            Libertés (CNIL)</strong>&nbsp;:{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
              www.cnil.fr
            </a>
          </li>
          <li>
            🇪🇺 Toute autre autorité de protection des données de votre pays de
            résidence dans l&apos;UE.
          </li>
        </ul>
      </div>
    </LegalShell>
  );
}
