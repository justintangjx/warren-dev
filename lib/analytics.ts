import type { PostHog } from 'posthog-react-native';

import type { ClaimStatus, ExtendedPlanId, ProductType } from './types';

// Mirror of @posthog/core's JsonType / PostHogEventProperties. Kept local so we
// don't reach into a transitive package's types.
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type EventProperties = { [key: string]: JsonValue };

export type AnalyticsEvent =
  | 'magic_link_requested'
  | 'warranty_created'
  | 'warranty_deleted'
  | 'claim_submitted'
  | 'extended_warranty_purchased';

export interface AnalyticsEventProperties {
  magic_link_requested: { has_email: boolean };
  warranty_created: {
    product_type: ProductType;
    duration_months: number;
    is_extended: boolean;
  };
  warranty_deleted: { warranty_id: string };
  claim_submitted: { warranty_id: string; status: ClaimStatus };
  extended_warranty_purchased: {
    warranty_id: string;
    plan: ExtendedPlanId;
    amount_cents: number;
  };
}

let _client: PostHog | null = null;

export function setAnalyticsClient(client: PostHog | null) {
  _client = client;
}

export function getAnalyticsClient(): PostHog | null {
  return _client;
}

export const analytics = {
  capture<E extends AnalyticsEvent>(event: E, properties: AnalyticsEventProperties[E]) {
    _client?.capture(event, properties as EventProperties);
  },

  identify(distinctId: string, properties?: EventProperties) {
    _client?.identify(distinctId, properties);
  },

  reset() {
    _client?.reset();
  },

  captureException(error: unknown, additionalProperties?: EventProperties) {
    _client?.captureException(error, additionalProperties);
  },
};
