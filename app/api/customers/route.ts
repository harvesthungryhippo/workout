import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canWriteCustomers } from "@/lib/auth/permissions";
import { UserRole } from "@prisma/client";

// GET /api/customers — list customers for the session's business
async function getCustomers(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

  const where = {
    businessId: req.session.businessId,
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName:  { contains: search, mode: "insensitive" as const } },
            { email:     { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { lastVisitDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

// POST /api/customers — add a new customer
const addSchema = z.object({
  firstName:   z.string().min(1),
  lastName:    z.string().min(1),
  email:       z.string().email(),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  state:       z.string().optional(),
  zip:         z.string().optional(),
  // Restaurant
  dietaryPreferences: z.array(z.string()).optional(),
  deliveryAddress:    z.string().optional(),
  // Dental
  dateOfBirth:        z.string().optional(),
  insuranceProvider:  z.string().optional(),
  insuranceId:        z.string().optional(),
});

async function addCustomer(req: AuthedRequest) {
  if (!canWriteCustomers(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: z.infer<typeof addSchema>;
  try {
    body = addSchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  // Duplicate check
  const existing = await prisma.customer.findUnique({
    where: { businessId_email: { businessId: req.session.businessId, email: body.email } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A customer with this email already exists.", customer: existing },
      { status: 409 }
    );
  }

  const customer = await prisma.customer.create({
    data: {
      businessId: req.session.businessId,
      firstName:  body.firstName,
      lastName:   body.lastName,
      email:      body.email,
      phone:      body.phone,
      address:    body.address,
      city:       body.city,
      state:      body.state,
      zip:        body.zip,
      dietaryPreferences: body.dietaryPreferences ?? [],
      deliveryAddress:    body.deliveryAddress,
      dateOfBirth:        body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      insuranceProvider:  body.insuranceProvider,
      insuranceId:        body.insuranceId,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}

export const GET  = withAuth(getCustomers);
export const POST = withAuth(addCustomer);
