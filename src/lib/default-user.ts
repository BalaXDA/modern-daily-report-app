import { prisma } from "./prisma";

// Auth was removed from this app; reports still need a `createdById` foreign
// key. We pick the first user that exists and lazily create one if the table
// is empty so the API never fails.
export async function getDefaultUser() {
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      name: "Default User",
      email: "default@local",
      passwordHash: "",
      role: "ADMIN",
    },
  });
}
