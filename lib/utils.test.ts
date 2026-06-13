import { format } from 'date-fns';

import type { Warranty } from './types';
import {
    cn,
    computeExpirationDate,
    formatCurrencySGD,
    formatDate,
    formatRelativeExpiry,
    withComputed,
} from './utils';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

const baseWarranty: Warranty = {
  id: 'w1',
  userId: 'u1',
  brand: 'Samsung',
  productType: 'television',
  modelNumber: 'QN65',
  serialNumber: 'SN1',
  purchaseDate: '2024-01-15',
  warrantyDurationMonths: 24,
  retailer: null,
  purchasePriceCents: null,
  receiptUrl: null,
  isExtended: false,
  extendedUntil: null,
  createdAt: '2024-01-15T00:00:00Z',
};

describe('cn', () => {
  it('joins truthy class names with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns empty string when nothing is truthy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('computeExpirationDate', () => {
  it('adds duration months to purchase date by default', () => {
    expect(ymd(computeExpirationDate(baseWarranty))).toBe('2026-01-15');
  });

  it('handles end-of-month edges (Jan 31 + 1 month → Feb 28/29)', () => {
    expect(
      ymd(computeExpirationDate({ ...baseWarranty, purchaseDate: '2023-01-31', warrantyDurationMonths: 1 })),
    ).toBe('2023-02-28');
  });

  it('handles leap years (Feb 29 + 12 months → Feb 28 next year)', () => {
    expect(
      ymd(computeExpirationDate({ ...baseWarranty, purchaseDate: '2024-02-29', warrantyDurationMonths: 12 })),
    ).toBe('2025-02-28');
  });

  it('uses extendedUntil when isExtended=true', () => {
    expect(
      ymd(computeExpirationDate({ ...baseWarranty, isExtended: true, extendedUntil: '2030-06-01' })),
    ).toBe('2030-06-01');
  });

  it('falls back to base computation when isExtended=true but extendedUntil is null', () => {
    expect(
      ymd(computeExpirationDate({ ...baseWarranty, isExtended: true, extendedUntil: null })),
    ).toBe('2026-01-15');
  });
});

describe('withComputed', () => {
  it('marks active when expiration is in the future', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const r = withComputed(baseWarranty, now);
    expect(r.isActive).toBe(true);
    expect(r.daysUntilExpiry).toBeGreaterThan(0);
  });

  it('marks expired when expiration is in the past', () => {
    const now = new Date('2027-01-01T00:00:00Z');
    const r = withComputed(baseWarranty, now);
    expect(r.isActive).toBe(false);
    expect(r.daysUntilExpiry).toBeLessThan(0);
  });

  it('treats day-of-expiry as still active (boundary)', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    const r = withComputed(baseWarranty, now);
    expect(r.daysUntilExpiry).toBe(0);
    expect(r.isActive).toBe(true);
  });

  it('preserves all warranty fields and adds computed ones', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const r = withComputed(baseWarranty, now);
    expect(r.id).toBe(baseWarranty.id);
    expect(r.brand).toBe(baseWarranty.brand);
    expect(typeof r.expirationDate).toBe('string');
    expect(typeof r.daysUntilExpiry).toBe('number');
    expect(typeof r.isActive).toBe('boolean');
  });
});

describe('formatDate', () => {
  it('formats ISO date as "d MMM yyyy"', () => {
    expect(formatDate('2025-01-15')).toBe('15 Jan 2025');
    expect(formatDate('2024-12-01')).toBe('1 Dec 2024');
  });
});

describe('formatRelativeExpiry', () => {
  it('handles already-expired (negative)', () => {
    expect(formatRelativeExpiry(-1)).toBe('Expired 1 day ago');
    expect(formatRelativeExpiry(-5)).toBe('Expired 5 days ago');
  });

  it('handles same-day and tomorrow', () => {
    expect(formatRelativeExpiry(0)).toBe('Expires today');
    expect(formatRelativeExpiry(1)).toBe('Expires tomorrow');
  });

  it('uses days for sub-month', () => {
    expect(formatRelativeExpiry(15)).toBe('Expires in 15 days');
    expect(formatRelativeExpiry(29)).toBe('Expires in 29 days');
  });

  it('uses months for sub-year', () => {
    expect(formatRelativeExpiry(60)).toMatch(/Expires in \d+ months?/);
    expect(formatRelativeExpiry(30)).toMatch(/Expires in 1 month/);
  });

  it('uses years past 365 days', () => {
    expect(formatRelativeExpiry(400)).toMatch(/Expires in 1 year/);
    expect(formatRelativeExpiry(800)).toMatch(/Expires in 2 years/);
  });
});

describe('formatCurrencySGD', () => {
  it('formats cents with two decimals and S$ prefix', () => {
    expect(formatCurrencySGD(0)).toBe('S$0.00');
    expect(formatCurrencySGD(99)).toBe('S$0.99');
    expect(formatCurrencySGD(12345)).toBe('S$123.45');
    expect(formatCurrencySGD(100000)).toBe('S$1000.00');
  });
});
