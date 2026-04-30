import type { ExtendedPlanId } from '@/lib/types';

export interface ExtendedWarrantyQuote {
  plan: ExtendedPlanId;
  label: string;
  amountCents: number;
  additionalMonths: number;
}

export interface PurchaseInput {
  warrantyId: string;
  quote: ExtendedWarrantyQuote;
}

export interface PurchaseResult {
  status: 'succeeded' | 'failed';
  reference: string;
  message?: string;
}

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe';
  purchaseExtendedWarranty(input: PurchaseInput): Promise<PurchaseResult>;
}

export const EXTENDED_WARRANTY_QUOTES: ExtendedWarrantyQuote[] = [
  { plan: '1y', label: '+1 Year', amountCents: 1999, additionalMonths: 12 },
  { plan: '2y', label: '+2 Years', amountCents: 2999, additionalMonths: 24 },
];

export const EXTENDED_WARRANTY_BENEFITS = [
  'Free repairs for covered failures',
  'Coverage for accidental damage',
  'Priority customer support',
  'Cancel anytime within 30 days',
];
