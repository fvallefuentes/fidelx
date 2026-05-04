import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}

// Mapping plan_code Stripe → enum Plan Prisma
export const STRIPE_PLAN_CODE_MAP: Record<string, string> = {
  essential:   "ESSENTIAL",
  growth:      "GROWTH",
  multi_sites: "MULTI_SITE",
};
