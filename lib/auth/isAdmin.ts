import { prisma } from "@/lib/db/prisma";

export async function isAdmin(userId: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const user = await prisma.workoutUser.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}
