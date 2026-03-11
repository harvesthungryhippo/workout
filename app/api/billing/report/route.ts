import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canManageBilling } from "@/lib/auth/permissions";
import { BillingCycle, BillingStatus, UserRole } from "@prisma/client";

async function getBillingReport(req: AuthedRequest) {
  if (!canManageBilling(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "business"; // "platform" | "business"

  if (scope === "platform") {
    if (req.session.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden. Platform reports require Super Admin." }, { status: 403 });
    }
    return platformReport();
  }

  return businessReport(req.session.businessId);
}

async function businessReport(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  });

  const sub = await prisma.subscription.findUnique({
    where: { businessId },
    select: {
      plan: true,
      billingCycle: true,
      status: true,
      currentPeriodEnd: true,
      paymentMethodBrand: true,
      paymentMethodLast4: true,
    },
  });

  const invoices = await prisma.invoice.findMany({
    where: { businessId },
    orderBy: { issuedAt: "desc" },
    select: {
      invoiceNumber: true,
      total: true,
      issuedAt: true,
      isVoided: true,
      isCreditNote: true,
    },
  });

  const totalPaid = invoices
    .filter((i) => !i.isVoided && !i.isCreditNote)
    .reduce((sum, i) => sum + Number(i.total), 0);

  return NextResponse.json({
    business: business?.name,
    subscription: sub,
    totalPaid: totalPaid.toFixed(2),
    invoices,
  });
}

async function platformReport() {
  const [subscriptions, payments, trials] = await Promise.all([
    prisma.subscription.findMany({ select: { plan: true, billingCycle: true, status: true } }),
    prisma.payment.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      select: { amount: true, succeeded: true },
    }),
    prisma.business.count({ where: { status: "TRIAL" } }),
  ]);

  const active = subscriptions.filter((s) => s.status === BillingStatus.ACTIVE);

  const mrr = active.reduce((sum, s) => {
    const monthly = s.billingCycle === BillingCycle.MONTHLY;
    const prices: Record<string, number> = { STARTER: 49, GROWTH: 149, PRO: 399 };
    const price = prices[s.plan] ?? 0;
    return sum + (monthly ? price : price / 12);
  }, 0);

  const byPlan = ["STARTER", "GROWTH", "PRO"].map((plan) => ({
    plan,
    count: active.filter((s) => s.plan === plan).length,
  }));

  const successfulPayments = payments.filter((p) => p.succeeded);
  const failedPayments     = payments.filter((p) => !p.succeeded);
  const totalRevenue       = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return NextResponse.json({
    activeSubscriptions: active.length,
    activeTrials: trials,
    mrr: mrr.toFixed(2),
    arr: (mrr * 12).toFixed(2),
    totalRevenueThisMonth: totalRevenue.toFixed(2),
    byPlan,
    payments: {
      successful: successfulPayments.length,
      failed: failedPayments.length,
      recoveryRate: successfulPayments.length
        ? ((successfulPayments.length / payments.length) * 100).toFixed(1) + "%"
        : "N/A",
    },
  });
}

export const GET = withAuth(getBillingReport);
