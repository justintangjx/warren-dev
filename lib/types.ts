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

export interface WarrantyWithComputed extends Warranty {
  expirationDate: string;
  daysUntilExpiry: number;
  isActive: boolean;
}
