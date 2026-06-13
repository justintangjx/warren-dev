import { claimFormSchema, isoDate, purchasePriceToCents, warrantyFormSchema } from './schemas';

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? undefined : result.error?.issues[0]?.message;

describe('isoDate', () => {
  it('accepts a well-formed past date', () => {
    expect(isoDate.safeParse('2024-01-15').success).toBe(true);
  });

  it('accepts today (boundary)', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isoDate.safeParse(today).success).toBe(true);
  });

  describe('format errors', () => {
    it.each([
      ['empty string', ''],
      ['random text', 'abc'],
      ['US format', '12/25/2024'],
      ['missing day', '2024-01'],
      ['short year', '24-01-15'],
      ['extra characters', '2024-01-15T00:00:00'],
    ])('rejects %s with format message', (_label, value) => {
      expect(firstError(isoDate.safeParse(value))).toBe('Use format YYYY-MM-DD');
    });
  });

  describe('calendar validity', () => {
    it.each([
      ['month 99', '2024-99-01'],
      ['day 99', '2024-01-99'],
      ['month 13', '2024-13-01'],
    ])('rejects %s as not a valid date', (_label, value) => {
      expect(firstError(isoDate.safeParse(value))).toBe('Not a valid date');
    });

    // Known gap: Date.parse silently overflows e.g. 2024-02-30 → 2024-03-01.
    // Tightening this would require explicit calendar-day reconstruction in the schema.
    it('does not yet catch silent overflow like Feb 30 (documented gap)', () => {
      expect(isoDate.safeParse('2024-02-30').success).toBe(true);
    });
  });

  describe('future dates', () => {
    it('rejects a date far in the future', () => {
      expect(firstError(isoDate.safeParse('2099-01-01'))).toBe(
        'Purchase date cannot be in the future',
      );
    });

    it('rejects tomorrow', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      expect(firstError(isoDate.safeParse(tomorrow))).toBe(
        'Purchase date cannot be in the future',
      );
    });
  });
});

describe('warrantyFormSchema', () => {
  const valid = {
    brand: 'Samsung',
    productType: 'television' as const,
    modelNumber: 'QN65',
    serialNumber: 'SN1',
    purchaseDate: '2024-01-15',
    warrantyDurationMonths: 24,
  };

  it('accepts a fully valid payload', () => {
    expect(warrantyFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['brand', 'modelNumber', 'serialNumber'] as const)(
    'requires %s to be non-empty',
    (field) => {
      const result = warrantyFormSchema.safeParse({ ...valid, [field]: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === field);
        expect(issue?.message).toBe('Required');
      }
    },
  );

  it('rejects an unknown productType', () => {
    const result = warrantyFormSchema.safeParse({ ...valid, productType: 'spaceship' });
    expect(result.success).toBe(false);
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['over 120 months', 121],
    ['non-integer', 12.5],
  ])('rejects warrantyDurationMonths: %s', (_label, months) => {
    const result = warrantyFormSchema.safeParse({ ...valid, warrantyDurationMonths: months });
    expect(result.success).toBe(false);
  });

  it('emits the "at least 1 month" message when duration is 0', () => {
    const result = warrantyFormSchema.safeParse({ ...valid, warrantyDurationMonths: 0 });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'warrantyDurationMonths');
      expect(issue?.message).toBe('Must be at least 1 month');
    }
  });

  it('accepts optional retailer and purchasePrice', () => {
    const result = warrantyFormSchema.safeParse({
      ...valid,
      retailer: 'Best Buy',
      purchasePrice: '1,299.99',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty purchasePrice string', () => {
    expect(warrantyFormSchema.safeParse({ ...valid, purchasePrice: '' }).success).toBe(true);
  });

  it.each([
    ['letters', 'abc'],
    ['negative', '-5.00'],
    ['three decimals', '12.345'],
  ])('rejects purchasePrice: %s', (_label, purchasePrice) => {
    const result = warrantyFormSchema.safeParse({ ...valid, purchasePrice });
    expect(result.success).toBe(false);
  });

  it('forwards the purchaseDate format error', () => {
    const result = warrantyFormSchema.safeParse({ ...valid, purchaseDate: 'nope' });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'purchaseDate');
      expect(issue?.message).toBe('Use format YYYY-MM-DD');
    }
  });
});

describe('purchasePriceToCents', () => {
  it('converts a decimal price to cents', () => {
    expect(purchasePriceToCents('1299.99')).toBe(129999);
  });

  it('handles thousands separators', () => {
    expect(purchasePriceToCents('1,299.99')).toBe(129999);
  });

  it('handles whole numbers', () => {
    expect(purchasePriceToCents('50')).toBe(5000);
  });

  it('returns null for empty or undefined', () => {
    expect(purchasePriceToCents('')).toBeNull();
    expect(purchasePriceToCents(undefined)).toBeNull();
  });
});

describe('claimFormSchema', () => {
  it('accepts a description of exactly 20 characters', () => {
    const result = claimFormSchema.safeParse({ issueDescription: 'a'.repeat(20) });
    expect(result.success).toBe(true);
  });

  it('rejects a description shorter than 20 characters', () => {
    const result = claimFormSchema.safeParse({ issueDescription: 'too short' });
    expect(firstError(result)).toBe('Please describe the issue (at least 20 characters)');
  });

  it('accepts a description of exactly 2000 characters', () => {
    const result = claimFormSchema.safeParse({ issueDescription: 'a'.repeat(2000) });
    expect(result.success).toBe(true);
  });

  it('rejects a description longer than 2000 characters', () => {
    const result = claimFormSchema.safeParse({ issueDescription: 'a'.repeat(2001) });
    expect(firstError(result)).toBe('Keep it under 2000 characters');
  });

  it('rejects a non-string value', () => {
    const result = claimFormSchema.safeParse({ issueDescription: 123 });
    expect(result.success).toBe(false);
  });
});
