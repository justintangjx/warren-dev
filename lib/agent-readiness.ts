import { differenceInCalendarDays, parseISO } from 'date-fns';

import { shouldPromptRegistration } from './product-registration';
import type { Claim, ClaimStatus, RegistrationStatus, Warranty } from './types';
import { formatDate, formatRelativeExpiry, withComputed } from './utils';

export type AgentRecommendationKind =
  | 'register_product'
  | 'extend_before_expiry'
  | 'claim_follow_up';

export type AgentRecommendationStatus = 'open' | 'dismissed' | 'resolved';
export type AgentPriority = 'low' | 'medium' | 'high';

export type AgentAction =
  | { type: 'navigate'; route: 'warranty_detail'; warrantyId: string }
  | { type: 'navigate'; route: 'extend_warranty'; warrantyId: string }
  | { type: 'navigate'; route: 'claims' };

export interface ReadinessInput {
  warranties: Warranty[];
  claims: Claim[];
  registrationsByWarrantyId: Record<string, RegistrationStatus>;
  now?: Date;
}

export interface AgentRecommendationDraft {
  kind: AgentRecommendationKind;
  priority: AgentPriority;
  warrantyId: string | null;
  title: string;
  body: string;
  action: AgentAction;
  evidence: Record<string, string | number | boolean | null>;
  fingerprint: string;
}

export interface AgentRecommendation extends AgentRecommendationDraft {
  id: string;
  userId: string;
  status: AgentRecommendationStatus;
  lastEvaluatedAt: string;
  dismissedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const OPEN_CLAIM_STATUSES: ReadonlySet<ClaimStatus> = new Set(['submitted', 'in_review']);

const PRIORITY_RANK: Record<AgentPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function warrantyLabel(warranty: Warranty): string {
  return `${warranty.brand} ${warranty.modelNumber}`.trim();
}

function sortDrafts(drafts: AgentRecommendationDraft[]): AgentRecommendationDraft[] {
  return [...drafts].sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (priorityDelta !== 0) return priorityDelta;

    const aDays = typeof a.evidence.days_until_expiry === 'number' ? a.evidence.days_until_expiry : 9999;
    const bDays = typeof b.evidence.days_until_expiry === 'number' ? b.evidence.days_until_expiry : 9999;
    if (aDays !== bDays) return aDays - bDays;

    return a.fingerprint.localeCompare(b.fingerprint);
  });
}

function uniqueDrafts(drafts: AgentRecommendationDraft[]): AgentRecommendationDraft[] {
  const seen = new Set<string>();
  const out: AgentRecommendationDraft[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.fingerprint)) continue;
    seen.add(draft.fingerprint);
    out.push(draft);
  }
  return out;
}

export function buildReadinessRecommendations(
  input: ReadinessInput
): AgentRecommendationDraft[] {
  const now = input.now ?? new Date();
  const drafts: AgentRecommendationDraft[] = [];

  for (const warranty of input.warranties) {
    const computed = withComputed(warranty, now);
    const registrationStatus = input.registrationsByWarrantyId[warranty.id] ?? 'not_started';
    const registrationPrompt = shouldPromptRegistration({
      purchaseDate: warranty.purchaseDate,
      status: registrationStatus,
      isActive: computed.isActive,
      now,
    });

    if (registrationPrompt.show) {
      const priority: AgentPriority = registrationPrompt.urgency === 'soon' ? 'high' : 'medium';
      drafts.push({
        kind: 'register_product',
        priority,
        warrantyId: warranty.id,
        title: `Register ${warrantyLabel(warranty)}`,
        body:
          registrationPrompt.urgency === 'soon'
            ? 'The manufacturer registration window is getting tight. Open the warranty details and finish registration while it still counts.'
            : 'Register this product with the manufacturer so the full warranty and recall notices are active.',
        action: { type: 'navigate', route: 'warranty_detail', warrantyId: warranty.id },
        evidence: {
          purchase_date: warranty.purchaseDate,
          days_since_purchase: registrationPrompt.daysSincePurchase,
          registration_status: registrationStatus,
          registration_urgency: registrationPrompt.urgency,
        },
        fingerprint: `register_product:${warranty.id}`,
      });
    }

    if (
      computed.isActive &&
      !warranty.isExtended &&
      computed.daysUntilExpiry >= 0 &&
      computed.daysUntilExpiry <= 30
    ) {
      const priority: AgentPriority = computed.daysUntilExpiry <= 7 ? 'high' : 'medium';
      drafts.push({
        kind: 'extend_before_expiry',
        priority,
        warrantyId: warranty.id,
        title: `Review coverage for ${warrantyLabel(warranty)}`,
        body: `${formatRelativeExpiry(computed.daysUntilExpiry)}. Check extension options before the original coverage lapses.`,
        action: { type: 'navigate', route: 'extend_warranty', warrantyId: warranty.id },
        evidence: {
          expiration_date: computed.expirationDate.slice(0, 10),
          days_until_expiry: computed.daysUntilExpiry,
          is_extended: warranty.isExtended,
        },
        fingerprint: `extend_before_expiry:${warranty.id}`,
      });
    }
  }

  const warrantyById = new Map(input.warranties.map((warranty) => [warranty.id, warranty]));
  for (const claim of input.claims) {
    if (!OPEN_CLAIM_STATUSES.has(claim.status)) continue;

    const daysOpen = differenceInCalendarDays(now, parseISO(claim.createdAt));
    if (daysOpen < 7) continue;

    const warranty = warrantyById.get(claim.warrantyId);
    const priority: AgentPriority = daysOpen >= 14 ? 'high' : 'medium';
    drafts.push({
      kind: 'claim_follow_up',
      priority,
      warrantyId: claim.warrantyId,
      title: warranty ? `Follow up on ${warrantyLabel(warranty)} claim` : 'Follow up on open claim',
      body: `This claim has been ${claim.status === 'in_review' ? 'in review' : 'submitted'} since ${formatDate(claim.createdAt)}. Check its status while the details are fresh.`,
      action: { type: 'navigate', route: 'claims' },
      evidence: {
        claim_id: claim.id,
        claim_status: claim.status,
        claim_created_at: claim.createdAt,
        days_open: daysOpen,
      },
      fingerprint: `claim_follow_up:${claim.id}`,
    });
  }

  return sortDrafts(uniqueDrafts(drafts));
}
