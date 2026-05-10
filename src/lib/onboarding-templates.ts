/**
 * Templates de programmes pré-remplis pour l'onboarding wizard.
 * Le commerçant choisit un template proche de son activité, le formulaire
 * est pré-rempli, il peut tout customiser avant validation.
 *
 * Tous les templates sont en mode STAMPS (le seul autorisé sur plan FREE).
 */

export type OnboardingTemplate = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  /** Nom par défaut du programme. */
  programName: string;
  type: "STAMPS";
  config: { maxStamps: number };
  reward: {
    name: string;
    description: string;
    threshold: number;
    rewardType: "FREE_ITEM" | "DISCOUNT_CHF" | "DISCOUNT_PCT";
  };
  cardDesign: {
    bgColor: string;
    textColor: string;
  };
};

export const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: "cafe-10",
    emoji: "☕",
    title: "Café",
    subtitle: "Le 10ᵉ café offert",
    programName: "Carte café fidélité",
    type: "STAMPS",
    config: { maxStamps: 10 },
    reward: {
      name: "1 café offert",
      description: "Boisson chaude au choix",
      threshold: 10,
      rewardType: "FREE_ITEM",
    },
    cardDesign: {
      bgColor: "#3e2723",
      textColor: "#ffffff",
    },
  },
  {
    id: "restaurant-8",
    emoji: "🍽️",
    title: "Restaurant",
    subtitle: "Le 8ᵉ plat offert",
    programName: "Carte fidélité restaurant",
    type: "STAMPS",
    config: { maxStamps: 8 },
    reward: {
      name: "Plat offert",
      description: "Plat principal au choix",
      threshold: 8,
      rewardType: "FREE_ITEM",
    },
    cardDesign: {
      bgColor: "#1a1a2e",
      textColor: "#ffffff",
    },
  },
  {
    id: "coiffeur-5",
    emoji: "✂️",
    title: "Salon de coiffure",
    subtitle: "Coupe offerte après 5 visites",
    programName: "Carte salon de coiffure",
    type: "STAMPS",
    config: { maxStamps: 5 },
    reward: {
      name: "Coupe offerte",
      description: "1 coupe homme ou femme offerte",
      threshold: 5,
      rewardType: "FREE_ITEM",
    },
    cardDesign: {
      bgColor: "#212121",
      textColor: "#d4ff4e",
    },
  },
  {
    id: "boulangerie-10",
    emoji: "🥐",
    title: "Boulangerie",
    subtitle: "Le 10ᵉ pain offert",
    programName: "Carte fidélité boulangerie",
    type: "STAMPS",
    config: { maxStamps: 10 },
    reward: {
      name: "1 pain offert",
      description: "1 pain de votre choix",
      threshold: 10,
      rewardType: "FREE_ITEM",
    },
    cardDesign: {
      bgColor: "#8d6e63",
      textColor: "#ffffff",
    },
  },
  {
    id: "institut-6",
    emoji: "💆",
    title: "Institut de beauté",
    subtitle: "Soin offert après 6 soins",
    programName: "Carte fidélité institut",
    type: "STAMPS",
    config: { maxStamps: 6 },
    reward: {
      name: "Soin offert",
      description: "1 soin signature au choix",
      threshold: 6,
      rewardType: "FREE_ITEM",
    },
    cardDesign: {
      bgColor: "#ec407a",
      textColor: "#ffffff",
    },
  },
  {
    id: "boutique-10",
    emoji: "🛍️",
    title: "Boutique",
    subtitle: "10% de remise après 10 achats",
    programName: "Carte fidélité boutique",
    type: "STAMPS",
    config: { maxStamps: 10 },
    reward: {
      name: "10% de remise",
      description: "Bon de 10% sur votre prochain achat",
      threshold: 10,
      rewardType: "DISCOUNT_PCT",
    },
    cardDesign: {
      bgColor: "#283593",
      textColor: "#ffffff",
    },
  },
];

/** Récupère un template par ID. */
export function getTemplate(id: string): OnboardingTemplate | undefined {
  return ONBOARDING_TEMPLATES.find((t) => t.id === id);
}
