import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { isAtRisk, getAtRiskSignals, deriveStatus } from "@/lib/api/customerLogic";
import { CustomerStatus } from "@prisma/client";

async function getAtRisk(req: AuthedRequest) {
  const business = await prisma.business.findUnique({
    where: { id: req.session.businessId },
    select: { type: true, name: true },
  });

  const customers = await prisma.customer.findMany({
    where: {
      businessId: req.session.businessId,
      status: { in: [CustomerStatus.ACTIVE, CustomerStatus.INACTIVE] },
    },
  });

  const flagged = customers
    .map((c) => {
      const status = deriveStatus(c.lastVisitDate, business!.type);
      const signals = getAtRiskSignals({ ...c, status });
      return { customer: c, signals };
    })
    .filter(({ customer, signals }) => isAtRisk(customer) || signals.length > 0)
    .sort((a, b) => b.signals.length - a.signals.length); // most signals first

  const high = flagged.filter((f) => f.signals.length > 1);
  const moderate = flagged.filter((f) => f.signals.length === 1);

  return NextResponse.json({
    business: business?.name,
    total: flagged.length,
    highRisk: high.map(format),
    atRisk: moderate.map(format),
  });
}

function format({ customer: c, signals }: { customer: Parameters<typeof isAtRisk>[0]; signals: string[] }) {
  return {
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    lastVisitDate: c.lastVisitDate,
    totalSpent: c.totalSpent,
    loyaltyPoints: c.loyaltyPoints,
    signals,
  };
}

export const GET = withAuth(getAtRisk);
