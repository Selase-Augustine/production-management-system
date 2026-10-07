import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name is required."),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});
