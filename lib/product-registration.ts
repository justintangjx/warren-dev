import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { ProductType, RegistrationStatus, Warranty } from './types';

export type RegistrationMethod = 'url' | 'unsupported';

export interface RegistrationProvider {
  /** Case-insensitive brand match. Omit to match any brand (category/default rule). */
  brand?: string;
  /** Omit to match any product type. */
  productType?: ProductType;
  method: RegistrationMethod;
  /** Base manufacturer registration URL for method 'url'. */
  registrationUrl?: string;
  /**
   * Phase 2: query-param keys the OEM form accepts, mapped to the warranty field
   * whose value should be supplied. When present, buildRegistrationTarget appends an
   * encoded query string to registrationUrl.
   */
  prefillParams?: Record<string, 'serialNumber' | 'modelNumber' | 'purchaseDate'>;
  /** Short human-readable label shown in the UI. */
  note: string;
}

export interface RegistrationTarget {
  brand: string | null;
  method: RegistrationMethod;
  note: string;
  /** Final URL to open (base + encoded query when prefillParams provided), or null. */
  openUrl: string | null;
  /** Fields to surface for copy/paste when the OEM form cannot be pre-filled via URL. */
  prefillFields: { label: string; value: string }[];
}

/**
 * Manufacturer registration directory. Rules match by specificity (brand + category
 * beats brand-only beats category-only beats default), mirroring lib/warranty-terms.ts.
 *
 * URLs are best-effort and Singapore-oriented. They must be hand-verified by the
 * implementer; the eval suite asserts shape and resolution precedence, not live
 * reachability. Brands with no clear consumer registration portal use method
 * 'unsupported', which falls back to a copy/paste guidance flow in the UI.
 */
export const REGISTRATION_PROVIDERS: RegistrationProvider[] = [
  { brand: 'Samsung', method: 'url', registrationUrl: 'https://www.samsung.com/sg/support/your-service/welcome/', note: 'Samsung product registration' },
  { brand: 'Apple', method: 'url', registrationUrl: 'https://checkcoverage.apple.com/', note: 'Apple coverage check / registration' },
  { brand: 'Dyson', method: 'url', registrationUrl: 'https://www.dyson.com.sg/your-dyson/register-guarantee', note: 'Dyson guarantee registration' },
  { brand: 'LG', method: 'url', registrationUrl: 'https://www.lg.com/sg/support/product-registration', note: 'LG product registration' },
  { brand: 'Sony', method: 'url', registrationUrl: 'https://www.sony.com.sg/electronics/support/register-product', note: 'Sony product registration' },
  { brand: 'Philips', method: 'url', registrationUrl: 'https://www.philips.com.sg/c-w/support-home/register-my-product.html', note: 'Philips product registration' },
  { brand: 'Bosch', method: 'url', registrationUrl: 'https://www.bosch-home.com/sg/customer-service/product-registration', note: 'Bosch product registration' },
  { brand: 'Panasonic', method: 'url', registrationUrl: 'https://www.panasonic.com/sg/support/product-registration.html', note: 'Panasonic product registration' },
  { brand: 'Asus', method: 'url', registrationUrl: 'https://account.asus.com/productreg.aspx', note: 'ASUS product registration' },
  { brand: 'Dell', method: 'url', registrationUrl: 'https://www.dell.com/support/home', note: 'Dell support / service tag' },
  { brand: 'HP', method: 'url', registrationUrl: 'https://register.hp.com/', note: 'HP product registration' },
  { brand: 'Lenovo', method: 'url', registrationUrl: 'https://support.lenovo.com/sg/en/warrantylookup', note: 'Lenovo warranty lookup / registration' },
  { brand: 'Microsoft', method: 'url', registrationUrl: 'https://support.microsoft.com/devices', note: 'Microsoft device support' },
  { brand: 'Logitech', method: 'url', registrationUrl: 'https://www.logitech.com/en-sg/my-account.html', note: 'Logitech product registration' },
  { brand: 'Bose', method: 'url', registrationUrl: 'https://www.bose.com/register', note: 'Bose product registration' },
  { brand: 'Canon', method: 'url', registrationUrl: 'https://sg.canon/en/support', note: 'Canon product registration' },
  { brand: 'Nikon', method: 'url', registrationUrl: 'https://reg.nikon-asia.com/', note: 'Nikon product registration' },

  // No clear consumer registration portal — fall back to copy/paste guidance.
  { brand: 'Xiaomi', method: 'unsupported', note: 'Register directly with the manufacturer' },
  { brand: 'Nintendo', method: 'unsupported', note: 'Register directly with the manufacturer' },
  { brand: 'JBL', method: 'unsupported', note: 'Register directly with the manufacturer' },
  { brand: 'Tefal', method: 'unsupported', note: 'Register directly with the manufacturer' },
  { brand: 'Mistral', method: 'unsupported', note: 'Register directly with the manufacturer' },
  { brand: 'Europace', method: 'unsupported', note: 'Register directly with the manufacturer' },
  { brand: 'Toshiba', method: 'unsupported', note: 'Register directly with the manufacturer' },
  { brand: 'Sharp', method: 'unsupported', note: 'Register directly with the manufacturer' },
];

