import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// Mapping plan_code Stripe → enum Plan Prisma
export const STRIPE_PLAN_CODE_MAP: Record<string, string> = {
  essential:   "ESSENTIAL",
  growth:      "GROWTH",
  multi_sites: "MULTI_SITE",
};
