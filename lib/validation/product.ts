import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  itemCode: z
    .string()
    .min(1, "Item code is required.")
    .transform((v) => v.trim().toUpperCase()),
  isActive: z.boolean().default(true),
});
