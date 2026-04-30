import type { PaymentProvider, PurchaseInput, PurchaseResult } from './types';

const SUCCESS_RATE = 0.95;
const SIMULATED_LATENCY_MS = 1500;

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  async purchaseExtendedWarranty(input: PurchaseInput): Promise<PurchaseResult> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
    const succeeded = Math.random() < SUCCESS_RATE;
    if (!succeeded) {
      return {
        status: 'failed',
        reference: `mock_failed_${Date.now()}`,
        message: 'Card was declined (simulated). Please try again.',
      };
    }
    return {
      status: 'succeeded',
      reference: `mock_${input.warrantyId}_${Date.now()}`,
    };
  }
}
