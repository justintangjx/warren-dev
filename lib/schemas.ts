import { z } from 'zod';

export const PRODUCT_TYPE_VALUES = [
  'television',
  'laptop',
  'phone',
  'tablet',
  'audio',
  'kitchen_appliance',
  'home_appliance',
  'lighting',
  'wearable',
  'gaming_console',
  'camera',
  'other',
] as const;

export const isoDate = z
  .string()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Use format YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Not a valid date')
  .refine((s) => Date.parse(s) <= Date.now(), 'Purchase date cannot be in the future');

export const warrantyFormSchema = z.object({
  brand: z.string().min(1, 'Required'),
  productType: z.enum(PRODUCT_TYPE_VALUES),
  modelNumber: z.string().min(1, 'Required'),
  serialNumber: z.string().min(1, 'Required'),
  purchaseDate: isoDate,
  warrantyDurationMonths: z.number().int().min(1, 'Must be at least 1 month').max(120),
  retailer: z.string().max(120, 'Keep it under 120 characters').optional(),
  purchasePrice: z
    .string()
    .refine(
      (s) => s === '' || /^\d+(\.\d{1,2})?$/.test(s.replace(/,/g, '')),
      'Use a price like 1299.99'
    )
    .optional(),
});

/** Convert a validated purchasePrice form string ("1,299.99") to integer cents, or null. */
export function purchasePriceToCents(price: string | undefined): number | null {
  if (!price) return null;
  const normalized = price.replace(/,/g, '');
  return Math.round(parseFloat(normalized) * 100);
}

export type WarrantyFormValues = z.infer<typeof warrantyFormSchema>;

export const claimFormSchema = z.object({
  issueDescription: z
    .string()
    .min(20, 'Please describe the issue (at least 20 characters)')
    .max(2000, 'Keep it under 2000 characters'),
});

export type ClaimFormValues = z.infer<typeof claimFormSchema>;
