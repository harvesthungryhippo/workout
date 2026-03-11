import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateOpaqueToken } from "@/lib/auth/token";
import { getStripe } from "@/lib/api/stripe";
import { BusinessType, BusinessStatus, UserRole, UserStatus } from "@prisma/client";
import { createHash } from "crypto";

const schema = z.object({
  // Business
  businessName:     z.string().min(2),
  businessType:     z.nativeEnum(BusinessType),
  email:            z.string().email(),
  phone:            z.string().optional(),
  address:          z.string().optional(),
  city:             z.string().optional(),
  state:            z.string().optional(),
  zip:              z.string().optional(),

  // Restaurant-specific
  cuisineType:      z.string().optional(),
  locationCount:    z.number().int().positive().optional(),

  // Dental-specific
  npiNumber:        z.string().optional(),
  practitionerCount: z.number().int().positive().optional(),

  // Admin user
  ownerFirstName:   z.string().min(1),
  ownerLastName:    z.string().min(1),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 2;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  // Check email is not already registered as a user
  const emailTaken = await prisma.user.findFirst({ where: { email: body.email } });
  if (emailTaken) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const slug = await uniqueSlug(slugify(body.businessName));
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const stripe = getStripe();

  // Create Stripe customer
  const stripeCustomer = await stripe.customers.create({
    email: body.email,
    name:  body.businessName,
    metadata: { slug },
  });

  // Everything in a transaction — business, user, subscription
  const { business, user } = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        slug,
        name:             body.businessName,
        type:             body.businessType,
        status:           BusinessStatus.TRIAL,
        email:            body.email,
        phone:            body.phone,
        address:          body.address,
        city:             body.city,
        state:            body.state,
        zip:              body.zip,
        cuisineType:      body.cuisineType,
        locationCount:    body.locationCount ?? 1,
        npiNumber:        body.npiNumber,
        practitionerCount: body.practitionerCount,
        trialEndsAt,
      },
    });

    const user = await tx.user.create({
      data: {
        businessId:   business.id,
        email:        body.email,
        firstName:    body.ownerFirstName,
        lastName:     body.ownerLastName,
        role:         UserRole.BUSINESS_ADMIN,
        status:       UserStatus.PENDING,
        forcePasswordChange: true,
      },
    });

    // Trial subscription on Growth plan, no card required
    const now = new Date();
    await tx.subscription.create({
      data: {
        businessId:        business.id,
        plan:              "GROWTH",
        billingCycle:      "MONTHLY",
        status:            "ACTIVE",
        stripeCustomerId:  stripeCustomer.id,
        currentPeriodStart: now,
        currentPeriodEnd:  trialEndsAt,
      },
    });

    return { business, user };
  });

  // Generate password setup token
  const token = generateOpaqueToken();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  // TODO: send welcome email with setup link: /setup-password?token=${token}
  console.log(`[ONBOARD] Setup link: /setup-password?token=${token}`);

  return NextResponse.json(
    {
      message: "Account created. Check your email to set up your password.",
      businessId: business.id,
      slug:       business.slug,
      trialEndsAt,
    },
    { status: 201 }
  );
}
