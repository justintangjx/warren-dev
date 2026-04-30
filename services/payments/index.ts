import { MockPaymentProvider } from './mock';
import type { PaymentProvider } from './types';

const mode = process.env.EXPO_PUBLIC_PAYMENTS ?? 'mock';

export const payments: PaymentProvider = mode === 'stripe'
  ? new MockPaymentProvider()
  : new MockPaymentProvider();

export * from './types';
