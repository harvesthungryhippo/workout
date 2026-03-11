import { UserRole } from "@prisma/client";

// Maps each role to its numeric rank — higher = more powerful
const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN:    5,
  BUSINESS_ADMIN: 4,
  MANAGER:        3,
  STAFF:          2,
  READ_ONLY:      1,
};

export function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  // Cannot assign a role equal to or higher than your own
  return ROLE_RANK[assignerRole] > ROLE_RANK[targetRole];
}

export function canManageUsers(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;
}

export function canRunCampaigns(role: UserRole): boolean {
  return (new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER])).has(role);
}

export function canExportData(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;
}

export function canViewAuditLog(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;
}

export function canManageBilling(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;
}

export function canDeleteRecords(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;
}

export function canWriteCustomers(role: UserRole): boolean {
  return (new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.STAFF])).has(role);
}
