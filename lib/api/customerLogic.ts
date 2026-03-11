import { BusinessType, Customer, CustomerStatus, LoyaltyTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ─── Status ──────────────────────────────
// Thresholds differ by business type per retention-rules.md

function getInactiveThreshold(type: BusinessType): number {
  return type === BusinessType.DENTAL ? 150 : 30; // days
}

function getChurnedThreshold(type: BusinessType): number {
  return type === BusinessType.DENTAL ? 365 : 60; // days
}

export function deriveStatus(lastVisitDate: Date | null, businessType: BusinessType): CustomerStatus {
  if (!lastVisitDate) return CustomerStatus.ACTIVE;
  const daysSince = Math.floor((Date.now() - lastVisitDate.getTime()) / 86_400_000);
  if (daysSince > getChurnedThreshold(businessType)) return CustomerStatus.CHURNED;
  if (daysSince > getInactiveThreshold(businessType)) return CustomerStatus.INACTIVE;
  return CustomerStatus.ACTIVE;
}

// ─── Loyalty tier ─────────────────────────

export function deriveTier(points: number): LoyaltyTier {
  if (points >= 1500) return LoyaltyTier.GOLD;
  if (points >= 500)  return LoyaltyTier.SILVER;
  if (points >= 100)  return LoyaltyTier.BRONZE;
  return LoyaltyTier.NONE;
}

// ─── Segments ─────────────────────────────

export type SegmentName =
  | "VIP"
  | "Loyal Regulars"
  | "New Customers"
  | "At Risk"
  | "Inactive"
  | "Churned"
  | "High Value Inactive";

export function getSegments(customer: Customer): SegmentName[] {
  const segments: SegmentName[] = [];
  const daysSinceFirst = customer.firstVisitDate
    ? Math.floor((Date.now() - customer.firstVisitDate.getTime()) / 86_400_000)
    : null;

  if (customer.loyaltyTier === LoyaltyTier.GOLD || Number(customer.totalSpent) > 1000)
    segments.push("VIP");

  if (customer.totalVisits >= 10 && customer.status === CustomerStatus.ACTIVE)
    segments.push("Loyal Regulars");

  if (daysSinceFirst !== null && daysSinceFirst <= 30)
    segments.push("New Customers");

  if (customer.status === CustomerStatus.INACTIVE) segments.push("Inactive");
  if (customer.status === CustomerStatus.CHURNED)  segments.push("Churned");

  if (Number(customer.totalSpent) > 500 && customer.status !== CustomerStatus.ACTIVE)
    segments.push("High Value Inactive");

  if (isAtRisk(customer)) segments.push("At Risk");

  return segments;
}

// ─── At-risk signals ──────────────────────

export function isAtRisk(customer: Customer): boolean {
  if (!customer.lastVisitDate) return false;
  const daysSince = Math.floor((Date.now() - customer.lastVisitDate.getTime()) / 86_400_000);

  // Signal 1: previously frequent, now 30+ days absent
  if (customer.totalVisits >= 4 && daysSince >= 30 && customer.status === CustomerStatus.ACTIVE)
    return true;

  // Signal 2: unredeemed loyalty points (200+) with no recent visit
  if (customer.loyaltyPoints >= 200 && daysSince >= 14)
    return true;

  return false;
}

export function getAtRiskSignals(customer: Customer): string[] {
  const signals: string[] = [];
  if (!customer.lastVisitDate) return signals;

  const daysSince = Math.floor((Date.now() - customer.lastVisitDate.getTime()) / 86_400_000);

  if (customer.totalVisits >= 4 && daysSince >= 30 && customer.status === CustomerStatus.ACTIVE)
    signals.push("Frequency drop — regular customer with no recent visit");

  if (customer.loyaltyPoints >= 200 && daysSince >= 14)
    signals.push(`${customer.loyaltyPoints} unredeemed loyalty points, no recent visit`);

  return signals;
}

// ─── Auto-update status + tier after a visit ──

export async function recalculateCustomer(customerId: string, businessType: BusinessType) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;

  const status = deriveStatus(customer.lastVisitDate, businessType);
  const loyaltyTier = deriveTier(customer.loyaltyPoints);

  await prisma.customer.update({
    where: { id: customerId },
    data: { status, loyaltyTier },
  });
}
