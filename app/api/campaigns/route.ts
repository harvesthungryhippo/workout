import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canRunCampaigns } from "@/lib/auth/permissions";
import { CampaignChannel, CampaignType, UserRole } from "@prisma/client";

const createSchema = z.object({
  name:         z.string().min(1),
  type:         z.nativeEnum(CampaignType),
  channel:      z.nativeEnum(CampaignChannel),
  segment:      z.string().min(1),
  subject:      z.string().optional(),
  body:         z.string().min(1),
  scheduledAt:  z.string().optional(),
});

// GET /api/campaigns — list campaigns for this business
async function getCampaigns(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const campaigns = await prisma.campaign.findMany({
    where: {
      businessId: req.session.businessId,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sends: true } },
    },
  });

  return NextResponse.json(campaigns);
}

// POST /api/campaigns — create a campaign draft
async function createCampaign(req: AuthedRequest) {
  if (!canRunCampaigns(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  // Validate channel against plan
  const sub = await prisma.subscription.findUnique({
    where: { businessId: req.session.businessId },
    select: { plan: true },
  });

  if (body.channel === CampaignChannel.SMS && sub?.plan === "STARTER") {
    return NextResponse.json(
      { error: "SMS campaigns require the Growth plan or higher." },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      businessId:  req.session.businessId,
      name:        body.name,
      type:        body.type,
      channel:     body.channel,
      segment:     body.segment,
      subject:     body.subject,
      body:        body.body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      status:      "DRAFT",
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}

export const GET  = withAuth(getCampaigns);
export const POST = withAuth(createCampaign);
