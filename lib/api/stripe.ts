import Stripe from "stripe";

// Lazy singleton — only initializes when first used
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set.");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  STARTER: { monthly: 49_00,  annual: 490_00  },
  GROWTH:  { monthly: 149_00, annual: 1490_00 },
  PRO:     { monthly: 399_00, annual: 3990_00 },
};
