import { COMMON_BRANDS } from '../constants/products';
import {
  buildRegistrationTarget,
  REGISTRATION_PROVIDERS,
  REGISTRATION_WINDOW_DAYS,
  resolveRegistration,
  shouldPromptRegistration,
} from './product-registration';
import type { Warranty } from './types';

function sampleWarranty(overrides: Partial<Warranty> = {}): Warranty {
  return {
    id: 'w1',
    userId: 'u1',
    brand: 'Samsung',
    productType: 'television',
    modelNumber: 'QN65Q80B',
    serialNumber: 'SN-12345',
    purchaseDate: '2025-01-15',
    warrantyDurationMonths: 24,
    retailer: null,
    purchasePriceCents: null,
    receiptUrl: null,
    isExtended: false,
    extendedUntil: null,
    createdAt: '2025-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveRegistration', () => {
  it('resolves a known brand to a url provider', () => {
    const provider = resolveRegistration('Samsung', 'television');
    expect(provider.method).toBe('url');
    expect(provider.registrationUrl).toBeTruthy();
  });

  it('is case-insensitive on brand', () => {
    expect(resolveRegistration('samsung', null).note).toBe(
      resolveRegistration('SAMSUNG', null).note
    );
  });

  it('prefers a brand rule over the default for any product type', () => {
    // Samsung is a brand-only rule; it should win over the default regardless of category.
    const provider = resolveRegistration('Samsung', 'phone');
    expect(provider.brand).toBe('Samsung');
  });

  it('falls back to the unsupported default for an unknown brand', () => {
    const provider = resolveRegistration('NoSuchBrand', 'phone');
    expect(provider.method).toBe('unsupported');
    expect(provider.registrationUrl).toBeUndefined();
  });

  it('falls back to the default when brand is null', () => {
    expect(resolveRegistration(null, null).method).toBe('unsupported');
  });

  it('every COMMON_BRAND resolves to a valid provider', () => {
    for (const brand of COMMON_BRANDS) {
      const provider = resolveRegistration(brand, null);
      expect(['url', 'unsupported']).toContain(provider.method);
      if (provider.method === 'url') {
        expect(provider.registrationUrl).toMatch(/^https:\/\//);
      }
      expect(provider.note.length).toBeGreaterThan(0);
    }
  });
});

describe('buildRegistrationTarget', () => {
  it('always exposes serial, model and purchase date for copy/paste', () => {
    const w = sampleWarranty();
    const target = buildRegistrationTarget(w);
    expect(target.prefillFields).toEqual([
      { label: 'Serial number', value: 'SN-12345' },
      { label: 'Model number', value: 'QN65Q80B' },
      { label: 'Purchase date', value: '2025-01-15' },
    ]);
  });

  it('uses the provider base URL as openUrl for url-method brands', () => {
    const w = sampleWarranty({ brand: 'Samsung' });
    const provider = resolveRegistration('Samsung', w.productType);
    const target = buildRegistrationTarget(w);
    expect(target.method).toBe('url');
    expect(target.openUrl).toBe(provider.registrationUrl);
  });

  it('returns a null openUrl for unsupported brands', () => {
    const w = sampleWarranty({ brand: 'NoSuchBrand' });
    const target = buildRegistrationTarget(w);
    expect(target.method).toBe('unsupported');
    expect(target.openUrl).toBeNull();
  });

  it('encodes prefill query params when a provider declares them', () => {
    // Future-proofs Phase 2: any provider with prefillParams must append encoded values.
    for (const provider of REGISTRATION_PROVIDERS) {
      if (!provider.prefillParams || provider.method !== 'url') continue;
      const w = sampleWarranty({ brand: provider.brand, serialNumber: 'A B/C' });
      const target = buildRegistrationTarget(w);
      expect(target.openUrl).toContain('?');
      // URLSearchParams encodes spaces as '+' and '/' as %2F.
      expect(target.openUrl).toMatch(/A\+B%2FC|A%20B%2FC/);
    }
  });
});

describe('shouldPromptRegistration', () => {
  const base = { purchaseDate: '2025-01-15', status: 'not_started' as const, isActive: true };
  const day = (n: number) => new Date(Date.UTC(2025, 0, 15 + n));

  it('shows on the purchase day (day 0)', () => {
    expect(shouldPromptRegistration({ ...base, now: day(0) }).show).toBe(true);
  });

  it('shows on the last day of the window', () => {
    const result = shouldPromptRegistration({ ...base, now: day(REGISTRATION_WINDOW_DAYS) });
    expect(result.show).toBe(true);
    expect(result.urgency).toBe('soon');
  });

  it('stops showing the day after the window closes', () => {
    expect(
      shouldPromptRegistration({ ...base, now: day(REGISTRATION_WINDOW_DAYS + 1) }).show
    ).toBe(false);
  });

  it('marks early days as info, not soon', () => {
    expect(shouldPromptRegistration({ ...base, now: day(10) }).urgency).toBe('info');
  });

  it('suppresses when already registered', () => {
    expect(
      shouldPromptRegistration({ ...base, status: 'registered', now: day(5) }).show
    ).toBe(false);
  });

  it('suppresses when registration is not available', () => {
    expect(
      shouldPromptRegistration({ ...base, status: 'not_available', now: day(5) }).show
    ).toBe(false);
  });

  it('suppresses when the warranty is no longer active', () => {
    expect(
      shouldPromptRegistration({ ...base, isActive: false, now: day(5) }).show
    ).toBe(false);
  });

  it('still prompts when the user has only started (assisted) but not confirmed', () => {
    expect(
      shouldPromptRegistration({ ...base, status: 'assisted', now: day(5) }).show
    ).toBe(true);
  });
});
