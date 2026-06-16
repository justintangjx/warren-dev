export type ProductType =
  | 'television'
  | 'laptop'
  | 'phone'
  | 'tablet'
  | 'audio'
  | 'kitchen_appliance'
  | 'home_appliance'
  | 'lighting'
  | 'wearable'
  | 'gaming_console'
  | 'camera'
  | 'other';

export type ClaimStatus = 'submitted' | 'in_review' | 'resolved' | 'rejected';

export type ExtendedPlanId = '1y' | '2y';

export type PurchaseStatus = 'succeeded' | 'failed' | 'mocked';

export type RegistrationStatus = 'not_started' | 'assisted' | 'registered' | 'not_available';

export interface Warranty {
  id: string;
  userId: string;
  brand: string;
  productType: ProductType;
  modelNumber: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyDurationMonths: number;
  retailer: string | null;
  purchasePriceCents: number | null;
  receiptUrl: string | null;
  isExtended: boolean;
  extendedUntil: string | null;
  createdAt: string;
}

export interface Claim {
  id: string;
  warrantyId: string;
  userId: string;
  issueDescription: string;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExtendedWarrantyPurchase {
  id: string;
  warrantyId: string;
  userId: string;
  plan: ExtendedPlanId;
  amountCents: number;
  stripePaymentIntentId: string | null;
  status: PurchaseStatus;
  createdAt: string;
}

export interface ProductRegistration {
  id: string;
  warrantyId: string;
  userId: string;
  status: RegistrationStatus;
  method: 'url' | 'unsupported' | null;
  registrationUrl: string | null;
  confirmationReference: string | null;
  registeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyWithComputed extends Warranty {
  expirationDate: string;
  daysUntilExpiry: number;
  isActive: boolean;
}
