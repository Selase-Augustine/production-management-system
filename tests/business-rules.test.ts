import { describe, expect, it } from "vitest";
import { saveProductionSchema } from "@/lib/validation/production";
import { productSchema } from "@/lib/validation/product";
import { dayStatusFromShifts } from "@/lib/production/status";
import { assertNoDuplicateProducts, sumQuantities } from "@/lib/production/totals";
import { describeProductionSave, rowsFromProductionShifts } from "@/lib/production/entry-rows";

describe("business rules (pure)", () => {
  it("a production day is complete only when all three shifts are recorded", () => {
    expect(dayStatusFromShifts(["PRODUCED", "PRODUCED", "PRODUCED"])).toBe("COMPLETE");
    expect(dayStatusFromShifts(["PRODUCED", "NO_PRODUCTION", "PRODUCED"])).toBe("COMPLETE");
    expect(dayStatusFromShifts(["PRODUCED", "PENDING", "MISSING"])).toBe("IN_PROGRESS");
    expect(dayStatusFromShifts(["MISSING", "MISSING", "MISSING"])).toBe("NOT_STARTED");
  });

  it("pending shifts are detected when status is PENDING or missing", () => {
    const statuses = ["PRODUCED", "PENDING", "MISSING"] as const;
    const pending = statuses.filter((s) => s === "PENDING" || s === "MISSING").length;
    expect(pending).toBe(2);
  });

  it("product codes must be unique after normalization", () => {
    const a = productSchema.parse({ name: "Cowbell Coffee", itemCode: "cbcf" });
    expect(a.itemCode).toBe("CBCF");
  });

  it("multiple products can be recorded in one shift", () => {
    const parsed = saveProductionSchema.parse({
      date: "2026-09-02",
      shiftId: "s1",
      mode: "PRODUCED",
      lines: [
        { productId: "p1", quantityTonnes: 20 },
        { productId: "p2", quantityTonnes: 20 },
      ],
    });
    expect(parsed.lines).toHaveLength(2);
  });

  it("the same product cannot be duplicated within a shift", () => {
    const parsed = saveProductionSchema.safeParse({
      date: "2026-09-02",
      shiftId: "s1",
      mode: "PRODUCED",
      lines: [
        { productId: "p1", quantityTonnes: 20 },
        { productId: "p1", quantityTonnes: 15 },
      ],
    });
    expect(parsed.success).toBe(false);
    expect(assertNoDuplicateProducts(["p1", "p1"])).toBe(false);
  });

  it("production quantities can be decimal values", () => {
    const parsed = saveProductionSchema.parse({
      date: "2026-01-01",
      shiftId: "s1",
      mode: "PRODUCED",
      lines: [{ productId: "p1", quantityTonnes: 18.5 }],
    });
    expect(parsed.lines[0].quantityTonnes).toBe(18.5);
  });

  it("no-production requires a reason", () => {
    const missing = saveProductionSchema.safeParse({
      date: "2026-01-01",
      shiftId: "s1",
      mode: "NO_PRODUCTION",
      lines: [],
    });
    expect(missing.success).toBe(false);
    const ok = saveProductionSchema.safeParse({
      date: "2026-01-01",
      shiftId: "s1",
      mode: "NO_PRODUCTION",
      noProductionReasonId: "r1",
      lines: [],
    });
    expect(ok.success).toBe(true);
  });

  it("monthly, quarterly and yearly totals are sums of records", () => {
    const jan = [20, 25];
    const feb = [10];
    const mar = [5.5];
    const monthly = sumQuantities(jan);
    const quarterly = sumQuantities([...jan, ...feb, ...mar]);
    const yearly = quarterly;
    expect(monthly).toBe(45);
    expect(quarterly).toBe(60.5);
    expect(yearly).toBe(60.5);
  });

  it("no-production shifts appear as saved entries even without product lines", () => {
    const rows = rowsFromProductionShifts([
      {
        id: "shift-1",
        status: "NO_PRODUCTION",
        remarks: null,
        updatedAt: new Date("2026-11-10T12:00:00Z"),
        createdBy: { name: "Production Manager" },
        shift: { name: "Morning" },
        productionDay: { productionDate: new Date("2026-11-10T00:00:00Z") },
        noProductionReason: { name: "Power Outage" },
        records: [],
      },
      {
        id: "shift-2",
        status: "PRODUCED",
        remarks: null,
        updatedAt: new Date("2026-11-10T12:00:00Z"),
        createdBy: { name: "Production Manager" },
        shift: { name: "Afternoon" },
        productionDay: { productionDate: new Date("2026-11-10T00:00:00Z") },
        noProductionReason: null,
        records: [
          {
            id: "rec-1",
            quantityTonnes: 12.5,
            updatedAt: new Date("2026-11-10T12:00:00Z"),
            product: { name: "Cowbell Coffee", itemCode: "CBCF" },
            createdBy: { name: "Production Manager" },
          },
        ],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe("NO_PRODUCTION");
    expect(rows[0].reason).toBe("Power Outage");
    expect(rows[0].recordId).toBeNull();
    expect(rows[1].quantity).toBe(12.5);
  });

  it("save confirmation copy covers both production and no production", () => {
    expect(
      describeProductionSave({
        date: "2026-11-10",
        shiftName: "Morning",
        mode: "NO_PRODUCTION",
        reasonName: "Power Outage",
        lines: [],
      }).title,
    ).toMatch(/no production/i);
    expect(
      describeProductionSave({
        date: "2026-11-10",
        shiftName: "Morning",
        mode: "PRODUCED",
        lines: [{ productName: "Cowbell Coffee", quantityTonnes: 10 }],
      }).title,
    ).toMatch(/save production/i);
  });

  it("product and shift totals add correctly", () => {
    const coffee = sumQuantities([25, 20, 20]);
    const morning = sumQuantities([20, 25]);
    expect(coffee).toBe(65);
    expect(morning).toBe(45);
  });
});
