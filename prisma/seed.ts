import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PRODUCTS = [
  { itemCode: "CBBA", name: "Cowbell Banana" },
  { itemCode: "CBCF", name: "Cowbell Coffee" },
  { itemCode: "CBMO", name: "Cowbell Mocha" },
  { itemCode: "CBST", name: "Cowbell Strawberry" },
  { itemCode: "MKCH", name: "Miksi Choco" },
  { itemCode: "MKCF", name: "Miksi Coffee" },
  { itemCode: "MKST", name: "Miksi Strawberry" },
  { itemCode: "YUWH", name: "Yumvita Wheat" },
  { itemCode: "YUMWH", name: "Yumvita Maize" },
];

const REASONS = [
  "Machine Maintenance",
  "Power Outage",
  "No Raw Material",
  "Planned Shutdown",
  "Public Holiday",
  "Staff Shortage",
  "Other",
];

async function main() {
  const passwordHash = await bcrypt.hash("Manager123!", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      name: "Production Manager",
      email: "manager@example.com",
      passwordHash,
      role: "PRODUCTION_MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  for (const [i, name] of ["Morning", "Afternoon", "Evening"].entries()) {
    await prisma.shift.upsert({
      where: { name },
      update: { sequence: i + 1, isActive: true },
      create: { name, sequence: i + 1 },
    });
  }

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { itemCode: product.itemCode },
      update: { name: product.name },
      create: product,
    });
  }

  for (const name of REASONS) {
    await prisma.noProductionReason.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const shifts = await prisma.shift.findMany({ orderBy: { sequence: "asc" } });
  const products = await prisma.product.findMany();
  const byCode = Object.fromEntries(products.map((p) => [p.itemCode, p]));
  const holiday = await prisma.noProductionReason.findUniqueOrThrow({
    where: { name: "Public Holiday" },
  });
  const maintenance = await prisma.noProductionReason.findUniqueOrThrow({
    where: { name: "Machine Maintenance" },
  });

  // Historical sample aligned with the prompt (2 Sep 2026 evening)
  const sampleDays: Array<{
    date: string;
    entries: Array<{
      shift: string;
      mode: "PRODUCED" | "NO_PRODUCTION";
      reasonId?: string;
      lines?: Array<{ code: string; qty: number }>;
    }>;
  }> = [
    {
      date: "2026-09-02",
      entries: [
        {
          shift: "Morning",
          mode: "PRODUCED",
          lines: [
            { code: "CBBA", qty: 20 },
            { code: "CBCF", qty: 25 },
          ],
        },
        {
          shift: "Afternoon",
          mode: "PRODUCED",
          lines: [
            { code: "CBCF", qty: 20 },
            { code: "MKCH", qty: 15 },
          ],
        },
        {
          shift: "Evening",
          mode: "PRODUCED",
          lines: [
            { code: "MKCH", qty: 20 },
            { code: "CBCF", qty: 20 },
            { code: "CBBA", qty: 10 },
          ],
        },
      ],
    },
    {
      date: "2026-09-03",
      entries: [
        { shift: "Morning", mode: "NO_PRODUCTION", reasonId: holiday.id },
        { shift: "Afternoon", mode: "NO_PRODUCTION", reasonId: holiday.id },
        { shift: "Evening", mode: "NO_PRODUCTION", reasonId: holiday.id },
      ],
    },
    {
      date: "2026-10-06",
      entries: [
        {
          shift: "Morning",
          mode: "PRODUCED",
          lines: [
            { code: "YUWH", qty: 18.5 },
            { code: "YUMWH", qty: 12 },
          ],
        },
        {
          shift: "Afternoon",
          mode: "PRODUCED",
          lines: [{ code: "CBST", qty: 22 }],
        },
        { shift: "Evening", mode: "NO_PRODUCTION", reasonId: maintenance.id },
      ],
    },
    {
      date: "2026-10-07",
      entries: [
        {
          shift: "Morning",
          mode: "PRODUCED",
          lines: [
            { code: "MKCF", qty: 20 },
            { code: "CBMO", qty: 20 },
          ],
        },
        {
          shift: "Afternoon",
          mode: "PRODUCED",
          lines: [{ code: "MKCH", qty: 35 }],
        },
      ],
    },
  ];

  for (const day of sampleDays) {
    const productionDate = new Date(`${day.date}T00:00:00.000Z`);
    const rec = await prisma.productionDay.upsert({
      where: { productionDate },
      update: {},
      create: { productionDate, createdById: manager.id },
    });
    for (const entry of day.entries) {
      const shift = shifts.find((s) => s.name === entry.shift)!;
      const ps = await prisma.productionShift.upsert({
        where: { productionDayId_shiftId: { productionDayId: rec.id, shiftId: shift.id } },
        update: {
          status: entry.mode,
          noProductionReasonId: entry.reasonId ?? null,
        },
        create: {
          productionDayId: rec.id,
          shiftId: shift.id,
          status: entry.mode,
          noProductionReasonId: entry.reasonId ?? null,
          createdById: manager.id,
        },
      });
      if (entry.mode === "PRODUCED") {
        for (const line of entry.lines ?? []) {
          await prisma.productionRecord.upsert({
            where: {
              productionShiftId_productId: {
                productionShiftId: ps.id,
                productId: byCode[line.code].id,
              },
            },
            update: { quantityTonnes: new Prisma.Decimal(line.qty) },
            create: {
              productionShiftId: ps.id,
              productId: byCode[line.code].id,
              quantityTonnes: new Prisma.Decimal(line.qty),
              createdById: manager.id,
            },
          });
        }
      }
    }
  }

  console.log("Seed complete.");
  console.log("Login: manager@example.com / Manager123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
