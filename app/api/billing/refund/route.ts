import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { getStripe } from "@/lib/api/stripe";
import { UserRole } from "@prisma/client";

const schema = z.object({
  invoiceId:    z.string().min(1),
  refundAmount: z.number().positive(),
  reason:       z.string().min(1),
});

// Only Super Admins can issue refunds — per issue-refund.md
async function issueRefund(req: AuthedRequest) {
  if (req.session.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden. Only Super Admins can issue refunds." }, { status: 403 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: body.invoiceId },
    include: { payment: true },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.isVoided) return NextResponse.json({ error: "Cannot refund a voided invoice." }, { status: 400 });
  if (!invoice.payment?.stripeChargeId) return NextResponse.json({ error: "No charge found for this invoice." }, { status: 400 });

  const refundAmountCents = Math.round(body.refundAmount * 100);
  const originalAmountCents = Math.round(Number(invoice.amount) * 100);

  if (refundAmountCents > originalAmountCents) {
    return NextResponse.json({ error: "Refund amount exceeds original charge." }, { status: 400 });
  }

  const stripe = getStripe();

  let stripeRefund;
  try {
    stripeRefund = await stripe.refunds.create({
      payment_intent: invoice.payment.stripeChargeId,
      amount: refundAmountCents,
      reason: "requested_by_customer",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe refund failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Record the credit note
  const creditNote = await prisma.invoice.create({
    data: {
      businessId:    invoice.businessId,
      invoiceNumber: `CN-${invoice.invoiceNumber}`,
      amount:        -body.refundAmount,
      tax:           0,
      total:         -body.refundAmount,
      isCreditNote:  true,
      refersToId:    invoice.id,
      retainUntil:   new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({
    message: `Refund of $${body.refundAmount.toFixed(2)} issued.`,
    stripeRefundId: stripeRefund.id,
    creditNoteId:   creditNote.id,
    creditNoteNumber: creditNote.invoiceNumber,
  });
}

export const POST = withAuth(issueRefund);
