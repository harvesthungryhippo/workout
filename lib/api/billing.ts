import { prisma } from "@/lib/db/prisma";
import { BillingStatus, BusinessStatus, PaymentReason } from "@prisma/client";
import { PLAN_PRICES } from "@/lib/api/stripe";

// ─── Invoice number sequence ──────────────────────────────────────────────────

export async function nextInvoiceNumber(businessId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { businessId } });
  const short = businessId.slice(-6).toUpperCase();
  return `INV-${short}-${String(count + 1).padStart(4, "0")}`;
}

// ─── Create invoice after successful payment ──────────────────────────────────

export async function createInvoice(
  businessId: string,
  paymentId: string,
  amount: number
) {
  const invoiceNumber = await nextInvoiceNumber(businessId);
  const retainUntil = new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000); // 7 years

  return prisma.invoice.create({
    data: {
      businessId,
      paymentId,
      invoiceNumber,
      amount,
      tax: 0,
      total: amount,
      retainUntil,
    },
  });
}

// ─── Record a payment (success or failure) ───────────────────────────────────

export async function recordPayment(
  subscriptionId: string,
  amount: number,
  reason: PaymentReason,
  stripeChargeId: string,
  succeeded: boolean,
  failureReason?: string
) {
  return prisma.payment.create({
    data: { subscriptionId, amount, reason, stripeChargeId, succeeded, failureReason },
  });
}

// ─── Advance billing period ───────────────────────────────────────────────────

export async function advanceBillingPeriod(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return;

  const isMonthly = sub.billingCycle === "MONTHLY";
  const next = new Date(sub.currentPeriodEnd);
  isMonthly ? next.setMonth(next.getMonth() + 1) : next.setFullYear(next.getFullYear() + 1);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      currentPeriodStart: sub.currentPeriodEnd,
      currentPeriodEnd:   next,
      status:             BillingStatus.ACTIVE,
      failedAttempts:     0,
      firstFailedAt:      null,
      nextRetryAt:        null,
    },
  });
}

// ─── Dunning: schedule next retry ────────────────────────────────────────────

const RETRY_DAYS = [1, 3, 7, 10]; // days after first failure

export async function scheduleNextRetry(subscriptionId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || !sub.firstFailedAt) return false;

  const daysSinceFirstFail = Math.floor(
    (Date.now() - sub.firstFailedAt.getTime()) / 86_400_000
  );

  const nextDay = RETRY_DAYS.find((d) => d > daysSinceFirstFail);

  if (!nextDay) {
    // Exhausted all retries — suspend
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: BillingStatus.PAUSED, nextRetryAt: null },
      }),
      prisma.business.updateMany({
        where: { subscription: { id: subscriptionId } },
        data: { status: BusinessStatus.SUSPENDED },
      }),
    ]);
    return false; // signals suspension
  }

  const nextRetryAt = new Date(sub.firstFailedAt.getTime() + nextDay * 86_400_000);
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { nextRetryAt, failedAttempts: { increment: 1 } },
  });

  return true; // still in dunning
}

// ─── Activate subscription after trial converts ───────────────────────────────

export async function activateSubscription(businessId: string, stripePriceId: string) {
  await prisma.business.update({
    where: { id: businessId },
    data: { status: BusinessStatus.ACTIVE },
  });
}

// ─── Get amount for a plan/cycle ─────────────────────────────────────────────

export function planAmount(plan: string, cycle: "MONTHLY" | "ANNUAL"): number {
  const prices = PLAN_PRICES[plan];
  if (!prices) throw new Error(`Unknown plan: ${plan}`);
  return cycle === "MONTHLY" ? prices.monthly : prices.annual;
}
