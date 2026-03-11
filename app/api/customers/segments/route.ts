import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { getSegments, deriveStatus, type SegmentName } from "@/lib/api/customerLogic";

async function getSegmentsHandler(req: AuthedRequest) {
  const business = await prisma.business.findUnique({
    where: { id: req.session.businessId },
    select: { type: true, name: true },
  });

  const customers = await prisma.customer.findMany({
    where: { businessId: req.session.businessId },
  });

  // Group customers into segments
  const buckets: Record<SegmentName, typeof customers> = {
    "VIP":                 [],
    "Loyal Regulars":      [],
    "New Customers":       [],
    "At Risk":             [],
    "Inactive":            [],
    "Churned":             [],
    "High Value Inactive": [],
  };

  for (const customer of customers) {
    const status = deriveStatus(customer.lastVisitDate, business!.type);
    const segments = getSegments({ ...customer, status });
    for (const seg of segments) {
      buckets[seg].push(customer);
    }
  }

  const summary = Object.entries(buckets).map(([name, members]) => ({
    segment: name,
    count: members.length,
    customers: members.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      status: c.status,
      totalSpent: c.totalSpent,
      lastVisitDate: c.lastVisitDate,
      loyaltyPoints: c.loyaltyPoints,
      loyaltyTier: c.loyaltyTier,
    })),
  }));

  return NextResponse.json({
    business: business?.name,
    totalCustomers: customers.length,
    segments: summary,
  });
}

export const GET = withAuth(getSegmentsHandler);
