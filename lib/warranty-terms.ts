import type { ProductType } from './types';

export interface WarrantyTermRule {
  /** Case-insensitive brand match. Omit to match any brand. */
  brand?: string;
  /** Omit to match any product type. */
  productType?: ProductType;
  months: number;
  /** Short human-readable reason shown next to the inferred duration. */
  note: string;
}

export interface InferredWarrantyTerm {
  months: number;
  note: string;
}

export const DEFAULT_WARRANTY_MONTHS = 12;

/**
 * Small manufacturer-warranty lookup table. Rules are matched by specificity:
 * brand + category beats brand-only beats category-only. Months values stay
 * within the duration options offered by the warranty form (12/24/36/60).
 */
export const WARRANTY_TERM_RULES: WarrantyTermRule[] = [
  // Brand + category
  { brand: 'Apple', productType: 'laptop', months: 12, note: 'Apple limited warranty' },
  { brand: 'Samsung', productType: 'home_appliance', months: 24, note: 'Samsung appliance warranty' },
  { brand: 'LG', productType: 'home_appliance', months: 24, note: 'LG appliance warranty' },
  { brand: 'Sony', productType: 'television', months: 12, note: 'Sony TV warranty' },
  { brand: 'Philips', productType: 'lighting', months: 24, note: 'Philips lighting warranty' },

  // Brand-wide
  { brand: 'Dyson', months: 24, note: 'Dyson 2-year guarantee' },
  { brand: 'Bosch', months: 24, note: 'Bosch standard warranty' },
  { brand: 'Tefal', months: 24, note: 'Tefal standard warranty' },
  { brand: 'Logitech', months: 24, note: 'Logitech standard warranty' },
  { brand: 'Bose', months: 12, note: 'Bose standard warranty' },
  { brand: 'Nintendo', months: 12, note: 'Nintendo standard warranty' },

  // Category-wide
  { productType: 'kitchen_appliance', months: 24, note: 'Typical for kitchen appliances' },
  { productType: 'home_appliance', months: 24, note: 'Typical for home appliances' },
  { productType: 'lighting', months: 24, note: 'Typical for lighting' },
  { productType: 'television', months: 12, note: 'Typical for televisions' },
  { productType: 'laptop', months: 12, note: 'Typical for laptops' },
  { productType: 'phone', months: 12, note: 'Typical for phones' },
  { productType: 'tablet', months: 12, note: 'Typical for tablets' },
  { productType: 'audio', months: 12, note: 'Typical for audio gear' },
  { productType: 'wearable', months: 12, note: 'Typical for wearables' },
  { productType: 'gaming_console', months: 12, note: 'Typical for consoles' },
  { productType: 'camera', months: 12, note: 'Typical for cameras' },
];

function ruleSpecificity(rule: WarrantyTermRule): number {
  return (rule.brand ? 2 : 0) + (rule.productType ? 1 : 0);
}

export function inferWarrantyTerm(
  brand: string | null,
  productType: ProductType | null
): InferredWarrantyTerm {
  const normalizedBrand = brand?.trim().toLowerCase() ?? null;

  let best: WarrantyTermRule | null = null;
  for (const rule of WARRANTY_TERM_RULES) {
    if (rule.brand && rule.brand.toLowerCase() !== normalizedBrand) continue;
    if (rule.productType && rule.productType !== productType) continue;
    if (!best || ruleSpecificity(rule) > ruleSpecificity(best)) {
      best = rule;
    }
  }

  if (best) {
    return { months: best.months, note: best.note };
  }
  return { months: DEFAULT_WARRANTY_MONTHS, note: 'Default manufacturer warranty' };
}
