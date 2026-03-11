import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/api/stripe";
import { prisma } from "@/lib/db/prisma";
import {
  recordPayment,
  createInvoice,
  advanceBillingPeriod,
  scheduleNextRetry,
} from "@/lib/api/billing";
import { BillingStatus, BusinessStatus, PaymentReason } from "@prisma/client";

// Stripe requires the raw body for signature verification
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed.";
    console.error("[Webhook] Signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[Webhook] ${event.type}`);

  try {
    switch (event.type) {

      // ── Successful payment ───────────────────────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const businessId = pi.metadata?.businessId;
        if (!businessId) break;

        const sub = await prisma.subscription.findUnique({ where: { businessId } });
        if (!sub) break;

        const reason = (pi.metadata?.reason as PaymentReason) ?? PaymentReason.SUBSCRIPTION;
        const amount = pi.amount / 100;

        const payment = await recordPayment(sub.id, amount, reason, pi.id, true);
        await createInvoice(businessId, payment.id, amount);

        if (reason === PaymentReason.SUBSCRIPTION) {
          await advanceBillingPeriod(sub.id);
        }

        // If business was suspended, reactivate immediately
        if (sub.status === BillingStatus.PAUSED) {
          await prisma.$transaction([
            prisma.subscription.update({
              where: { id: sub.id },
              data: { status: BillingStatus.ACTIVE, failedAttempts: 0, firstFailedAt: null, nextRetryAt: null },
            }),
            prisma.business.update({
              where: { id: businessId },
              data: { status: BusinessStatus.ACTIVE },
            }),
          ]);
        }

        break;
      }

      // ── Failed payment ───────────────────────────────────────────────────
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const businessId = pi.metadata?.businessId;
        if (!businessId) break;

        const sub = await prisma.subscription.findUnique({ where: { businessId } });
        if (!sub) break;

        const reason = (pi.metadata?.reason as PaymentReason) ?? PaymentReason.SUBSCRIPTION;
        const failureReason =
          pi.last_payment_error?.message ?? "Payment declined.";

        await recordPayment(sub.id, pi.amount / 100, reason, pi.id, false, failureReason);

        // Hard decline — suspend immediately, skip dunning
        const hardDeclineCodes = ["card_declined", "stolen_card", "fraudulent"];
        const declineCode = pi.last_payment_error?.decline_code ?? "";

        if (hardDeclineCodes.includes(declineCode)) {
          await prisma.$transaction([
            prisma.subscription.update({
              where: { id: sub.id },
              data: { status: BillingStatus.PAUSED },
            }),
            prisma.business.update({
              where: { id: businessId },
              data: { status: BusinessStatus.SUSPENDED },
            }),
          ]);
          // TODO: notify Super Admin of hard decline
          break;
        }

        // Start or continue dunning
        if (!sub.firstFailedAt) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: BillingStatus.PAST_DUE,
              firstFailedAt: new Date(),
              failedAttempts: 1,
            },
          });
        } else {
          const stillInDunning = await scheduleNextRetry(sub.id);
          if (!stillInDunning) {
            // TODO: notify business of suspension
          }
        }

        // TODO: send failure notification email to business admin
        break;
      }

      // ── Subscription renewed via Stripe Billing (if using Stripe subs) ──
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (!customerId) break;

        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!sub) break;

        await advanceBillingPeriod(sub.id);
        break;
      }

      // ── Payment method updated in Stripe ────────────────────────────────
      case "customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        const defaultPmId =
          typeof customer.invoice_settings?.default_payment_method === "string"
            ? customer.invoice_settings.default_payment_method
            : null;

        if (!defaultPmId) break;

        const pm = await getStripe().paymentMethods.retrieve(defaultPmId);

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customer.id },
          data: {
            paymentMethodLast4: pm.card?.last4 ?? null,
            paymentMethodBrand: pm.card?.brand ?? null,
          },
        });
        break;
      }

      default:
        // Unhandled event — log and return 200 so Stripe doesn't retry
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Webhook] Handler error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
