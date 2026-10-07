import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { parseDateOnly } from "@/lib/dates";
import { Prisma } from "@prisma/client";

export type ImportSummary = {
  recordsFound: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsWithErrors: number;
  errors: Array<{ row: string; message: string }>;
};

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value && "text" in (value as object)) {
    return String((value as { text: string }).text);
  }
  if (typeof value === "object" && value && "result" in (value as object)) {
    return cellText((value as { result: unknown }).result);
  }
  return String(value).trim();
}

function parseQuantity(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "").replace(/tonnes?/i, "").trim();
  if (/^no\s*production$/i.test(cleaned) || cleaned === "-" || cleaned === "N/A") return null;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return n;
}

function parseDateCell(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const text = cellText(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return parseDateOnly(`${iso[1]}-${iso[2]}-${iso[3]}`);
  const dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }
  return null;
}

function normalizeShift(name: string) {
  const n = name.trim().toLowerCase();
  if (n.startsWith("morn")) return "Morning";
  if (n.startsWith("after")) return "Afternoon";
  if (n.startsWith("even") || n.startsWith("night")) return "Evening";
  return name.trim();
}

export async function importWorkbook(buffer: Buffer, userId: string): Promise<ImportSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const products = await prisma.product.findMany();
  const shifts = await prisma.shift.findMany();
  const reasons = await prisma.noProductionReason.findMany();

  const productByCode = new Map(products.map((p) => [p.itemCode.toUpperCase(), p]));
  const productByName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
  const shiftByName = new Map(shifts.map((s) => [s.name.toLowerCase(), s]));
  const reasonByName = new Map(reasons.map((r) => [r.name.toLowerCase(), r]));

  const summary: ImportSummary = {
    recordsFound: 0,
    recordsImported: 0,
    recordsSkipped: 0,
    recordsWithErrors: 0,
    errors: [],
  };

  const seen = new Set<string>();

  const upsertProduct = async (code: string, name: string) => {
    const itemCode = code.trim().toUpperCase();
    const existing = productByCode.get(itemCode) ?? productByName.get(name.toLowerCase());
    if (existing) return existing;
    const created = await prisma.product.create({
      data: { itemCode, name: name.trim() || itemCode },
    });
    productByCode.set(created.itemCode, created);
    productByName.set(created.name.toLowerCase(), created);
    return created;
  };

  const getDay = async (date: Date) => {
    return prisma.productionDay.upsert({
      where: { productionDate: date },
      update: {},
      create: { productionDate: date, createdById: userId },
    });
  };

  for (const sheet of workbook.worksheets) {
    const rows = sheet.getSheetValues() as unknown as Array<Array<unknown> | undefined>;
    if (!rows?.length) continue;

    const headerRow = (rows[1] ?? rows.find((r) => Array.isArray(r))) as unknown[] | undefined;
    const headers = Array.from({ length: headerRow?.length ?? 0 }, (_, i) =>
      cellText(headerRow?.[i]).toLowerCase(),
    );
    const looksTabular =
      headers.some((h) => h.includes("date")) &&
      headers.some((h) => h.includes("shift") || h.includes("product"));

    if (looksTabular) {
      const idx = {
        date: headers.findIndex((h) => h.includes("date")),
        shift: headers.findIndex((h) => h.includes("shift")),
        product: headers.findIndex((h) => h === "product" || h.includes("product name")),
        code: headers.findIndex((h) => h.includes("code") || h.includes("item")),
        qty: headers.findIndex((h) => h.includes("qty") || h.includes("ton") || h.includes("quantity")),
        status: headers.findIndex((h) => h.includes("status")),
        reason: headers.findIndex((h) => h.includes("reason")),
        remarks: headers.findIndex((h) => h.includes("remark")),
      };

      for (let r = 2; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;
        const date = parseDateCell(row[idx.date]);
        const shiftName = normalizeShift(cellText(row[idx.shift]));
        const productName = idx.product >= 0 ? cellText(row[idx.product]) : "";
        const code = idx.code >= 0 ? cellText(row[idx.code]) : "";
        const qtyText = idx.qty >= 0 ? cellText(row[idx.qty]) : "";
        const statusText = idx.status >= 0 ? cellText(row[idx.status]) : "";
        const reasonText = idx.reason >= 0 ? cellText(row[idx.reason]) : "";
        const remarks = idx.remarks >= 0 ? cellText(row[idx.remarks]) : "";
        if (!date && !shiftName && !productName && !qtyText) continue;

        summary.recordsFound += 1;
        const label = `${sheet.name} row ${r}`;
        try {
          if (!date) throw new Error("Missing or invalid date.");
          const shift = shiftByName.get(shiftName.toLowerCase());
          if (!shift) throw new Error(`Unknown shift "${shiftName}".`);
          const isNoProd =
            /no\s*production/i.test(statusText) ||
            /no\s*production/i.test(qtyText) ||
            /no\s*production/i.test(productName);

          const day = await getDay(date);
          const productionShift = await prisma.productionShift.upsert({
            where: { productionDayId_shiftId: { productionDayId: day.id, shiftId: shift.id } },
            update: {},
            create: {
              productionDayId: day.id,
              shiftId: shift.id,
              status: "PENDING",
              createdById: userId,
            },
          });

          if (isNoProd) {
            const reason =
              reasonByName.get(reasonText.toLowerCase()) ??
              reasonByName.get("other") ??
              reasons[0];
            await prisma.productionShift.update({
              where: { id: productionShift.id },
              data: {
                status: "NO_PRODUCTION",
                noProductionReasonId: reason?.id,
                remarks: remarks || null,
              },
            });
            summary.recordsImported += 1;
            continue;
          }

          if (!productName && !code) throw new Error("Missing product.");
          const product =
            (code && productByCode.get(code.toUpperCase())) ||
            (productName && productByName.get(productName.toLowerCase())) ||
            (await upsertProduct(code || productName.slice(0, 8).toUpperCase(), productName || code));

          const qty = parseQuantity(qtyText);
          if (qty === null || qty < 0) throw new Error("Enter a valid production quantity.");

          const key = `${productionShift.id}:${product.id}`;
          if (seen.has(key)) {
            summary.recordsSkipped += 1;
            summary.errors.push({
              row: label,
              message: "Duplicate product for shift — skipped (already imported).",
            });
            continue;
          }
          seen.add(key);

          await prisma.productionRecord.upsert({
            where: {
              productionShiftId_productId: {
                productionShiftId: productionShift.id,
                productId: product.id,
              },
            },
            update: {},
            create: {
              productionShiftId: productionShift.id,
              productId: product.id,
              quantityTonnes: new Prisma.Decimal(qty),
              remarks: remarks || null,
              createdById: userId,
            },
          });
          await prisma.productionShift.update({
            where: { id: productionShift.id },
            data: { status: "PRODUCED", noProductionReasonId: null },
          });
          summary.recordsImported += 1;
        } catch (error) {
          summary.recordsWithErrors += 1;
          summary.errors.push({
            row: label,
            message: error instanceof Error ? error.message : "Invalid row.",
          });
        }
      }
      continue;
    }

    // Matrix fallback: first column product, remaining columns dates / shift labels
    const header = (rows[1] ?? []) as unknown[];
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const productLabel = cellText(row[1]);
      if (!productLabel) continue;
      const product =
        productByCode.get(productLabel.toUpperCase()) ||
        productByName.get(productLabel.toLowerCase());
      if (!product) continue;
      for (let c = 2; c < row.length; c++) {
        const qty = parseQuantity(cellText(row[c]));
        const headerText = cellText(header[c]);
        if (qty === null || !headerText) continue;
        summary.recordsFound += 1;
        try {
          const date = parseDateCell(header[c]) ?? parseDateCell(sheet.name);
          if (!date) throw new Error("Could not determine date from matrix header.");
          const shiftGuess =
            /morn/i.test(headerText)
              ? "Morning"
              : /after/i.test(headerText)
                ? "Afternoon"
                : /even|night/i.test(headerText)
                  ? "Evening"
                  : "Morning";
          const shift = shiftByName.get(shiftGuess.toLowerCase());
          if (!shift) throw new Error("Unknown shift.");
          const day = await getDay(date);
          const productionShift = await prisma.productionShift.upsert({
            where: { productionDayId_shiftId: { productionDayId: day.id, shiftId: shift.id } },
            update: { status: "PRODUCED" },
            create: {
              productionDayId: day.id,
              shiftId: shift.id,
              status: "PRODUCED",
              createdById: userId,
            },
          });
          await prisma.productionRecord.upsert({
            where: {
              productionShiftId_productId: {
                productionShiftId: productionShift.id,
                productId: product.id,
              },
            },
            update: {},
            create: {
              productionShiftId: productionShift.id,
              productId: product.id,
              quantityTonnes: new Prisma.Decimal(qty),
              createdById: userId,
            },
          });
          summary.recordsImported += 1;
        } catch (error) {
          summary.recordsWithErrors += 1;
          summary.errors.push({
            row: `${sheet.name} ${productLabel} col ${c}`,
            message: error instanceof Error ? error.message : "Invalid cell.",
          });
        }
      }
    }
  }

  return summary;
}
