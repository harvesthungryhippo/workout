import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin, type AuthedRequest } from "@/lib/api/withAdmin";
import type { Params } from "@/lib/api/withAuth";

async function getOrg(_req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        select: { id: true, name: true, email: true, orgRole: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  return NextResponse.json(org);
}

async function updateOrg(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { name, slug } = body as { name?: string; slug?: string };

  const data: { name?: string; slug?: string } = {};
  if (name !== undefined) data.name = name.trim();
  if (slug !== undefined) {
    data.slug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  try {
    const org = await prisma.organization.update({ where: { id }, data });
    return NextResponse.json(org);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug already in use." }, { status: 409 });
    }
    throw err;
  }
}

async function deleteOrg(_req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;

  try {
    await prisma.organization.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    throw err;
  }
}

export const GET = withAdmin(getOrg);
export const PATCH = withAdmin(updateOrg);
export const DELETE = withAdmin(deleteOrg);
