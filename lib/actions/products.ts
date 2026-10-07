"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";
import { productSchema } from "@/lib/validation/product";

export async function createProductAction(input: unknown) {
  await requireSession();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product." };
  }
  const exists = await prisma.product.findUnique({ where: { itemCode: parsed.data.itemCode } });
  if (exists) return { error: "Product code already exists." };
  await prisma.product.create({ data: parsed.data });
  revalidatePath("/products");
  return { ok: true };
}

export async function updateProductAction(id: string, input: unknown) {
  await requireSession();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product." };
  }
  const clash = await prisma.product.findFirst({
    where: { itemCode: parsed.data.itemCode, NOT: { id } },
  });
  if (clash) return { error: "Product code already exists." };
  await prisma.product.update({ where: { id }, data: parsed.data });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: true };
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  await requireSession();
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { productionRecords: true } } },
  });
  if (!product) return { error: "Product not found." };
  if (!isActive && product._count.productionRecords > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/products");
    return { ok: true, deactivated: true };
  }
  if (!isActive && product._count.productionRecords === 0) {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/products");
    return { ok: true, deleted: true };
  }
  await prisma.product.update({ where: { id }, data: { isActive: true } });
  revalidatePath("/products");
  return { ok: true };
}
