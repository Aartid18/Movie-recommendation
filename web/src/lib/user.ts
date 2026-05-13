import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function ensureUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;
  const clerk = await currentUser();
  return prisma.user.create({
    data: {
      clerkId: userId,
      email: clerk?.primaryEmailAddress?.emailAddress ?? null,
      displayName: clerk?.fullName ?? clerk?.username ?? null,
    },
  });
}

export async function requireUser() {
  const u = await ensureUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}
