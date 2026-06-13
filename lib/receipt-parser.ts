import { COMMON_BRANDS } from '@/constants/products';
import type { ProductType } from './types';

export interface ParsedReceipt {
  retailer: string | null;
  /** ISO YYYY-MM-DD */
  purchaseDate: string | null;
  totalCents: number | null;
  /** Matched against COMMON_BRANDS, so it is always a valid brand option. */
  brand: string | null;
  productType: ProductType | null;
  /** The raw receipt line the product guess came from. */
  productLine: string | null;
  modelNumber: string | null;
}

const KNOWN_RETAILERS = [
  'Best Buy',
  'Harvey Norman',
  'Courts',
  'Challenger',
  'Gain City',
  'Audio House',
  'Best Denki',
  'Amazon',
  'Lazada',
  'Shopee',
  'Walmart',
  'Target',
  'Costco',
  'IKEA',
  'Apple Store',
  'Currys',
  'MediaMarkt',
  'JB Hi-Fi',
];

const PRODUCT_TYPE_KEYWORDS: { pattern: RegExp; type: ProductType }[] = [
  { pattern: /\b(tv|television|oled|qled)\b/i, type: 'television' },
  { pattern: /\b(laptop|notebook|macbook|chromebook|ultrabook)\b/i, type: 'laptop' },
  { pattern: /\b(iphone|smartphone|phone)\b/i, type: 'phone' },
  { pattern: /\b(ipad|tablet)\b/i, type: 'tablet' },
  { pattern: /\b(soundbar|speaker|headphone(s)?|earbuds?|subwoofer)\b/i, type: 'audio' },
  {
    pattern: /\b(microwave|blender|kettle|toaster|air ?fryer|fryer|oven|rice cooker|cooker|mixer|coffee machine|espresso)\b/i,
    type: 'kitchen_appliance',
  },
  {
    pattern: /\b(vacuum|washing machine|washer|dryer|dishwasher|purifier|dehumidifier|aircon|air ?conditioner|fan|fridge|refrigerator|freezer)\b/i,
    type: 'home_appliance',
  },
  { pattern: /\b(lamp|light bulb|ceiling light|downlight|hue)\b/i, type: 'lighting' },
  { pattern: /\b(smartwatch|watch|fitness (band|tracker))\b/i, type: 'wearable' },
  { pattern: /\b(playstation|ps5|ps4|xbox|nintendo switch|console)\b/i, type: 'gaming_console' },
  { pattern: /\b(camera|dslr|mirrorless|camcorder)\b/i, type: 'camera' },
];

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const NOISE_LINE = /\b(receipt|tax invoice|invoice|gst|reg(istration)? no|tel|phone|fax|www\.|http|thank you|cashier|order)\b/i;

function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return false;
  return d.getTime() <= Date.now();
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractDateFromLine(line: string): string | null {
  // 2025-01-15 / 2025/01/15
  let m = line.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) {
    const [, y, mo, d] = m.map(Number);
    if (isValidDate(y, mo, d)) return toIso(y, mo, d);
  }

  // 15/01/2025 or 01/15/2025 — disambiguate, defaulting to day-first
  m = line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    const dayFirst = a > 12 ? true : b > 12 ? false : true;
    const [d, mo] = dayFirst ? [a, b] : [b, a];
    if (isValidDate(y, mo, d)) return toIso(y, mo, d);
  }

  // 15 Jan 2025
  m = line.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b/i);
  if (m) {
    const d = Number(m[1]);
    const mo = MONTH_NAMES[m[2].toLowerCase()];
    const y = Number(m[3]);
    if (isValidDate(y, mo, d)) return toIso(y, mo, d);
  }

  // Jan 15, 2025
  m = line.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (m) {
    const mo = MONTH_NAMES[m[1].toLowerCase()];
    const d = Number(m[2]);
    const y = Number(m[3]);
    if (isValidDate(y, mo, d)) return toIso(y, mo, d);
  }

  return null;
}

function extractPurchaseDate(lines: string[]): string | null {
  const dateLabelled = lines.find((l) => /\bdate\b/i.test(l) && extractDateFromLine(l));
  if (dateLabelled) return extractDateFromLine(dateLabelled);
  for (const line of lines) {
    const found = extractDateFromLine(line);
    if (found) return found;
  }
  return null;
}

function amountsInLine(line: string): number[] {
  const out: number[] = [];
  const re = /(?:S?\$|SGD|USD|EUR|£|€)?\s?([0-9][0-9,]*)\.([0-9]{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const whole = Number(m[1].replace(/,/g, ''));
    const cents = whole * 100 + Number(m[2]);
    if (cents > 0) out.push(cents);
  }
  return out;
}

function extractTotalCents(lines: string[]): number | null {
  // Prefer an explicit total line (ignoring subtotals); take the last one,
  // which on most receipts is the grand total.
  const totalLines = lines.filter((l) => /\btotal\b/i.test(l) && !/sub\s?-?total/i.test(l));
  for (let i = totalLines.length - 1; i >= 0; i--) {
    const amounts = amountsInLine(totalLines[i]);
    if (amounts.length > 0) return amounts[amounts.length - 1];
  }
  // Fall back to the largest amount on the receipt.
  const all = lines.flatMap(amountsInLine);
  return all.length > 0 ? Math.max(...all) : null;
}

function extractRetailer(lines: string[]): string | null {
  const head = lines.slice(0, 8);
  for (const line of head) {
    const known = KNOWN_RETAILERS.find((r) => line.toLowerCase().includes(r.toLowerCase()));
    if (known) return known;
  }
  // Fall back to the first headline-ish line that isn't noise, a date, or an amount.
  for (const line of head) {
    if (NOISE_LINE.test(line)) continue;
    if (extractDateFromLine(line)) continue;
    if (amountsInLine(line).length > 0) continue;
    if (!/[a-zA-Z]{3}/.test(line)) continue;
    return line;
  }
  return null;
}

function findBrand(lines: string[]): { brand: string; line: string } | null {
  for (const line of lines) {
    for (const brand of COMMON_BRANDS) {
      if (new RegExp(`\\b${brand}\\b`, 'i').test(line)) {
        return { brand, line };
      }
    }
  }
  return null;
}

function findProductType(lines: string[]): { type: ProductType; line: string } | null {
  for (const line of lines) {
    for (const { pattern, type } of PRODUCT_TYPE_KEYWORDS) {
      if (pattern.test(line)) return { type, line };
    }
  }
  return null;
}

function extractModelNumber(line: string | null): string | null {
  if (!line) return null;
  // Alphanumeric token mixing letters and digits, e.g. QN65Q80B, WH-1000XM5, SV21.
  const tokens = line.toUpperCase().match(/\b[A-Z0-9][A-Z0-9-]{3,}\b/g) ?? [];
  for (const token of tokens) {
    if (!/[A-Z]/.test(token) || !/[0-9]/.test(token)) continue;
    if (/^\d+[A-Z]{1,3}$/.test(token)) continue; // quantities like 2PCS
    return token;
  }
  return null;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = toLines(text);

  const brandHit = findBrand(lines);
  const typeHit = findProductType(lines);
  const productLine = brandHit?.line ?? typeHit?.line ?? null;

  return {
    retailer: extractRetailer(lines),
    purchaseDate: extractPurchaseDate(lines),
    totalCents: extractTotalCents(lines),
    brand: brandHit?.brand ?? null,
    productType: typeHit?.type ?? null,
    productLine,
    modelNumber: extractModelNumber(productLine),
  };
}