const DEFAULT_PROVIDER: RegistrationProvider = {
  method: 'unsupported',
  note: 'Register directly with the manufacturer',
};

function ruleSpecificity(rule: RegistrationProvider): number {
  return (rule.brand ? 2 : 0) + (rule.productType ? 1 : 0);
}

export function resolveRegistration(
  brand: string | null,
  productType: ProductType | null
): RegistrationProvider {
  const normalizedBrand = brand?.trim().toLowerCase() ?? null;

  let best: RegistrationProvider | null = null;
  for (const rule of REGISTRATION_PROVIDERS) {
    if (rule.brand && rule.brand.toLowerCase() !== normalizedBrand) continue;
    if (rule.productType && rule.productType !== productType) continue;
    if (!best || ruleSpecificity(rule) > ruleSpecificity(best)) {
      best = rule;
    }
  }

  return best ?? DEFAULT_PROVIDER;
}

type PrefillSource = Pick<
  Warranty,
  'brand' | 'productType' | 'serialNumber' | 'modelNumber' | 'purchaseDate'
>;

const PREFILL_FIELD_VALUE: Record<
  'serialNumber' | 'modelNumber' | 'purchaseDate',
  (w: PrefillSource) => string
> = {
  serialNumber: (w) => w.serialNumber,
  modelNumber: (w) => w.modelNumber,
  purchaseDate: (w) => w.purchaseDate,
};

export function buildRegistrationTarget(w: PrefillSource): RegistrationTarget {
  const provider = resolveRegistration(w.brand, w.productType);

  // Always offer these for copy/paste so the fallback is useful regardless of method.
  const prefillFields = [
    { label: 'Serial number', value: w.serialNumber },
    { label: 'Model number', value: w.modelNumber },
    { label: 'Purchase date', value: w.purchaseDate },
  ];

  let openUrl: string | null = null;
  if (provider.method === 'url' && provider.registrationUrl) {
    openUrl = provider.registrationUrl;
    if (provider.prefillParams) {
      const params = new URLSearchParams();
      for (const [key, field] of Object.entries(provider.prefillParams)) {
        const value = PREFILL_FIELD_VALUE[field](w);
        if (value) params.set(key, value);
      }
      const query = params.toString();
      if (query) {
        openUrl += (provider.registrationUrl.includes('?') ? '&' : '?') + query;
      }
    }
  }

  return {
    brand: w.brand ?? null,
    method: provider.method,
    note: provider.note,
    openUrl,
    prefillFields,
  };
}

/**
 * How long after purchase we actively nudge the user to register. Many manufacturers
 * require registration within a window of purchase to activate full/extended terms.
 */
export const REGISTRATION_WINDOW_DAYS = 120;

export interface RegistrationPrompt {
  show: boolean;
  urgency: 'none' | 'info' | 'soon';
  daysSincePurchase: number;
}

export function shouldPromptRegistration(args: {
  purchaseDate: string;
  status: RegistrationStatus;
  isActive: boolean;
  now?: Date;
}): RegistrationPrompt {
  const now = args.now ?? new Date();
  const daysSincePurchase = differenceInCalendarDays(now, parseISO(args.purchaseDate));

  const none: RegistrationPrompt = { show: false, urgency: 'none', daysSincePurchase };

  if (!args.isActive) return none;
  if (args.status === 'registered' || args.status === 'not_available') return none;
  if (daysSincePurchase < 0 || daysSincePurchase > REGISTRATION_WINDOW_DAYS) return none;

  // Within the last quarter of the window, treat it as time-sensitive.
  const soonThreshold = REGISTRATION_WINDOW_DAYS * 0.75;
  const urgency = daysSincePurchase >= soonThreshold ? 'soon' : 'info';
  return { show: true, urgency, daysSincePurchase };
}
