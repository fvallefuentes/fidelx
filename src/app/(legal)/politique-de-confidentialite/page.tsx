import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/legal/LegalShell";
import {
  COFOUNDERS,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_SITE_URL,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité Fidlify : finalités, bases légales, sous-traitants, durées de conservation, droits LPD/RGPD, sécurité des données.",
  alternates: { canonical: "/politique-de-confidentialite" },
  robots: { index: true, follow: true },
};

/* TODO post-immatriculation : réintégrer "Identité du responsable de
   traitement" avec raison sociale, IDE, siège, et remplacer la formulation
   "coéditeurs" par la société. Réactiver également la mention DPA quand
   l'Accord de sous-traitance sera publié. */

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      current="/politique-de-confidentialite"
      intro={
        <p>
          La présente Politique de confidentialité décrit comment Fidlify collecte,
          utilise, conserve et protège les données personnelles dans le cadre de
          l&apos;exploitation du Service. Fidlify s&apos;engage à respecter
          scrupuleusement la <strong>nLPD&nbsp;suisse</strong> et le{" "}
          <strong>RGPD européen</strong>.
        </p>
      }
    >
      <div className="legal-prose">
        <h2>1. Identité des responsables de traitement</h2>
        <p>
          Le Site est actuellement publié sous l&apos;identité personnelle de ses
          porteurs de projet, qui agissent conjointement comme responsables de
          traitement&nbsp;:
        </p>
        <ul>
          {COFOUNDERS.map((c) => (
            <li key={c.name}>
              <strong>M. {c.name}</strong>
            </li>
          ))}
        </ul>
        <p>
          Contact relatif à la protection des données&nbsp;:{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
          <br />
          Site&nbsp;:{" "}
          <a href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">
            {PUBLIC_SITE_URL}
          </a>
        </p>
        <p className="legal-note">
          Cette identification sera mise à jour dès la constitution d&apos;une
          structure d&apos;exploitation officielle.
        </p>

        <h2>2. Interlocuteurs «&nbsp;Protection des données&nbsp;»</h2>
        <p>
          Fidlify n&apos;est pas tenue de désigner un Délégué à la Protection des
          Données (DPO) au sens de l&apos;art. 37 RGPD ou de l&apos;art. 10 nLPD,
          en raison de la nature et de l&apos;ampleur des traitements opérés.
        </p>
        <p>
          Toutefois, conformément à sa démarche de transparence, Fidlify a
          désigné <strong>deux interlocuteurs internes</strong> chargés de
          répondre aux demandes relatives à la protection des données&nbsp;:
        </p>
        <ul>
          {COFOUNDERS.map((c) => (
            <li key={c.name}>
              <strong>M. {c.name}</strong>
            </li>
          ))}
        </ul>
        <p>
          Toutes les demandes peuvent être adressées à&nbsp;:{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
            <strong>{PUBLIC_CONTACT_EMAIL}</strong>
          </a>
          .
        </p>

        <h2>3. Représentant dans l&apos;Union européenne</h2>
        <p>
          À ce jour, Fidlify ne dispose pas de représentant désigné dans l&apos;Union
          européenne au sens de l&apos;art. 27 RGPD, dans la mesure où les
          traitements de données de personnes établies dans l&apos;Union demeurent
          occasionnels et de petite échelle.
        </p>
        <p>
          Conformément à ses engagements,{" "}
          <strong>
            Fidlify désignera un représentant établi dans l&apos;Union européenne
            dès lors que le seuil d&apos;occasionnalité ne sera plus rencontré
          </strong>
          , notamment dès l&apos;acquisition d&apos;un premier client
          professionnel établi dans un État membre de l&apos;Union européenne.
          Cette désignation fera l&apos;objet d&apos;une mise à jour de la
          présente Politique.
        </p>

        <h2>4. Champ d&apos;application et distinction des rôles</h2>
        <h3>4.1 Fidlify, Responsable de traitement</h3>
        <p>
          Lorsque Fidlify collecte et traite directement des données personnelles
          dans le cadre de son activité commerciale propre, elle agit en qualité
          de <strong>Responsable de traitement</strong>. Cela concerne&nbsp;:
        </p>
        <ul>
          <li>
            les données des <strong>Utilisateurs</strong> (commerçants
            inscrits)&nbsp;: compte, facturation, support, marketing direct&nbsp;;
          </li>
          <li>
            les données techniques de fonctionnement du Service (logs, sessions,
            sécurité).
          </li>
        </ul>

        <h3>4.2 Fidlify, Sous-traitant</h3>
        <p>
          Lorsque les Utilisateurs collectent et gèrent, via le Service, des
          données personnelles relatives à leurs propres clients (les{" "}
          <strong>Clients finaux</strong>), c&apos;est l&apos;Utilisateur qui
          agit en qualité de Responsable de traitement, et Fidlify agit alors en
          qualité de <strong>Sous-traitant</strong>.
        </p>
        <p className="legal-note">
          Pour les Données client (porteurs de carte), nous renvoyons à la
          mention d&apos;information affichée sur le formulaire d&apos;inscription
          au QR&nbsp;code. La présente Politique décrit principalement les
          traitements pour lesquels Fidlify est Responsable.
        </p>

        <h2>5. Catégories de données collectées</h2>

        <h3>5.1 Données du compte Utilisateur (commerçant)</h3>
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Données concrètes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Identité</td>
              <td>Nom, prénom, raison sociale</td>
            </tr>
            <tr>
              <td>Coordonnées</td>
              <td>Email, téléphone, langue préférée (fr/de/it/en), devise</td>
            </tr>
            <tr>
              <td>Compte</td>
              <td>Identifiant, mot de passe (haché), photo de profil</td>
            </tr>
            <tr>
              <td>Rôle</td>
              <td>ADMIN, USER, STAFF</td>
            </tr>
            <tr>
              <td>Plan</td>
              <td>Gratuit, Essentiel, Croissance, Multi-sites</td>
            </tr>
            <tr>
              <td>Établissement</td>
              <td>
                Nom, adresse, géolocalisation, téléphone, identifiant Google
                Place, site web, horaires
              </td>
            </tr>
          </tbody>
        </table>

        <h3>5.2 Données de facturation</h3>
        <p>
          Identifiants Stripe (client, abonnement, tarif), période de
          souscription, plan souscrit, factures, méthode de paiement,
          coordonnées de facturation.
        </p>
        <p>
          <strong>Aucune donnée de carte bancaire n&apos;est stockée par
          Fidlify.</strong>{" "}
          Les paiements sont traités directement par <strong>Stripe</strong>,
          dans son tunnel sécurisé{" "}
          <code>checkout.stripe.com</code>.
        </p>

        <h3>5.3 Données de connexion et sécurité</h3>
        <ul>
          <li>Cookie de session NextAuth (httpOnly, sécurisé).</li>
          <li>
            Date et heure des connexions, adresse IP{" "}
            <strong>anonymisée</strong> (/24 IPv4 / /48 IPv6).
          </li>
          <li>Tentatives de connexion échouées, changements de mot de passe.</li>
        </ul>

        <h3>5.4 Données client final (rôle de sous-traitant)</h3>
        <p>
          Dans le cadre de son rôle de sous-traitant pour le compte de
          l&apos;Utilisateur, Fidlify héberge également&nbsp;: identité du client
          final (prénom, email, téléphone), carte de fidélité (numéro de série,
          statut, tampons/points/cashback), historique d&apos;activité,
          identifiants wallet et jetons push.
        </p>
        <p>
          Ces données ne sont{" "}
          <strong>
            utilisées par Fidlify que pour permettre le fonctionnement technique
            du Service
          </strong>{" "}
          au profit de l&apos;Utilisateur, et <strong>jamais à ses fins propres</strong>.
        </p>

        <h2>6. Finalités et bases légales</h2>
        <table>
          <thead>
            <tr>
              <th>Finalité</th>
              <th>Base légale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Création et gestion du compte Utilisateur</td>
              <td>Exécution du contrat (RGPD 6.1.b)</td>
            </tr>
            <tr>
              <td>Facturation et recouvrement</td>
              <td>Exécution du contrat + obligation légale (6.1.b et 6.1.c)</td>
            </tr>
            <tr>
              <td>Conservation comptable</td>
              <td>Obligation légale (CO art. 958f — 10 ans)</td>
            </tr>
            <tr>
              <td>Sécurité du Service et prévention de la fraude</td>
              <td>Intérêt légitime (RGPD 6.1.f)</td>
            </tr>
            <tr>
              <td>Support client</td>
              <td>Exécution du contrat (RGPD 6.1.b)</td>
            </tr>
            <tr>
              <td>Marketing direct (newsletters Fidlify)</td>
              <td>Consentement explicite (RGPD 6.1.a)</td>
            </tr>
            <tr>
              <td>Hébergement des Données client</td>
              <td>Contrat avec l&apos;Utilisateur (RGPD art. 28)</td>
            </tr>
            <tr>
              <td>Amélioration du Service (données agrégées anonymisées)</td>
              <td>Intérêt légitime (RGPD 6.1.f)</td>
            </tr>
          </tbody>
        </table>

        <h2>7. Sous-traitants</h2>
        <p>
          Fidlify recourt à des sous-traitants techniques pour fournir le
          Service. Chaque sous-traitant a fait l&apos;objet d&apos;une diligence
          raisonnable et est lié par un accord de sous-traitance conforme à
          l&apos;art.&nbsp;28 RGPD et à l&apos;art.&nbsp;9 nLPD.
        </p>
        <table>
          <thead>
            <tr>
              <th>Sous-traitant</th>
              <th>Finalité</th>
              <th>Localisation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Infomaniak Network SA</td>
              <td>Hébergement (VPS, base de données, mail)</td>
              <td>🇨🇭 Suisse</td>
            </tr>
            <tr>
              <td>Stripe Payments Switzerland Ltd</td>
              <td>Traitement des paiements et facturation</td>
              <td>🇨🇭 Suisse</td>
            </tr>
            <tr>
              <td>Apple Inc.</td>
              <td>Génération et mise à jour des passes Apple Wallet</td>
              <td>🇺🇸 USA (DPF + SCC)</td>
            </tr>
            <tr>
              <td>Google LLC</td>
              <td>Génération et mise à jour des passes Google Wallet</td>
              <td>🇺🇸 USA (DPF + SCC)</td>
            </tr>
          </tbody>
        </table>
        <p>
          Aucune donnée sensible (identifiant complet, transactions, base
          client) n&apos;est transmise à Apple ou Google&nbsp;: seules les
          métadonnées techniques strictement nécessaires à la création et la
          mise à jour des passes wallet leur sont communiquées.
        </p>

        <h2>8. Transferts hors Suisse / hors UE</h2>
        <p>
          La majorité des données sont <strong>stockées et traitées en Suisse</strong>,
          dans des centres de données certifiés ISO&nbsp;27001 d&apos;Infomaniak.
        </p>
        <p>
          Les transferts limités vers Apple Inc. et Google LLC, indispensables
          au fonctionnement des passes wallet, sont strictement encadrés par&nbsp;:
        </p>
        <ul>
          <li>
            l&apos;<strong>EU-US Data Privacy Framework</strong> (décision
            d&apos;adéquation du 10 juillet 2023)&nbsp;;
          </li>
          <li>
            les <strong>Standard Contractual Clauses (SCC)</strong> publiées
            par la Commission européenne le 4 juin 2021&nbsp;;
          </li>
          <li>
            les engagements complémentaires propres à Apple et Google en matière
            de chiffrement et de minimisation.
          </li>
        </ul>

        <h2>9. Durées de conservation</h2>
        <table>
          <thead>
            <tr>
              <th>Donnée</th>
              <th>Durée maximale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Compte Utilisateur (Plan payant)</td>
              <td>+ 90 jours après résiliation, puis suppression</td>
            </tr>
            <tr>
              <td>Compte Utilisateur (Plan Gratuit)</td>
              <td>Suppression à 12 mois d&apos;inactivité (alertes J-30 et J-7)</td>
            </tr>
            <tr>
              <td>Factures et données comptables</td>
              <td>10 ans (CO art. 958f)</td>
            </tr>
            <tr>
              <td>Données client final</td>
              <td>
                30 jours après suppression de la carte&nbsp;; 90 jours après
                résiliation du commerçant&nbsp;; ou anonymisation à 36 mois
                d&apos;inactivité
              </td>
            </tr>
            <tr>
              <td>Logs de connexion et sécurité</td>
              <td>12 mois</td>
            </tr>
            <tr>
              <td>Échanges avec le support</td>
              <td>3 ans après dernier échange</td>
            </tr>
            <tr>
              <td>Cookies de session NextAuth</td>
              <td>30 jours (ou jusqu&apos;à déconnexion)</td>
            </tr>
          </tbody>
        </table>

        <h2>10. Vos droits</h2>
        <p>
          Conformément à la nLPD et au RGPD, vous disposez des droits suivants&nbsp;:
        </p>
        <ul>
          <li>
            <strong>Droit d&apos;accès</strong> à vos données et à une copie
          </li>
          <li>
            <strong>Droit de rectification</strong> de données inexactes
          </li>
          <li>
            <strong>Droit d&apos;effacement</strong> («&nbsp;droit à
            l&apos;oubli&nbsp;»)
          </li>
          <li>
            <strong>Droit à la limitation</strong> du traitement
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong>, en particulier au
            marketing direct
          </li>
          <li>
            <strong>Droit à la portabilité</strong> (RGPD)
          </li>
          <li>
            <strong>Droit de retirer son consentement</strong> à tout moment,
            sans rétroactivité
          </li>
          <li>
            <strong>
              Droit de ne pas faire l&apos;objet d&apos;une décision automatisée
            </strong>{" "}
            produisant des effets juridiques (RGPD art.&nbsp;22)
          </li>
        </ul>

        <h2>11. Comment exercer vos droits</h2>
        <p>
          Toute demande peut être adressée par email à&nbsp;:{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
            <strong>{PUBLIC_CONTACT_EMAIL}</strong>
          </a>
        </p>
        <p>Pour faciliter le traitement de votre demande, merci de&nbsp;:</p>
        <ul>
          <li>
            préciser <strong>clairement</strong> la nature de votre demande
            (accès, rectification, etc.)&nbsp;;
          </li>
          <li>
            indiquer l&apos;adresse email <strong>liée à votre compte</strong> Fidlify&nbsp;;
          </li>
          <li>
            fournir, le cas échéant, les éléments permettant de vérifier votre
            identité.
          </li>
        </ul>
        <p>
          Fidlify répondra à votre demande dans un{" "}
          <strong>délai de 30 jours</strong> à compter de sa réception, prorogeable
          de deux mois en cas de demande complexe (RGPD art.&nbsp;12§3).
          L&apos;exercice de vos droits est <strong>gratuit</strong>, sauf
          demandes manifestement infondées ou excessives.
        </p>
        <p className="legal-note">
          Si vous êtes <strong>porteur d&apos;une carte de fidélité</strong>{" "}
          (Client final) émise par un commerçant, vous devez en priorité contacter
          le commerçant émetteur, qui est le Responsable de traitement de vos
          données. Vous pouvez néanmoins nous écrire et nous transmettrons votre
          demande au commerçant concerné.
        </p>

        <h2>12. Droit d&apos;introduire une réclamation</h2>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez
          introduire une réclamation auprès de l&apos;autorité compétente&nbsp;:
        </p>
        <ul>
          <li>
            🇨🇭 <strong>PFPDT</strong> (Préposé fédéral à la protection des
            données et à la transparence)&nbsp;:{" "}
            <a
              href="https://www.edoeb.admin.ch"
              target="_blank"
              rel="noreferrer"
            >
              www.edoeb.admin.ch
            </a>
          </li>
          <li>
            🇫🇷 <strong>CNIL</strong>&nbsp;:{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
              www.cnil.fr
            </a>
          </li>
          <li>
            🇪🇺 Autorité de protection des données de votre État membre de
            résidence
          </li>
        </ul>

        <h2>13. Sécurité des données</h2>
        <h3>13.1 Mesures techniques</h3>
        <ul>
          <li>Chiffrement en transit (HTTPS/TLS 1.3)</li>
          <li>Chiffrement au repos (disques chiffrés Infomaniak)</li>
          <li>Hachage bcrypt des mots de passe (coût ≥ 12)</li>
          <li>Authentification à deux facteurs disponible pour les comptes sensibles</li>
          <li>Anonymisation IP dans les logs</li>
          <li>Pare-feu, fail2ban, mises à jour de sécurité régulières</li>
          <li>Sauvegardes automatiques chiffrées et redondées</li>
        </ul>
        <h3>13.2 Mesures organisationnelles</h3>
        <ul>
          <li>Accès aux données strictement limité aux personnes habilitées</li>
          <li>Engagement de confidentialité signé par tout collaborateur</li>
          <li>Procédure de notification de violation (RGPD art.&nbsp;33-34)</li>
          <li>Tests de restauration de sauvegardes périodiques</li>
        </ul>
        <h3>13.3 Notification des violations</h3>
        <p>
          En cas de violation de données présentant un risque pour vos droits et
          libertés, Fidlify notifiera l&apos;autorité de contrôle compétente
          dans un délai de <strong>72 heures</strong>, et les personnes
          concernées dans les meilleurs délais lorsque la violation présente un
          risque élevé.
        </p>

        <h2>14. Profilage et décisions automatisées</h2>
        <p>
          Le Service permet aux Utilisateurs (commerçants) de segmenter leurs
          Clients finaux et de déclencher des notifications selon des critères
          automatisés. Cette segmentation est paramétrée et déclenchée{" "}
          <strong>par le commerçant</strong>, pas par Fidlify.
        </p>
        <p>
          Aucune <strong>décision produisant des effets juridiques</strong> (refus
          de service, augmentation de prix) n&apos;est prise sur cette base. Le
          Client final dispose d&apos;un droit d&apos;opposition à tout moment via
          le lien de désabonnement présent dans chaque notification.
        </p>
        <p>
          Fidlify ne prend aucune décision exclusivement automatisée produisant
          des effets juridiques ou affectant significativement les utilisateurs
          (RGPD art.&nbsp;22).
        </p>

        <h2>15. Mineurs</h2>
        <p>
          Le Service est strictement réservé aux <strong>professionnels majeurs</strong>.
          Aucune inscription de mineur n&apos;est acceptée en qualité d&apos;Utilisateur.
        </p>
        <p>
          Conformément à l&apos;art.&nbsp;8 RGPD et à la nLPD, les commerçants
          utilisateurs du Service ne doivent pas inscrire de Clients finaux âgés
          de moins de <strong>16 ans</strong> sans avoir obtenu le consentement
          préalable des représentants légaux. Pour les activités réglementées
          (alcool, tabac, jeux d&apos;argent), l&apos;Utilisateur s&apos;engage à
          ne pas inscrire de Clients finaux mineurs.
        </p>

        <h2>16. Cookies et traceurs</h2>
        <p>
          L&apos;utilisation des cookies et technologies similaires est détaillée
          dans la <Link href="/politique-cookies">Politique cookies</Link>.
        </p>
        <p>
          À titre indicatif, Fidlify n&apos;utilise actuellement{" "}
          <strong>aucun cookie</strong> de mesure d&apos;audience, de marketing
          ou de profilage. Seuls des cookies <strong>strictement nécessaires</strong>{" "}
          au fonctionnement du Service (authentification, sécurité) sont
          utilisés.
        </p>

        <h2>17. Modifications</h2>
        <p>
          Fidlify peut modifier la présente Politique pour tenir compte des
          évolutions réglementaires, jurisprudentielles ou techniques. Toute
          modification substantielle sera notifiée par email à l&apos;adresse de
          contact du compte Utilisateur et par notification dans son espace
          personnel.
        </p>
        <p>
          La date de dernière mise à jour figure en haut du présent document.
        </p>

        <h2>18. Contact</h2>
        <p>
          Pour toute question relative à la présente Politique ou à la protection
          des données personnelles&nbsp;:
        </p>
        <p>
          📧{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
            <strong>{PUBLIC_CONTACT_EMAIL}</strong>
          </a>
        </p>
      </div>
    </LegalShell>
  );
}
