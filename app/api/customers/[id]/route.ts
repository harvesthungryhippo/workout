import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";
import { canWriteCustomers, canDeleteRecords } from "@/lib/auth/permissions";
import { getSegments, deriveStatus } from "@/lib/api/customerLogic";
import { UserRole } from "@prisma/client";

// Protected fields — never manually editable
const AUTO_FIELDS = new Set([
  "totalVisits", "totalSpent", "averageOrderValue",
  "firstVisitDate", "lastVisitDate", "loyaltyPoints",
  "loyaltyTier", "pointsRedeemed",
]);

const updateSchema = z.record(z.string(), z.unknown());

// GET /api/customers/[id]
async function getCustomer(req: AuthedRequest, { params }: Params) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id } });

  if (!customer || customer.businessId !== req.session.businessId) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const business = await prisma.business.findUnique({
    where: { id: req.session.businessId },
    select: { type: true },
  });

  const status = deriveStatus(customer.lastVisitDate, business!.type);
  const segments = getSegments({ ...customer, status });

  return NextResponse.json({ ...customer, status, segments });
}

// PUT /api/customers/[id]
async function updateCustomer(req: AuthedRequest, { params }: Params) {
  if (!canWriteCustomers(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.businessId !== req.session.businessId) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = updateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Block auto-calculated fields
  const blocked = Object.keys(body).filter((k) => AUTO_FIELDS.has(k));
  if (blocked.length > 0) {
    return NextResponse.json(
      { error: `Cannot manually update auto-calculated fields: ${blocked.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: body as never,
  });

  return NextResponse.json(updated);
}

// DELETE /api/customers/[id]
async function deleteCustomer(req: AuthedRequest, { params }: Params) {
  if (!canDeleteRecords(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.businessId !== req.session.businessId) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  await prisma.customer.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export const GET    = withAuth(getCustomer);
export const PUT    = withAuth(updateCustomer);
export const DELETE = withAuth(deleteCustomer);
