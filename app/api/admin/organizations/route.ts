import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin, type AuthedRequest } from "@/lib/api/withAdmin";
import type { Params } from "@/lib/api/withAuth";

async function getOrgs(_req: AuthedRequest, _ctx: Params) {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json(orgs);
}

async function createOrg(req: AuthedRequest, _ctx: Params) {
  const body = await req.json();
  const { name } = body as { name: string };

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Ensure slug uniqueness by appending a suffix if needed
  let finalSlug = slug;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${suffix++}`;
  }

  const org = await prisma.organization.create({
    data: { name: name.trim(), slug: finalSlug },
  });

  return NextResponse.json(org, { status: 201 });
}

export const GET = withAdmin(getOrgs);
export const POST = withAdmin(createOrg);
