import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canRunCampaigns } from "@/lib/auth/permissions";
import { AutomationTrigger, CampaignChannel, CampaignType, UserRole } from "@prisma/client";

// Dental-only and restaurant-only triggers
const DENTAL_ONLY = new Set<AutomationTrigger>([
  AutomationTrigger.APPOINTMENT_48H,
  AutomationTrigger.APPOINTMENT_2H,
]);
const RESTAURANT_ONLY = new Set<AutomationTrigger>([
  AutomationTrigger.ORDER_CONFIRMED,
]);

const createSchema = z.object({
  trigger:      z.nativeEnum(AutomationTrigger),
  campaignType: z.nativeEnum(CampaignType),
  channel:      z.nativeEnum(CampaignChannel),
  delayMinutes: z.number().int().min(0).default(0),
  subject:      z.string().optional(),
  body:         z.string().min(1),
});

const toggleSchema = z.object({ active: z.boolean() });

// GET /api/automations
async function getAutomations(req: AuthedRequest) {
  const automations = await prisma.automation.findMany({
    where: { businessId: req.session.businessId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(automations);
}

// POST /api/automations
async function createAutomation(req: AuthedRequest) {
  if (!canRunCampaigns(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: req.session.businessId },
    select: { type: true },
  });

  // Validate trigger is valid for this business type
  if (DENTAL_ONLY.has(body.trigger) && business?.type !== "DENTAL") {
    return NextResponse.json({ error: "This trigger is only available for dental practices." }, { status: 400 });
  }
  if (RESTAURANT_ONLY.has(body.trigger) && business?.type !== "RESTAURANT") {
    return NextResponse.json({ error: "This trigger is only available for restaurants." }, { status: 400 });
  }

  // Check SMS availability on plan
  const sub = await prisma.subscription.findUnique({
    where: { businessId: req.session.businessId },
    select: { plan: true },
  });
  if (body.channel === CampaignChannel.SMS && sub?.plan === "STARTER") {
    return NextResponse.json({ error: "SMS requires the Growth plan or higher." }, { status: 400 });
  }

  // Prevent duplicates on the same trigger
  const existing = await prisma.automation.findFirst({
    where: { businessId: req.session.businessId, trigger: body.trigger },
  });
  if (existing) {
    return NextResponse.json({ error: `An automation for this trigger already exists. Update or delete it first.` }, { status: 409 });
  }

  const automation = await prisma.automation.create({
    data: {
      businessId:   req.session.businessId,
      trigger:      body.trigger,
      campaignType: body.campaignType,
      channel:      body.channel,
      delayMinutes: body.delayMinutes,
      subject:      body.subject,
      body:         body.body,
      active:       true,
    },
  });

  return NextResponse.json(automation, { status: 201 });
}

export const GET  = withAuth(getAutomations);
export const POST = withAuth(createAutomation);
