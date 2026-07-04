import { buildReadinessRecommendations, type AgentRecommendationDraft } from './agent-readiness';
import type { Claim, Warranty } from './types';

function warranty(overrides: Partial<Warranty> = {}): Warranty {
  return {
    id: 'warranty-1',
    userId: 'user-1',
    brand: 'Dyson',
    productType: 'home_appliance',
    modelNumber: 'V15',
    serialNumber: 'SN123',
    purchaseDate: '2026-03-01',
    warrantyDurationMonths: 12,
    retailer: null,
    purchasePriceCents: null,
    receiptUrl: null,
    isExtended: false,
    extendedUntil: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-1',
    warrantyId: 'warranty-1',
    userId: 'user-1',
    issueDescription: 'The vacuum battery no longer charges after normal use.',
    status: 'submitted',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function fingerprints(drafts: AgentRecommendationDraft[]): string[] {
  return drafts.map((draft) => draft.fingerprint);
}

describe('buildReadinessRecommendations', () => {
  it('prompts for manufacturer registration inside the registration window', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [warranty()],
      claims: [],
      registrationsByWarrantyId: {},
      now: new Date('2026-03-20T00:00:00.000Z'),
    });

    expect(drafts).toEqual([
      expect.objectContaining({
        kind: 'register_product',
        priority: 'medium',
        warrantyId: 'warranty-1',
        action: { type: 'navigate', route: 'warranty_detail', warrantyId: 'warranty-1' },
        fingerprint: 'register_product:warranty-1',
      }),
    ]);
  });

  it('raises registration priority near the end of the registration window', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [warranty()],
      claims: [],
      registrationsByWarrantyId: {},
      now: new Date('2026-06-05T00:00:00.000Z'),
    });

    expect(drafts[0]).toMatchObject({
      kind: 'register_product',
      priority: 'high',
      evidence: expect.objectContaining({ registration_urgency: 'soon' }),
    });
  });

  it('suppresses registration when already registered or outside the window', () => {
    expect(
      buildReadinessRecommendations({
        warranties: [warranty()],
        claims: [],
        registrationsByWarrantyId: { 'warranty-1': 'registered' },
        now: new Date('2026-03-20T00:00:00.000Z'),
      })
    ).toHaveLength(0);

    expect(
      buildReadinessRecommendations({
        warranties: [warranty()],
        claims: [],
        registrationsByWarrantyId: {},
        now: new Date('2026-07-30T00:00:00.000Z'),
      })
    ).toHaveLength(0);
  });

  it('prompts for extension only during the last 30 active days', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [
        warranty({
          id: 'expiring',
          purchaseDate: '2025-07-15',
          warrantyDurationMonths: 12,
        }),
        warranty({
          id: 'later',
          purchaseDate: '2025-10-15',
          warrantyDurationMonths: 12,
        }),
      ],
      claims: [],
      registrationsByWarrantyId: {},
      now: new Date('2026-07-01T00:00:00.000Z'),
    });

    expect(fingerprints(drafts)).toContain('extend_before_expiry:expiring');
    expect(fingerprints(drafts)).not.toContain('extend_before_expiry:later');
  });

  it('handles extension boundary dates', () => {
    const base = warranty({
      purchaseDate: '2025-07-31',
      warrantyDurationMonths: 12,
    });

    expect(
      fingerprints(
        buildReadinessRecommendations({
          warranties: [base],
          claims: [],
          registrationsByWarrantyId: {},
          now: new Date('2026-07-01T00:00:00.000Z'),
        })
      )
    ).toContain('extend_before_expiry:warranty-1');

    expect(
      fingerprints(
        buildReadinessRecommendations({
          warranties: [base],
          claims: [],
          registrationsByWarrantyId: {},
          now: new Date('2026-08-01T00:00:00.000Z'),
        })
      )
    ).not.toContain('extend_before_expiry:warranty-1');
  });

  it('does not prompt to extend warranties that are already extended', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [
        warranty({
          purchaseDate: '2025-07-15',
          warrantyDurationMonths: 12,
          isExtended: true,
          extendedUntil: '2027-07-15',
        }),
      ],
      claims: [],
      registrationsByWarrantyId: {},
      now: new Date('2026-07-01T00:00:00.000Z'),
    });

    expect(fingerprints(drafts)).not.toContain('extend_before_expiry:warranty-1');
  });

  it('prompts for open claims after seven days', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [warranty()],
      claims: [claim()],
      registrationsByWarrantyId: { 'warranty-1': 'registered' },
      now: new Date('2026-06-08T00:00:00.000Z'),
    });

    expect(drafts).toEqual([
      expect.objectContaining({
        kind: 'claim_follow_up',
        priority: 'medium',
        action: { type: 'navigate', route: 'claims' },
        fingerprint: 'claim_follow_up:claim-1',
      }),
    ]);
  });

  it('ignores recent, resolved, and rejected claims', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [warranty()],
      claims: [
        claim({ id: 'recent', createdAt: '2026-06-04T00:00:00.000Z' }),
        claim({ id: 'resolved', status: 'resolved' }),
        claim({ id: 'rejected', status: 'rejected' }),
      ],
      registrationsByWarrantyId: { 'warranty-1': 'registered' },
      now: new Date('2026-06-08T00:00:00.000Z'),
    });

    expect(drafts).toHaveLength(0);
  });

  it('sorts by priority before expiry urgency', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [
        warranty({
          id: 'urgent-expiry',
          purchaseDate: '2025-07-05',
          warrantyDurationMonths: 12,
        }),
        warranty({
          id: 'medium-expiry',
          purchaseDate: '2025-07-25',
          warrantyDurationMonths: 12,
        }),
      ],
      claims: [claim({ createdAt: '2026-06-24T00:00:00.000Z' })],
      registrationsByWarrantyId: {
        'urgent-expiry': 'registered',
        'medium-expiry': 'registered',
      },
      now: new Date('2026-07-01T00:00:00.000Z'),
    });

    expect(drafts.map((draft) => draft.priority)).toEqual(['high', 'medium', 'medium']);
    expect(drafts[0].fingerprint).toBe('extend_before_expiry:urgent-expiry');
  });

  it('emits stable unique fingerprints so dismissed rows can be preserved by refresh', () => {
    const drafts = buildReadinessRecommendations({
      warranties: [warranty()],
      claims: [claim()],
      registrationsByWarrantyId: {},
      now: new Date('2026-06-08T00:00:00.000Z'),
    });

    const ids = fingerprints(drafts);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('register_product:warranty-1');
    expect(ids).toContain('claim_follow_up:claim-1');
  });
});
