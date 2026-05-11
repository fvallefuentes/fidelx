/**
 * Templates de campagnes pré-écrites. Le commerçant peut partir d'un template
 * et le personnaliser. Variables : {firstName} remplacée par le prénom client
 * côté wallet (au moment du push). Pour l'instant on stocke le placeholder tel
 * quel — le commerçant peut le retirer s'il préfère un message générique.
 *
 * Chaque template a :
 * - title : nom affiché dans la galerie
 * - emoji : pour repérage visuel
 * - description : contexte d'usage
 * - name : nom auto-rempli de la campagne
 * - message : texte du push (max 240 chars conseillé)
 * - triggerType : recommandé (l'utilisateur peut changer)
 * - targetSegment : recommandé
 */

export type CampaignTemplate = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  name: string;
  message: string;
  triggerType:
    | "IMMEDIATE"
    | "SCHEDULED"
    | "INACTIVITY"
    | "POST_STAMP"
    | "MILESTONE"
    | "BIRTHDAY";
  targetSegment: "ALL" | "ACTIVE" | "DORMANT" | "NEW" | "VIP";
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "birthday",
    emoji: "🎂",
    title: "Anniversaire client",
    description: "Envoyé automatiquement 7 jours avant l'anniversaire d'un client.",
    name: "Anniversaire — Cadeau J-7",
    message:
      "🎂 Joyeux anniversaire bientôt ! Une boisson offerte t'attend cette semaine en boutique. À très vite.",
    triggerType: "BIRTHDAY",
    targetSegment: "ALL",
  },
  {
    id: "winback-30",
    emoji: "🔄",
    title: "Win-back 30 jours",
    description: "Relance les clients qui n'ont pas visité depuis 30+ jours.",
    name: "Reviens nous voir — Offre spéciale",
    message:
      "On ne t'a pas vu depuis un moment ! 🥺 Pour ton retour : -10% sur ta prochaine commande cette semaine.",
    triggerType: "INACTIVITY",
    targetSegment: "DORMANT",
  },
  {
    id: "new-menu",
    emoji: "🆕",
    title: "Nouveau menu / produit",
    description: "Annonce un nouveau produit ou une nouvelle gamme.",
    name: "Nouveauté en boutique",
    message:
      "🆕 Notre nouveau menu d'automne arrive ! Découvre les nouveautés avant tout le monde. Ouvert demain dès 8h.",
    triggerType: "IMMEDIATE",
    targetSegment: "ALL",
  },
  {
    id: "weekend-promo",
    emoji: "🎉",
    title: "Promo weekend",
    description: "Boost les ventes du samedi/dimanche avec une promo flash.",
    name: "Weekend exclusif",
    message:
      "🎉 Promo weekend : -15% sur tout le menu samedi et dimanche. Réservé aux porteurs de carte fidélité !",
    triggerType: "IMMEDIATE",
    targetSegment: "ACTIVE",
  },
  {
    id: "happy-hour",
    emoji: "🍻",
    title: "Happy hour ce soir",
    description: "Envoyé en fin de journée pour booster le trafic de 17h-19h.",
    name: "Happy hour ce soir",
    message:
      "🍻 Happy hour de 17h à 19h aujourd'hui : 2 boissons pour le prix d'1 sur présentation de ta carte.",
    triggerType: "IMMEDIATE",
    targetSegment: "ALL",
  },
  {
    id: "welcome",
    emoji: "👋",
    title: "Bienvenue nouveau client",
    description: "Souhaite la bienvenue aux clients récemment inscrits.",
    name: "Bienvenue chez nous",
    message:
      "Bienvenue dans notre famille fidélité ! 👋 En cadeau de bienvenue : ton 2ᵉ café offert lors de ta prochaine visite.",
    triggerType: "IMMEDIATE",
    targetSegment: "NEW",
  },
  {
    id: "close-to-reward",
    emoji: "🎁",
    title: "Carte presque pleine",
    description: "Rappel aux clients à 1 ou 2 tampons de leur récompense.",
    name: "Encore un effort !",
    message:
      "Tu es à 1 tampon de ta récompense ! 🎁 Passe en boutique cette semaine pour la décrocher.",
    triggerType: "MILESTONE",
    targetSegment: "ACTIVE",
  },
  {
    id: "rainy-day",
    emoji: "☔",
    title: "Promo jour de pluie",
    description: "Idée : envoyer un mardi pluvieux pour remplir les tables.",
    name: "Petit creux ? On t'attend",
    message:
      "☔ Il pleut dehors ? Viens te réchauffer chez nous : -20% sur les boissons chaudes aujourd'hui seulement.",
    triggerType: "IMMEDIATE",
    targetSegment: "ALL",
  },
  {
    id: "season-greeting",
    emoji: "🎄",
    title: "Vœux de saison",
    description: "Pour Noël, Nouvel An, Saint-Valentin, fête des mères, etc.",
    name: "Vœux de saison",
    message:
      "Toute l'équipe te souhaite d'excellentes fêtes ! 🎄 Merci de ta fidélité tout au long de l'année.",
    triggerType: "SCHEDULED",
    targetSegment: "ALL",
  },
  {
    id: "event",
    emoji: "📅",
    title: "Évènement à venir",
    description: "Annonce d'une soirée, dégustation, ouverture exceptionnelle.",
    name: "Évènement à ne pas manquer",
    message:
      "📅 Soirée dégustation vendredi 20h : 5 nouveautés à découvrir, places limitées. Réserve par message !",
    triggerType: "SCHEDULED",
    targetSegment: "ACTIVE",
  },
];
