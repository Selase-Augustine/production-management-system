import { z } from "zod";

export const productionLineSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  quantityTonnes: z.coerce
    .number({ error: "Enter a valid production quantity." })
    .min(0, "Enter a valid production quantity."),
  remarks: z.string().optional(),
});

export const saveProductionSchema = z
  .object({
    date: z.string().min(1, "Date is required."),
    shiftId: z.string().min(1, "Shift is required."),
    mode: z.enum(["PRODUCED", "NO_PRODUCTION"]),
    remarks: z.string().optional(),
    noProductionReasonId: z.string().optional(),
    lines: z.array(productionLineSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "NO_PRODUCTION" && !data.noProductionReasonId) {
      ctx.addIssue({
        code: "custom",
        path: ["noProductionReasonId"],
        message: "Please select a reason for no production.",
      });
    }
    if (data.mode === "PRODUCED") {
      if (data.lines.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["lines"],
          message: "Add at least one product.",
        });
      }
      const seen = new Set<string>();
      for (const [i, line] of data.lines.entries()) {
        if (seen.has(line.productId)) {
          ctx.addIssue({
            code: "custom",
            path: ["lines", i, "productId"],
            message: "This product already has a production record for this shift.",
          });
        }
        seen.add(line.productId);
      }
    }
  });
