import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const suffix = `t${Date.now()}`;

describe("database business rules", () => {
  let userId = "";
  let morning = "";
  let afternoon = "";
  let evening = "";
  let coffee = "";
  let choco = "";
  let reasonId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: "Tester",
        email: `tester-${suffix}@example.com`,
        passwordHash: await bcrypt.hash("secret", 4),
      },
    });
    userId = user.id;
    const shifts = await prisma.shift.findMany({ orderBy: { sequence: "asc" } });
    morning = shifts[0].id;
    afternoon = shifts[1].id;
    evening = shifts[2].id;
    coffee = (
      await prisma.product.upsert({
        where: { itemCode: "CBCF" },
        update: {},
        create: { itemCode: "CBCF", name: "Cowbell Coffee" },
      })
    ).id;
    choco = (
      await prisma.product.upsert({
        where: { itemCode: "MKCH" },
        update: {},
        create: { itemCode: "MKCH", name: "Miksi Choco" },
      })
    ).id;
    reasonId = (await prisma.noProductionReason.findFirstOrThrow()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("a production day can contain three shifts and a shift cannot be duplicated", async () => {
    const date = new Date("2099-01-02T00:00:00.000Z");
    const day = await prisma.productionDay.create({
      data: { productionDate: date, createdById: userId },
    });
    await prisma.productionShift.createMany({
      data: [
        { productionDayId: day.id, shiftId: morning, createdById: userId, status: "PRODUCED" },
        { productionDayId: day.id, shiftId: afternoon, createdById: userId, status: "PRODUCED" },
        { productionDayId: day.id, shiftId: evening, createdById: userId, status: "PENDING" },
      ],
    });
    await expect(
      prisma.productionShift.create({
        data: { productionDayId: day.id, shiftId: morning, createdById: userId },
      }),
    ).rejects.toThrow();
    const count = await prisma.productionShift.count({ where: { productionDayId: day.id } });
    expect(count).toBe(3);
  });

  it("a product can be added and item codes are unique", async () => {
    const created = await prisma.product.create({
      data: { itemCode: `ZZ${suffix.slice(-6)}`, name: "Test Blend" },
    });
    expect(created.name).toBe("Test Blend");
    await expect(
      prisma.product.create({ data: { itemCode: created.itemCode, name: "Dup" } }),
    ).rejects.toThrow();
  });

  it("same product cannot be duplicated within a shift; decimals work; edit and delete work", async () => {
    const date = new Date("2099-01-03T00:00:00.000Z");
    const day = await prisma.productionDay.create({
      data: { productionDate: date, createdById: userId },
    });
    const shift = await prisma.productionShift.create({
      data: { productionDayId: day.id, shiftId: morning, createdById: userId, status: "PRODUCED" },
    });
    const rec = await prisma.productionRecord.create({
      data: {
        productionShiftId: shift.id,
        productId: coffee,
        quantityTonnes: new Prisma.Decimal("20.250"),
        createdById: userId,
      },
    });
    await prisma.productionRecord.create({
      data: {
        productionShiftId: shift.id,
        productId: choco,
        quantityTonnes: new Prisma.Decimal("15"),
        createdById: userId,
      },
    });
    await expect(
      prisma.productionRecord.create({
        data: {
          productionShiftId: shift.id,
          productId: coffee,
          quantityTonnes: new Prisma.Decimal("1"),
          createdById: userId,
        },
      }),
    ).rejects.toThrow();

    const updated = await prisma.productionRecord.update({
      where: { id: rec.id },
      data: { quantityTonnes: new Prisma.Decimal("35.5") },
    });
    expect(Number(updated.quantityTonnes)).toBe(35.5);
    await prisma.productionRecord.delete({ where: { id: rec.id } });
    const leftover = await prisma.productionRecord.count({ where: { productionShiftId: shift.id } });
    expect(leftover).toBe(1);
  });

  it("historical production can be entered and no-production stores a reason", async () => {
    const date = new Date("2020-06-15T00:00:00.000Z");
    const day = await prisma.productionDay.create({
      data: { productionDate: date, createdById: userId },
    });
    const shift = await prisma.productionShift.create({
      data: {
        productionDayId: day.id,
        shiftId: evening,
        createdById: userId,
        status: "NO_PRODUCTION",
        noProductionReasonId: reasonId,
      },
    });
    expect(shift.status).toBe("NO_PRODUCTION");
    expect(shift.noProductionReasonId).toBe(reasonId);
  });

  it("completed production days are detected correctly", async () => {
    const date = new Date("2099-01-04T00:00:00.000Z");
    const day = await prisma.productionDay.create({
      data: { productionDate: date, createdById: userId },
    });
    await prisma.productionShift.createMany({
      data: [
        { productionDayId: day.id, shiftId: morning, createdById: userId, status: "PRODUCED" },
        { productionDayId: day.id, shiftId: afternoon, createdById: userId, status: "NO_PRODUCTION", noProductionReasonId: reasonId },
        { productionDayId: day.id, shiftId: evening, createdById: userId, status: "PRODUCED" },
      ],
    });
    const loaded = await prisma.productionShift.findMany({ where: { productionDayId: day.id } });
    const recorded = loaded.filter((s) => s.status !== "PENDING").length;
    expect(recorded).toBe(3);
  });
});
