import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canManageBilling } from "@/lib/auth/permissions";
import { getStripe, PLAN_PRICES } from "@/lib/api/stripe";
import { BillingPlan, BillingCycle, BillingStatus, UserRole } from "@prisma/client";

const PLAN_RANK: Record<BillingPlan, number> = {
  STARTER: 1,
  GROWTH:  2,
  PRO:     3,
};

const schema = z.object({
  action:       z.enum(["upgrade", "downgrade", "cancel"]),
  newPlan:      z.nativeEnum(BillingPlan).optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
});

async function manageSubscription(req: AuthedRequest) {
  if (!canManageBilling(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { businessId: req.session.businessId },
  });

  if (!sub) return NextResponse.json({ error: "No active subscription found." }, { status: 404 });

  if (sub.status === BillingStatus.PAST_DUE) {
    return NextResponse.json({ error: "Please resolve your outstanding balance before making plan changes." }, { status: 400 });
  }

  // ── UPGRADE ──────────────────────────────────────────────────────────────
  if (body.action === "upgrade") {
    if (!body.newPlan) return NextResponse.json({ error: "newPlan is required for upgrades." }, { status: 400 });
    if (PLAN_RANK[body.newPlan] <= PLAN_RANK[sub.plan]) {
      return NextResponse.json({ error: "New plan must be higher than current plan." }, { status: 400 });
    }

    const stripe = getStripe();
    const cycle = body.billingCycle ?? sub.billingCycle;
    const daysRemaining = Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 86_400_000));
    const daysInPeriod = cycle === BillingCycle.MONTHLY ? 30 : 365;

    const oldPrice = PLAN_PRICES[sub.plan][cycle === BillingCycle.MONTHLY ? "monthly" : "annual"];
    const newPrice = PLAN_PRICES[body.newPlan][cycle === BillingCycle.MONTHLY ? "monthly" : "annual"];
    const proratedAmount = Math.round(((newPrice - oldPrice) * daysRemaining) / daysInPeriod);

    // Charge prorated amount
    const charge = await stripe.paymentIntents.create({
      amount: proratedAmount,
      currency: "usd",
      customer: sub.stripeCustomerId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { businessId: req.session.businessId, reason: "upgrade_proration" },
    });

    await prisma.$transaction([
      prisma.subscription.update({
        where: { businessId: req.session.businessId },
        data: { plan: body.newPlan, billingCycle: cycle },
      }),
      prisma.payment.create({
        data: {
          subscriptionId: sub.id,
          amount: proratedAmount / 100,
          reason: "UPGRADE_PRORATION",
          stripeChargeId: charge.id,
          succeeded: charge.status === "succeeded",
        },
      }),
    ]);

    return NextResponse.json({
      message: `Upgraded to ${body.newPlan}. Charged $${(proratedAmount / 100).toFixed(2)} for the remainder of the billing period.`,
    });
  }

  // ── DOWNGRADE ─────────────────────────────────────────────────────────────
  if (body.action === "downgrade") {
    if (!body.newPlan) return NextResponse.json({ error: "newPlan is required for downgrades." }, { status: 400 });
    if (PLAN_RANK[body.newPlan] >= PLAN_RANK[sub.plan]) {
      return NextResponse.json({ error: "New plan must be lower than current plan." }, { status: 400 });
    }

    await prisma.subscription.update({
      where: { businessId: req.session.businessId },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      message: `Downgrade to ${body.newPlan} scheduled. Takes effect on ${sub.currentPeriodEnd.toDateString()}.`,
      effectiveDate: sub.currentPeriodEnd,
    });
  }

  // ── CANCEL ───────────────────────────────────────────────────────────────
  await prisma.subscription.update({
    where: { businessId: req.session.businessId },
    data: { cancelAtPeriodEnd: true },
  });

  return NextResponse.json({
    message: `Subscription cancelled. Access continues until ${sub.currentPeriodEnd.toDateString()}. Data retained for 30 days after that.`,
    effectiveDate: sub.currentPeriodEnd,
  });
}

export const POST = withAuth(manageSubscription);
