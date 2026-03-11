import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canManageBilling } from "@/lib/auth/permissions";
import { UserRole } from "@prisma/client";

async function getInvoices(req: AuthedRequest) {
  if (!canManageBilling(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "24"));

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { businessId: req.session.businessId },
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        tax: true,
        total: true,
        issuedAt: true,
        isVoided: true,
        isCreditNote: true,
        pdfUrl: true,
        payment: { select: { reason: true, stripeChargeId: true } },
      },
    }),
    prisma.invoice.count({ where: { businessId: req.session.businessId } }),
  ]);

  return NextResponse.json({ invoices, total, page, limit });
}

export const GET = withAuth(getInvoices);
