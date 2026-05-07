import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/legal/LegalShell";
import { PUBLIC_CONTACT_EMAIL, PUBLIC_SITE_URL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation (CGU)",
  description:
    "CGU Fidlify : conditions d'accès et d'utilisation du Service SaaS de fidélisation digitale pour commerçants professionnels.",
  alternates: { canonical: "/cgu" },
  robots: { index: true, follow: true },
};

/* TODO post-immatriculation : remplacer "Fidlify" / "les coéditeurs" par
   la raison sociale officielle et réintégrer la mention des CGV et du DPA
   quand ces documents seront publiés (actuellement les références à ces
   documents sont retirées du préambule pour éviter les liens cassés). */

export default function CguPage() {
  return (
    <LegalShell
      title="Conditions générales d'utilisation"
      current="/cgu"
      intro={
        <p>
          Les présentes Conditions générales d&apos;utilisation (les{" "}
          <strong>«&nbsp;CGU&nbsp;»</strong>) régissent l&apos;utilisation de la
          plateforme <strong>Fidlify</strong> accessible à l&apos;adresse{" "}
          <a href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">
            {PUBLIC_SITE_URL}
          </a>
          . L&apos;utilisation du Service est strictement réservée à des{" "}
          <strong>professionnels</strong> (commerçants, artisans, prestataires
          de services et structures équivalentes).
        </p>
      }
    >
      <div className="legal-prose">
        <h2>1. Définitions</h2>
        <table>
          <thead>
            <tr>
              <th>Terme</th>
              <th>Définition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Fidlify</strong>
              </td>
              <td>
                L&apos;équipe éditrice du Service, identifiée dans les{" "}
                <Link href="/mentions-legales">Mentions légales</Link>.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Service</strong>
              </td>
              <td>
                La plateforme SaaS Fidlify et l&apos;ensemble de ses
                fonctionnalités (web app commerçant, génération de cartes
                wallet, scan, campagnes de notifications, statistiques).
              </td>
            </tr>
            <tr>
              <td>
                <strong>Site</strong>
              </td>
              <td>Le site web {PUBLIC_SITE_URL} et ses sous-domaines.</td>
            </tr>
            <tr>
              <td>
                <strong>Utilisateur</strong>
              </td>
              <td>
                Le professionnel ayant créé un compte sur le Service, agissant
                en qualité de commerçant ou prestataire.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Compte Administrateur</strong>
              </td>
              <td>Compte principal de l&apos;Utilisateur, doté de l&apos;ensemble des droits.</td>
            </tr>
            <tr>
              <td>
                <strong>Compte Staff</strong>
              </td>
              <td>
                Sous-compte créé par l&apos;Utilisateur pour ses
                collaborateurs, doté de droits restreints.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Client final</strong>
              </td>
              <td>
                La personne physique inscrite à un Programme par
                l&apos;intermédiaire d&apos;un Utilisateur, et porteuse
                d&apos;une Carte de fidélité.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Carte de fidélité</strong>
              </td>
              <td>
                Carte digitale wallet (Apple&nbsp;Wallet ou Google&nbsp;Wallet)
                émise au nom du Client final.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Programme</strong>
              </td>
              <td>
                Programme de fidélité paramétré par l&apos;Utilisateur (mode
                tampons, points ou cashback ; règles de récompense ; design).
              </td>
            </tr>
            <tr>
              <td>
                <strong>Plan</strong>
              </td>
              <td>Formule d&apos;abonnement souscrite (Gratuit, Essentiel, Croissance, Multi-sites).</td>
            </tr>
          </tbody>
        </table>

        <h2>2. Objet</h2>
        <p>
          Les CGU ont pour objet de définir les conditions et modalités
          d&apos;accès au Service, ainsi que les droits et obligations
          respectifs de Fidlify et de l&apos;Utilisateur.
        </p>
        <p>Le Service permet à l&apos;Utilisateur de&nbsp;:</p>
        <ul>
          <li>créer et personnaliser un ou plusieurs Programmes de fidélité digitaux&nbsp;;</li>
          <li>générer des Cartes de fidélité compatibles Apple&nbsp;Wallet et Google&nbsp;Wallet&nbsp;;</li>
          <li>enregistrer et identifier ses Clients finaux&nbsp;;</li>
          <li>attribuer des récompenses (tampons, points, cashback)&nbsp;;</li>
          <li>envoyer des campagnes de notifications push à ses Clients finaux&nbsp;;</li>
          <li>consulter des indicateurs de performance de ses Programmes.</li>
        </ul>

        <h2>3. Acceptation et opposabilité</h2>
        <p>
          L&apos;inscription au Service implique l&apos;acceptation{" "}
          <strong>pleine et entière, sans réserve</strong> des présentes CGU.
        </p>
        <p>
          Lors de la création de son compte, l&apos;Utilisateur valide une case
          à cocher indiquant qu&apos;il a lu, compris et accepté les présentes
          CGU et la{" "}
          <Link href="/politique-de-confidentialite">
            Politique de confidentialité
          </Link>
          . Cette acceptation est horodatée et conservée à titre de preuve.
        </p>
        <p>
          Les CGU s&apos;imposent à l&apos;Utilisateur ainsi qu&apos;à tous les
          Comptes Staff qu&apos;il crée ou autorise, dont il demeure entièrement
          responsable.
        </p>

        <h2>4. Conditions d&apos;éligibilité</h2>
        <p>Pour s&apos;inscrire au Service, l&apos;Utilisateur doit&nbsp;:</p>
        <ul>
          <li>
            être une <strong>personne morale</strong> régulièrement immatriculée
            ou une <strong>personne physique</strong> majeure exerçant une
            activité professionnelle indépendante&nbsp;;
          </li>
          <li>
            agir dans le cadre de son activité commerciale, artisanale ou
            professionnelle&nbsp;;
          </li>
          <li>disposer de la <strong>capacité juridique</strong>&nbsp;;</li>
          <li>
            communiquer des informations d&apos;inscription{" "}
            <strong>exactes, complètes et à jour</strong>&nbsp;;
          </li>
          <li>accepter les présentes CGU.</li>
        </ul>
        <p>
          Fidlify se réserve le droit de refuser une inscription ou de suspendre
          un compte si l&apos;une de ces conditions n&apos;est pas remplie.
        </p>

        <h2>5. Création et gestion du compte</h2>
        <h3>5.1 Inscription</h3>
        <p>L&apos;Utilisateur s&apos;inscrit en renseignant a minima&nbsp;:</p>
        <ul>
          <li>une adresse électronique valide&nbsp;;</li>
          <li>
            un mot de passe robuste (au moins 12 caractères, conformément aux
            recommandations NIST)&nbsp;;
          </li>
          <li>le nom de son établissement.</li>
        </ul>
        <p>Une vérification par lien email peut être requise pour activer le compte.</p>

        <h3>5.2 Sécurité du compte</h3>
        <p>L&apos;Utilisateur s&apos;engage à&nbsp;:</p>
        <ul>
          <li>conserver ses identifiants <strong>strictement confidentiels</strong>&nbsp;;</li>
          <li>ne pas partager son mot de passe&nbsp;;</li>
          <li>
            informer Fidlify <strong>sans délai</strong> de toute utilisation
            non autorisée du compte ou de toute atteinte à la sécurité&nbsp;;
          </li>
          <li>activer l&apos;authentification à deux facteurs lorsqu&apos;elle est proposée.</li>
        </ul>

        <h3>5.3 Comptes Staff</h3>
        <p>
          L&apos;Utilisateur peut créer des Comptes Staff dans la limite prévue
          par son Plan. L&apos;Utilisateur principal demeure responsable du
          paramétrage des droits, des actions effectuées par les Staff et de la
          révocation immédiate des accès en cas de départ d&apos;un collaborateur.
        </p>

        <h2>6. Description et étendue du Service</h2>
        <h3>6.1 Fonctionnalités selon le Plan</h3>
        <p>
          Les fonctionnalités disponibles dépendent du Plan souscrit. Le détail
          des Plans (Gratuit, Essentiel, Croissance, Multi-sites) ainsi que
          leurs limites figurent sur la <Link href="/#pricing">page tarifs</Link>.
        </p>

        <h3>6.2 Évolutions du Service</h3>
        <p>
          Fidlify peut faire évoluer le Service à tout moment&nbsp;: ajouts,
          améliorations, corrections, suppressions de fonctionnalités obsolètes.
          La suppression d&apos;une fonctionnalité substantielle ne pourra
          intervenir qu&apos;avec un{" "}
          <strong>préavis raisonnable de 30 jours minimum</strong>.
        </p>

        <h3>6.3 Intégrations tierces</h3>
        <p>
          Le Service repose sur des technologies tierces, notamment{" "}
          <strong>Apple&nbsp;Wallet</strong>, <strong>Google&nbsp;Wallet</strong>{" "}
          et <strong>Stripe</strong>. Fidlify ne saurait être tenue responsable
          des évolutions ou interruptions imposées par ces tiers.
        </p>

        <h2>7. Engagements de Fidlify</h2>
        <p>Fidlify s&apos;engage à&nbsp;:</p>
        <ul>
          <li>fournir le Service avec diligence (obligation de moyens)&nbsp;;</li>
          <li>
            héberger les données sur des infrastructures sécurisées situées en
            Suisse (Infomaniak Network SA)&nbsp;;
          </li>
          <li>traiter les Données client conformément à la nLPD et au RGPD&nbsp;;</li>
          <li>
            mettre à disposition de l&apos;Utilisateur les outils permettant à
            ses Clients finaux d&apos;exercer leurs droits&nbsp;;
          </li>
          <li>
            informer l&apos;Utilisateur des incidents de sécurité majeurs dans
            les délais prévus par la réglementation.
          </li>
        </ul>

        <h3>7.1 Disponibilité du Service (best effort)</h3>
        <p>
          Fidlify met en œuvre tous les moyens raisonnables pour assurer la
          disponibilité du Service,{" "}
          <strong>
            sans toutefois s&apos;engager sur un taux de disponibilité chiffré
          </strong>
          .
        </p>

        <h3>7.2 Maintenance</h3>
        <p>
          Sauf urgence, les opérations de maintenance sont annoncées avec un{" "}
          <strong>préavis minimum de 24 heures</strong> par email ou
          notification.
        </p>

        <h2>8. Engagements de l&apos;Utilisateur</h2>
        <h3>8.1 Obligations relatives aux Clients finaux</h3>
        <p>
          En sa qualité de Responsable de traitement vis-à-vis de ses Clients
          finaux, l&apos;Utilisateur s&apos;engage à&nbsp;:
        </p>
        <ul>
          <li>
            <strong>informer</strong> ses Clients finaux du traitement de leurs
            données conformément à la nLPD/RGPD&nbsp;;
          </li>
          <li>
            <strong>recueillir leur consentement</strong> libre, éclairé,
            spécifique et univoque pour les traitements le nécessitant
            (marketing, géolocalisation)&nbsp;;
          </li>
          <li>
            <strong>ne pas envoyer</strong> de notifications, emails ou SMS aux
            Clients finaux qui s&apos;y sont opposés&nbsp;;
          </li>
          <li>
            ne pas utiliser les Données client à des fins illicites, déloyales
            ou discriminatoires&nbsp;;
          </li>
          <li>
            répondre dans les délais légaux aux demandes d&apos;exercice de
            droits de ses Clients finaux.
          </li>
        </ul>

        <h3>8.2 Obligations relatives au contenu publié</h3>
        <p>
          L&apos;Utilisateur s&apos;interdit de publier ou diffuser via le
          Service tout contenu&nbsp;:
        </p>
        <ul>
          <li>
            illégal au regard de la loi suisse, française ou de l&apos;Union
            européenne&nbsp;;
          </li>
          <li>portant atteinte à l&apos;ordre public ou aux bonnes mœurs&nbsp;;</li>
          <li>à caractère violent, pornographique ou impliquant des mineurs&nbsp;;</li>
          <li>discriminatoire, haineux ou incitant à la violence&nbsp;;</li>
          <li>
            portant atteinte aux droits de propriété intellectuelle d&apos;un
            tiers&nbsp;;
          </li>
          <li>de nature trompeuse ou frauduleuse.</li>
        </ul>

        <h3>8.3 Comportements interdits</h3>
        <ul>
          <li>contourner les limites techniques de son Plan&nbsp;;</li>
          <li>
            revendre, sous-louer ou mettre à disposition le Service à un tiers
            sans accord écrit&nbsp;;
          </li>
          <li>rétro-ingénierer, décompiler ou tenter d&apos;accéder au code source&nbsp;;</li>
          <li>porter atteinte à la sécurité ou à la stabilité du Service&nbsp;;</li>
          <li>utiliser le Service pour envoyer du spam.</li>
        </ul>

        <h3>8.4 Avis Google et avis en ligne</h3>
        <p>
          Si l&apos;Utilisateur active la fonctionnalité de récompense liée aux
          avis Google, il s&apos;engage à&nbsp;:
        </p>
        <ul>
          <li>
            <strong>ne jamais conditionner</strong> l&apos;attribution de la
            récompense au caractère <strong>positif</strong> de l&apos;avis
            (cette pratique, dite «&nbsp;<em>review gating</em>&nbsp;», est
            illégale dans l&apos;Union européenne)&nbsp;;
          </li>
          <li>
            attribuer la récompense <strong>dès lors que l&apos;avis est posté</strong>,
            indépendamment de la note ou du contenu&nbsp;;
          </li>
          <li>afficher cette mention de manière claire et visible auprès de ses Clients finaux.</li>
        </ul>

        <h3>8.5 Mineurs</h3>
        <p>
          L&apos;Utilisateur ne doit pas inscrire à ses Programmes des Clients
          finaux <strong>âgés de moins de 16 ans</strong> sans avoir obtenu le
          consentement préalable de leurs représentants légaux. L&apos;Utilisateur
          exerçant une activité réglementée (alcool, tabac, jeux d&apos;argent)
          s&apos;engage à ne pas inscrire de Clients finaux mineurs.
        </p>

        <h2>9. Modération et signalement</h2>
        <p>
          Fidlify n&apos;effectue <strong>pas</strong> de modération a priori du
          contenu publié. L&apos;Utilisateur demeure seul responsable du contenu
          qu&apos;il publie.
        </p>
        <p>
          Toute personne peut signaler un contenu illicite, abusif ou contraire
          aux CGU en écrivant à&nbsp;:{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
            <strong>{PUBLIC_CONTACT_EMAIL}</strong>
          </a>
          .
        </p>
        <p>
          Fidlify accuse réception du signalement et l&apos;examine dans un{" "}
          <strong>délai de 48 à 72 heures ouvrées</strong>. Selon la gravité,
          Fidlify peut adresser un avertissement, supprimer le contenu, suspendre
          ou résilier le compte.
        </p>
        <p>
          Fidlify se réserve le droit de <strong>suspendre immédiatement et
          sans préavis</strong> en cas de contenu manifestement illicite, de
          fraude, d&apos;atteinte à la sécurité du Service ou de réquisition par
          une autorité compétente.
        </p>

        <h2>10. Propriété intellectuelle</h2>
        <h3>10.1 Sur le Service</h3>
        <p>
          L&apos;ensemble des éléments composant le Service est la{" "}
          <strong>propriété exclusive</strong> de Fidlify ou de ses partenaires.
          Aucune disposition des présentes CGU ne saurait être interprétée
          comme un transfert de propriété au profit de l&apos;Utilisateur.
        </p>
        <p>
          Fidlify concède à l&apos;Utilisateur, pour la durée du contrat, une
          licence personnelle, non exclusive, non cessible et non transmissible
          d&apos;utilisation du Service.
        </p>

        <h3>10.2 Sur les contenus de l&apos;Utilisateur</h3>
        <p>
          L&apos;Utilisateur conserve la <strong>pleine propriété</strong> des
          contenus qu&apos;il publie sur le Service (logo, design de carte,
          textes de campagne, base de Données client). Il concède toutefois à
          Fidlify, pour la durée du contrat et pour la stricte exécution du
          Service, une licence non exclusive, mondiale et gratuite d&apos;usage
          et d&apos;affichage de ces contenus.
        </p>

        <h3>10.3 Référence commerciale</h3>
        <p>
          Fidlify peut, sauf opposition écrite à{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>,
          mentionner le nom et le logo de l&apos;Utilisateur dans sa
          communication commerciale à titre de <strong>référence client</strong>.
        </p>

        <h2>11. Données personnelles</h2>
        <p>
          Le traitement des données personnelles dans le cadre du Service est
          régi par la{" "}
          <Link href="/politique-de-confidentialite">
            Politique de confidentialité
          </Link>
          .
        </p>
        <p>
          L&apos;Utilisateur reconnaît avoir pris connaissance de ce document et
          l&apos;avoir accepté au moment de son inscription.
        </p>

        <h2>12. Données agrégées et anonymisées</h2>
        <p>
          Fidlify peut utiliser des <strong>données agrégées et anonymisées</strong>{" "}
          issues de l&apos;usage du Service pour produire des analyses
          sectorielles, améliorer le Service et alimenter sa communication
          marketing.
        </p>
        <p>
          L&apos;utilisation des données agrégées de l&apos;Utilisateur à des
          fins <strong>autres</strong> que le fonctionnement direct du Service
          (publication de benchmarks, partage avec des partenaires) est
          subordonnée au <strong>consentement explicite préalable</strong>{" "}
          de l&apos;Utilisateur, exprimé via une option dédiée dans ses
          paramètres de compte. Ce consentement peut être retiré à tout moment
          sans rétroactivité.
        </p>

        <h2>13. Inactivité et suppression du compte gratuit</h2>
        <p>
          Un compte sur le <strong>Plan Gratuit</strong> est considéré comme
          inactif si <strong>aucun scan de carte n&apos;a été effectué depuis
          plus de 12 mois consécutifs</strong>.
        </p>
        <p>
          En cas d&apos;inactivité prolongée, un email d&apos;avertissement est
          envoyé à <strong>J-30</strong> et un dernier rappel à{" "}
          <strong>J-7</strong>. À <strong>J-0</strong>, le compte et les
          Données client associées sont supprimés, à l&apos;exception des
          données dont la conservation est légalement obligatoire (factures,
          conservées 10 ans).
        </p>
        <p>
          L&apos;Utilisateur peut <strong>réactiver son compte à tout moment</strong>{" "}
          avant la suppression effective.
        </p>

        <h2>14. Suspension et résiliation</h2>
        <h3>14.1 Résiliation par l&apos;Utilisateur</h3>
        <p>
          L&apos;Utilisateur peut résilier son compte à tout moment depuis son
          espace personnel ou par email à{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
          La résiliation prend effet immédiatement pour le Plan Gratuit.
        </p>

        <h3>14.2 Résiliation par Fidlify</h3>
        <p>
          Fidlify peut résilier le compte avec <strong>préavis de 30 jours</strong>{" "}
          par email, ou <strong>immédiatement et sans préavis</strong> en cas de
          manquement grave aux CGU.
        </p>

        <h3>14.3 Effets de la résiliation</h3>
        <ul>
          <li>fin immédiate de l&apos;accès au Service&nbsp;;</li>
          <li>
            désactivation des Cartes de fidélité actives, avec mise à jour des
            wallets pour informer les Clients finaux&nbsp;;
          </li>
          <li>
            mise à disposition pendant <strong>90 jours</strong> des données via
            export téléchargeable&nbsp;;
          </li>
          <li>
            suppression définitive des données 90 jours après la résiliation,
            sauf obligations légales contraires.
          </li>
        </ul>

        <h2>15. Limitation de responsabilité</h2>
        <p>
          Le Service est utilisé par l&apos;Utilisateur sous sa{" "}
          <strong>seule et entière responsabilité</strong>. Fidlify n&apos;a
          qu&apos;une <strong>obligation de moyens</strong>.
        </p>
        <p>Fidlify ne saurait être tenue pour responsable&nbsp;:</p>
        <ul>
          <li>
            des interruptions ou dysfonctionnements indépendants de sa volonté
            (panne réseau, attaque, défaillance d&apos;un sous-traitant, force
            majeure)&nbsp;;
          </li>
          <li>
            des dommages indirects (perte de chiffre d&apos;affaires, perte de
            clientèle, atteinte à l&apos;image)&nbsp;;
          </li>
          <li>des erreurs ou omissions dans les contenus publiés par l&apos;Utilisateur&nbsp;;</li>
          <li>du comportement de tiers&nbsp;;</li>
          <li>
            des conséquences fiscales, comptables ou juridiques pour
            l&apos;Utilisateur de l&apos;utilisation du Service.
          </li>
        </ul>
        <p>
          En tout état de cause, et sauf en cas de faute lourde ou
          intentionnelle, la responsabilité totale de Fidlify ne pourra excéder,
          toutes causes confondues, le montant des sommes effectivement payées
          par l&apos;Utilisateur au cours des <strong>12 mois précédant</strong>{" "}
          le fait générateur du dommage.
        </p>

        <h2>16. Force majeure</h2>
        <p>
          Aucune des parties ne pourra être tenue pour responsable d&apos;un
          manquement à ses obligations résultant d&apos;un cas de{" "}
          <strong>force majeure</strong> au sens de l&apos;art.&nbsp;119 CO
          suisse. Si la situation persiste plus de <strong>30 jours</strong>,
          chaque partie pourra résilier le contrat sans indemnité.
        </p>

        <h2>17. Modifications des CGU</h2>
        <p>
          Les modifications seront notifiées par email et par notification dans
          le tableau de bord. Elles prennent effet <strong>30 jours</strong>{" "}
          après leur notification. Pendant ce délai, l&apos;Utilisateur peut, s&apos;il
          refuse les modifications, résilier son compte sans frais ni préavis.
        </p>

        <h2>18. Cession</h2>
        <p>
          L&apos;Utilisateur ne peut céder ses droits et obligations sans
          l&apos;accord écrit préalable de Fidlify. Fidlify peut librement céder
          ses droits à toute société du même groupe ou en cas de
          fusion-acquisition, sous réserve d&apos;information préalable et de
          continuité du Service.
        </p>

        <h2>19. Notifications</h2>
        <p>
          Les communications entre Fidlify et l&apos;Utilisateur sont effectuées
          par voie électronique : de Fidlify vers l&apos;Utilisateur à
          l&apos;email renseigné dans son compte&nbsp;; de l&apos;Utilisateur
          vers Fidlify à{" "}
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
        </p>

        <h2>20. Indépendance des clauses</h2>
        <p>
          Si une ou plusieurs clauses étaient déclarées nulles ou inapplicables,
          les autres clauses conserveraient toute leur force et leur portée. Les
          parties s&apos;engagent à négocier de bonne foi le remplacement de la
          clause invalidée.
        </p>

        <h2>21. Loi applicable et juridiction</h2>
        <p>
          Les présentes CGU sont régies par le <strong>droit suisse</strong>, à
          l&apos;exclusion de ses règles de conflit de lois.
        </p>
        <p>
          Tout litige relatif à leur formation, à leur exécution ou à leur
          interprétation relèvera de la compétence exclusive des{" "}
          <strong>tribunaux suisses compétents</strong>, sous réserve des règles
          impératives de protection des consommateurs résidant dans
          l&apos;Union européenne.
        </p>
        <p>
          Avant toute action contentieuse, les parties s&apos;engagent à tenter
          une <strong>résolution amiable</strong> du litige par voie de
          négociation, pendant un délai minimum de 30 jours à compter de la
          première mise en demeure.
        </p>

        <h2>22. Contact</h2>
        <p>Pour toute question relative aux présentes CGU&nbsp;:</p>
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
