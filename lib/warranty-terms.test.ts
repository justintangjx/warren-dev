import { DEFAULT_WARRANTY_MONTHS, inferWarrantyTerm } from './warranty-terms';

describe('inferWarrantyTerm', () => {
  it('falls back to the default when nothing matches', () => {
    const result = inferWarrantyTerm(null, null);
    expect(result.months).toBe(DEFAULT_WARRANTY_MONTHS);
  });

  it('falls back to the default for an unknown brand with no category', () => {
    const result = inferWarrantyTerm('NoSuchBrand', null);
    expect(result.months).toBe(DEFAULT_WARRANTY_MONTHS);
  });

  it('matches a category-wide rule', () => {
    const result = inferWarrantyTerm(null, 'kitchen_appliance');
    expect(result.months).toBe(24);
  });

  it('matches a brand-wide rule', () => {
    const result = inferWarrantyTerm('Dyson', null);
    expect(result.months).toBe(24);
    expect(result.note).toMatch(/Dyson/);
  });

  it('is case-insensitive on brand', () => {
    expect(inferWarrantyTerm('dyson', null).months).toBe(24);
    expect(inferWarrantyTerm('DYSON', 'home_appliance').months).toBe(24);
  });

  it('prefers brand + category over category-wide rules', () => {
    // Category-wide says TVs are 12 months; the Sony+TV rule also says 12,
    // so use Samsung home appliance (24) vs phone category (12) to test precedence.
    const result = inferWarrantyTerm('Samsung', 'home_appliance');
    expect(result.months).toBe(24);
    expect(result.note).toMatch(/Samsung/);
  });

  it('prefers brand-wide rules over category-wide rules', () => {
    // Laptops default to 12, but Bosch as a brand carries 24.
    const result = inferWarrantyTerm('Bosch', 'laptop');
    expect(result.months).toBe(24);
    expect(result.note).toMatch(/Bosch/);
  });

  it('uses the category rule when the brand is unknown', () => {
    const result = inferWarrantyTerm('NoSuchBrand', 'television');
    expect(result.months).toBe(12);
  });
});
