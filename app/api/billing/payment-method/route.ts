import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canManageBilling } from "@/lib/auth/permissions";
import { getStripe } from "@/lib/api/stripe";
import { BillingStatus, UserRole } from "@prisma/client";

const addSchema = z.object({
  action: z.enum(["add", "remove"]),
  stripePaymentMethodId: z.string().optional(),
});

async function managePaymentMethod(req: AuthedRequest) {
  if (!canManageBilling(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: z.infer<typeof addSchema>;
  try {
    body = addSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { businessId: req.session.businessId },
  });
  if (!sub) return NextResponse.json({ error: "No subscription found." }, { status: 404 });

  const stripe = getStripe();

  // ── ADD / UPDATE ──────────────────────────────────────────────────────────
  if (body.action === "add") {
    if (!body.stripePaymentMethodId) {
      return NextResponse.json({ error: "stripePaymentMethodId is required." }, { status: 400 });
    }

    // Attach to Stripe customer
    const pm = await stripe.paymentMethods.attach(body.stripePaymentMethodId, {
      customer: sub.stripeCustomerId,
    });

    // Set as default
    await stripe.customers.update(sub.stripeCustomerId, {
      invoice_settings: { default_payment_method: pm.id },
    });

    const last4 = pm.card?.last4 ?? null;
    const brand = pm.card?.brand ?? null;

    await prisma.subscription.update({
      where: { businessId: req.session.businessId },
      data: { paymentMethodLast4: last4, paymentMethodBrand: brand },
    });

    return NextResponse.json({
      message: `Payment method updated. ${brand} ending in ${last4} is now your default.`,
    });
  }

  // ── REMOVE ────────────────────────────────────────────────────────────────
    // Block removal if subscription is active or past due
    if ((new Set<BillingStatus>([BillingStatus.ACTIVE, BillingStatus.PAST_DUE])).has(sub.status)) {
      return NextResponse.json(
        { error: "Cannot remove your payment method while you have an active subscription." },
        { status: 400 }
      );
    }

    // Detach all payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: sub.stripeCustomerId,
      type: "card",
    });

    for (const pm of paymentMethods.data) {
      await stripe.paymentMethods.detach(pm.id);
    }

    await prisma.subscription.update({
      where: { businessId: req.session.businessId },
      data: { paymentMethodLast4: null, paymentMethodBrand: null },
    });

    return NextResponse.json({ message: "Payment method removed." });
}

export const POST = withAuth(managePaymentMethod);
