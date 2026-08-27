import { z } from "zod";

export const PACK_TYPES = [
  "loose",
  "packet",
  "bottle",
  "can",
  "bag",
  "box",
  "tray",
  "bunch",
] as const;
export type PackType = (typeof PACK_TYPES)[number];

export const UNITS = ["kg", "g", "litre", "ml", "piece"] as const;
export type Unit = (typeof UNITS)[number];

export const productNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long");

export const storeNameSchema = z
  .string()
  .trim()
  .min(2, "Store name must be at least 2 characters")
  .max(120, "Name is too long");

export const createProductSchema = z.object({
  canonical_name: productNameSchema,
  category: z.string().trim().max(60).optional().or(z.literal("")),
  default_unit: z.enum(UNITS).default("kg"),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const createStoreSchema = z.object({
  name: storeNameSchema,
  chain: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
});
export type CreateStoreInput = z.infer<typeof createStoreSchema>;

const latLngTuple = z.object({
  lat: z
    .number()
    .refine((n) => n >= -90 && n <= 90, "Latitude out of range"),
  lng: z
    .number()
    .refine((n) => n >= -180 && n <= 180, "Longitude out of range"),
});

export const createStoreWithLocationSchema = z.object({
  name: storeNameSchema,
  address: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  lat: latLngTuple.shape.lat,
  lng: latLngTuple.shape.lng,
  place_id: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});
export type CreateStoreWithLocationInput = z.infer<
  typeof createStoreWithLocationSchema
>;

export const updateStoreSchema = z.object({
  name: storeNameSchema,
  chain: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  address: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  unit: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  parent_store_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  lat: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .refine(
      (v) => v === null || (v >= -90 && v <= 90),
      "Latitude must be between -90 and 90",
    ),
  lng: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .refine(
      (v) => v === null || (v >= -180 && v <= 180),
      "Longitude must be between -180 and 180",
    ),
});
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

export const createPurchaseSchema = z.object({
  product_id: z.string().uuid("Pick a product"),
  store_id: z.string().uuid("Pick a store"),
  brand: optionalTrimmed(80),
  origin_country: optionalTrimmed(60),
  pack_type: z.enum(PACK_TYPES).default("loose"),
  pack_size_g: optionalNumber.refine(
    (v) => v === null || v > 0,
    "Pack size must be greater than zero",
  ),
  price_paid_myr: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "number" ? v : Number(v)))
    .refine(
      (n) => Number.isFinite(n) && n >= 0,
      "Price must be a number ≥ 0",
    ),
  discount_myr: optionalNumber.refine(
    (v) => v === null || v >= 0,
    "Discount must be ≥ 0",
  ),
  rounding_myr: optionalNumber,
  qty: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return 1;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : 1;
    })
    .refine((n) => n > 0, "Quantity must be greater than zero"),
  purchased_at: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v).toISOString() : new Date().toISOString())),
  notes: optionalTrimmed(500),
});
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const createPriceEntrySchema = z.object({
  product_id: z.string().uuid("Pick a product"),
  store_id: z.string().uuid("Pick a store"),
  brand: optionalTrimmed(80),
  origin_country: optionalTrimmed(60),
  pack_type: z.enum(PACK_TYPES).default("loose"),
  pack_size_g: optionalNumber.refine(
    (v) => v === null || v > 0,
    "Pack size must be greater than zero",
  ),
  price_myr: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "number" ? v : Number(v)))
    .refine((n) => Number.isFinite(n) && n >= 0, "Price must be a number ≥ 0"),
  observed_at: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v).toISOString() : new Date().toISOString())),
  notes: optionalTrimmed(500),
});
export type CreatePriceEntryInput = z.infer<typeof createPriceEntrySchema>;

export const batchRowSchema = z.object({
  productName: productNameSchema,
  storeName: storeNameSchema,
  brand: optionalTrimmed(80),
  originCountry: optionalTrimmed(60),
  packType: z.enum(PACK_TYPES).default("loose"),
  packSizeG: optionalNumber.refine(
    (v) => v === null || v > 0,
    "Pack size must be greater than zero",
  ),
  priceMyr: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "number" ? v : Number(v)))
    .refine(
      (n) => Number.isFinite(n) && n >= 0,
      "Price must be a number ≥ 0",
    ),
  observedAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v).toISOString() : new Date().toISOString())),
  notes: optionalTrimmed(500),
  source: z.enum(["manual", "image", "file", "smart"]).default("manual"),
  evidencePaths: z.array(z.string().min(1).max(500)).max(20).default([]),
});
export type BatchRowInput = z.infer<typeof batchRowSchema>;

