import { prisma } from "@/lib/db/prisma";

export async function loadPreparerName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name?.trim() ?? "";
}
