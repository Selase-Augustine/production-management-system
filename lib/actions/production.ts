"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";
import { saveProductionSchema } from "@/lib/validation/production";
import { parseDateOnly } from "@/lib/dates";

async function getOrCreateDay(date: Date, userId: string) {
  return prisma.productionDay.upsert({
    where: { productionDate: date },
    update: {},
    create: { productionDate: date, createdById: userId },
  });
}

export async function saveShiftProductionAction(input: unknown) {
  const user = await requireSession();
  const parsed = saveProductionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid production data." };
  }
  const data = parsed.data;
  const date = parseDateOnly(data.date);
  const day = await getOrCreateDay(date, user.id);

  const existing = await prisma.productionShift.findUnique({
    where: { productionDayId_shiftId: { productionDayId: day.id, shiftId: data.shiftId } },
  });

  try {
    const shift = await prisma.productionShift.upsert({
      where: { productionDayId_shiftId: { productionDayId: day.id, shiftId: data.shiftId } },
      update: {
        status: data.mode,
        remarks: data.remarks || null,
        noProductionReasonId: data.mode === "NO_PRODUCTION" ? data.noProductionReasonId : null,
      },
      create: {
        productionDayId: day.id,
        shiftId: data.shiftId,
        status: data.mode,
        remarks: data.remarks || null,
        noProductionReasonId: data.mode === "NO_PRODUCTION" ? data.noProductionReasonId : null,
        createdById: user.id,
      },
    });

    if (data.mode === "NO_PRODUCTION") {
      await prisma.productionRecord.deleteMany({ where: { productionShiftId: shift.id } });
    } else {
      const keepProductIds = data.lines.map((l) => l.productId);
      await prisma.productionRecord.deleteMany({
        where: { productionShiftId: shift.id, productId: { notIn: keepProductIds } },
      });
      for (const line of data.lines) {
        await prisma.productionRecord.upsert({
          where: {
            productionShiftId_productId: {
              productionShiftId: shift.id,
              productId: line.productId,
            },
          },
          update: {
            quantityTonnes: new Prisma.Decimal(line.quantityTonnes),
            remarks: line.remarks || null,
          },
          create: {
            productionShiftId: shift.id,
            productId: line.productId,
            quantityTonnes: new Prisma.Decimal(line.quantityTonnes),
            remarks: line.remarks || null,
            createdById: user.id,
          },
        });
      }
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "This product already has a production record for this shift." };
    }
    return { error: "Unable to save production. Please try again." };
  }

  revalidatePath("/production");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, productionDayId: day.id, existed: Boolean(existing) };
}

export async function deleteRecordAction(id: string) {
  await requireSession();
  const record = await prisma.productionRecord.findUnique({
    where: { id },
    include: { productionShift: true },
  });
  if (!record) return { error: "Record not found." };
  await prisma.productionRecord.delete({ where: { id } });
  const remaining = await prisma.productionRecord.count({
    where: { productionShiftId: record.productionShiftId },
  });
  if (remaining === 0 && record.productionShift.status === "PRODUCED") {
    await prisma.productionShift.update({
      where: { id: record.productionShiftId },
      data: { status: "PENDING" },
    });
  }
  revalidatePath("/production");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createNoProductionReasonAction(name: string) {
  await requireSession();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Reason name is required." };
  const exists = await prisma.noProductionReason.findUnique({ where: { name: trimmed } });
  if (exists) return { error: "That reason already exists." };
  await prisma.noProductionReason.create({ data: { name: trimmed } });
  revalidatePath("/settings");
  return { ok: true };
}
