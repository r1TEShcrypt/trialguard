import { z } from "zod";
import { today } from "./services/dates.js";
export const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return (
      !isNaN(d) &&
      d.toISOString().slice(0, 10) === v &&
      v >= "1900-01-01" &&
      v <= "2200-12-31"
    );
  }, "Enter a valid calendar date");
export const moneySchema = z
  .string()
  .regex(
    /^\d{1,10}(\.\d{1,2})?$/,
    "Use a non-negative amount with up to two decimal places",
  );
const optionalDate = z
  .union([dateSchema, z.literal(""), z.null()])
  .transform((x) => x || null);
export const subscriptionSchema = z
  .object({
    service_name: z.string().trim().min(1).max(100),
    category_id: idSchema,
    price: moneySchema,
    billing_cycle: z.enum(["monthly", "yearly"]),
    status: z.enum(["active", "trial", "cancelled"]),
    start_date: dateSchema,
    next_billing_date: dateSchema,
    trial_end_date: optionalDate,
    provider_url: z.union([
      z.literal(""),
      z
        .url()
        .max(2048)
        .refine(
          (v) => ["http:", "https:"].includes(new URL(v).protocol),
          "Use an HTTP or HTTPS URL",
        ),
    ]),
    notes: z.string().max(5000),
    last_used_date: optionalDate,
  })
  .superRefine((s, ctx) => {
    if (s.status === "trial" && !s.trial_end_date)
      ctx.addIssue({
        code: "custom",
        path: ["trial_end_date"],
        message: "A trial end date is required",
      });
    for (const key of ["next_billing_date", "trial_end_date"])
      if (s[key] && s[key] < s.start_date)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Must be on or after the start date",
        });
    if (s.last_used_date && s.last_used_date > today())
      ctx.addIssue({
        code: "custom",
        path: ["last_used_date"],
        message: "Last-used date cannot be in the future",
      });
  });
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  password: z
    .string()
    .min(12)
    .refine(
      (v) => Buffer.byteLength(v) <= 72,
      "Password must be at most 72 UTF-8 bytes",
    ),
});
export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  password: z.string().min(1).max(200),
});
export const listSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(["active", "trial", "cancelled", "all"]).default("all"),
  category: z.union([z.literal("all"), idSchema]).default("all"),
  sort: z.enum(["date", "name", "price", "newest"]).default("date"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
