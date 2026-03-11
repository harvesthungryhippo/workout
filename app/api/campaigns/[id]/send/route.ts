import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";
import { canRunCampaigns } from "@/lib/auth/permissions";
import { renderTemplate, buildCustomerVars } from "@/lib/api/templateEngine";
import { CampaignStatus, CustomerStatus, UserRole } from "@prisma/client";

// Frequency limits per campaign type (days)
const FREQUENCY_LIMITS: Record<string, number> = {
  WIN_BACK:             30,
  RE_ENGAGEMENT:        14,
  LOYALTY_REWARD:       30,
  NEW_CUSTOMER_WELCOME:  0, // once only
  PROMOTIONAL:           7,
  APPOINTMENT_REMINDER:  0, // transactional
  ORDER_CONFIRMATION:    0, // transactional
};

async function sendCampaign(req: AuthedRequest, { params }: Params) {
  if (!canRunCampaigns(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { sends: { select: { customerId: true, sentAt: true } } },
  });

  if (!campaign || campaign.businessId !== req.session.businessId) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  if (campaign.status === CampaignStatus.SENT) {
    return NextResponse.json({ error: "Campaign has already been sent." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: req.session.businessId },
    select: { name: true },
  });

  // Build set of already-sent customer IDs for this campaign
  const alreadySent = new Set(campaign.sends.map((s) => s.customerId));

  // Build frequency exclusion list
  const frequencyDays = FREQUENCY_LIMITS[campaign.type] ?? 7;
  let recentlySentIds = new Set<string>();

  if (frequencyDays > 0) {
    const cutoff = new Date(Date.now() - frequencyDays * 86_400_000);
    const recentSends = await prisma.campaignSend.findMany({
      where: {
        campaign: {
          businessId: req.session.businessId,
          type: campaign.type,
        },
        sentAt: { gte: cutoff },
      },
      select: { customerId: true },
    });
    recentlySentIds = new Set(recentSends.map((s) => s.customerId));
  }

  // Fetch eligible customers
  const channelUnsub = campaign.channel === "EMAIL" ? { emailUnsubscribed: false } : { smsUnsubscribed: false };

  const customers = await prisma.customer.findMany({
    where: {
      businessId: req.session.businessId,
      status: { in: [CustomerStatus.ACTIVE, CustomerStatus.INACTIVE] },
      ...channelUnsub,
    },
  });

  const eligible = customers.filter(
    (c) => !alreadySent.has(c.id) && !recentlySentIds.has(c.id)
  );

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No eligible recipients after applying frequency and unsubscribe filters." }, { status: 400 });
  }

  // Send to each recipient
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const customer of eligible) {
    const vars = buildCustomerVars(customer, business?.name ?? "");
    const { rendered, missing } = renderTemplate(campaign.body, vars);

    if (missing.length > 0) {
      // Missing template variables — skip this recipient
      await prisma.campaignSend.upsert({
        where: { campaignId_customerId: { campaignId: campaign.id, customerId: customer.id } },
        update: { failed: true, failureReason: `Missing variables: ${missing.join(", ")}` },
        create: {
          campaignId: campaign.id,
          customerId: customer.id,
          failed: true,
          failureReason: `Missing variables: ${missing.join(", ")}`,
        },
      });
      skipped++;
      continue;
    }

    try {
      // TODO: plug in real email/SMS provider here
      // await emailProvider.send({ to: customer.email, subject: campaign.subject, body: rendered });
      console.log(`[SEND] ${campaign.channel} to ${customer.email}: ${rendered.slice(0, 80)}...`);

      await prisma.campaignSend.upsert({
        where: { campaignId_customerId: { campaignId: campaign.id, customerId: customer.id } },
        update: { sentAt: new Date(), failed: false },
        create: { campaignId: campaign.id, customerId: customer.id },
      });
      sent++;
    } catch (err) {
      await prisma.campaignSend.upsert({
        where: { campaignId_customerId: { campaignId: campaign.id, customerId: customer.id } },
        update: { failed: true, failureReason: String(err) },
        create: { campaignId: campaign.id, customerId: customer.id, failed: true, failureReason: String(err) },
      });
      failed++;

      // Pause if failure rate exceeds 10%
      if (sent + failed > 10 && failed / (sent + failed) > 0.1) {
        await prisma.campaign.update({ where: { id: campaign.id }, data: { status: CampaignStatus.DRAFT } });
        return NextResponse.json({
          error: "Campaign paused — failure rate exceeded 10%. Fix the issue and retry.",
          sent, skipped, failed,
        }, { status: 500 });
      }
    }
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.SENT, sentAt: new Date() },
  });

  return NextResponse.json({
    message: "Campaign sent.",
    sent,
    skipped,
    failed,
    total: eligible.length,
  });
}

export const POST = withAuth(sendCampaign);
