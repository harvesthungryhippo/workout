import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { canExportData } from "@/lib/auth/permissions";
import { UserRole } from "@prisma/client";

async function exportCustomers(req: AuthedRequest) {
  if (!canExportData(req.session.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") ?? "csv") as "csv" | "json";
  const segment = searchParams.get("segment") ?? undefined;

  const customers = await prisma.customer.findMany({
    where: { businessId: req.session.businessId },
    orderBy: { lastName: "asc" },
  });

  // Strip internal IDs from export
  const rows = customers.map(({ id: _id, businessId: _bid, ...rest }) => rest);

  if (format === "json") {
    return NextResponse.json(rows, {
      headers: { "Content-Disposition": "attachment; filename=customers.json" },
    });
  }

  // CSV
  if (rows.length === 0) {
    return new NextResponse("No customers found.", { status: 200 });
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = (row as Record<string, unknown>)[h];
          const str = val === null || val === undefined ? "" : String(val);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=customers.csv",
    },
  });
}

export const GET = withAuth(exportCustomers);
