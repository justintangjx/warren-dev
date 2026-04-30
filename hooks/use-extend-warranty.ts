import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addMonths } from 'date-fns';

import { analytics } from '@/lib/analytics';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { computeExpirationDate } from '@/lib/utils';
import { useAuth } from '@/providers/auth';
import { payments, type ExtendedWarrantyQuote, type PurchaseResult } from '@/services/payments';

import { warrantyKeys } from './use-warranties';

type WarrantyRow = Database['public']['Tables']['warranties']['Row'];
type PurchaseInsert = Database['public']['Tables']['extended_warranty_purchases']['Insert'];

export interface ExtendWarrantyInput {
  warrantyId: string;
  quote: ExtendedWarrantyQuote;
}

export interface ExtendWarrantyResult {
  purchase: PurchaseResult;
  newExtendedUntil: string;
}

export function useExtendWarranty() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation<ExtendWarrantyResult, Error, ExtendWarrantyInput>({
    mutationFn: async ({ warrantyId, quote }) => {
      if (!userId) throw new Error('Not signed in');

      const { data: warrantyRow, error: fetchError } = await supabase
        .from('warranties')
        .select('*')
        .eq('id', warrantyId)
        .single();
      if (fetchError) throw fetchError;
      const w = warrantyRow as WarrantyRow;

      const currentExpiry = computeExpirationDate({
        purchaseDate: w.purchase_date,
        warrantyDurationMonths: w.warranty_duration_months,
        isExtended: w.is_extended,
        extendedUntil: w.extended_until,
      });
      const newExtendedUntil = addMonths(currentExpiry, quote.additionalMonths);
      const newExtendedUntilIso = newExtendedUntil.toISOString().slice(0, 10);

      // TODO(phase-3-polish): wrap the next three writes in a Postgres function (RPC) so the
      // payment record + warranty update happen atomically. As-is, a failure between the two
      // inserts would leave a paid purchase without the corresponding warranty update.
      const purchase = await payments.purchaseExtendedWarranty({ warrantyId, quote });
      if (purchase.status !== 'succeeded') {
        throw new Error(purchase.message ?? 'Payment failed');
      }

      // Mock provider: record the purchase with status='mocked' to be honest about the source.
      // Switch to 'succeeded' once a real Stripe provider is wired in.
      const purchasePayload: PurchaseInsert = {
        warranty_id: warrantyId,
        user_id: userId,
        plan: quote.plan,
        amount_cents: quote.amountCents,
        stripe_payment_intent_id: purchase.reference,
        status: payments.name === 'mock' ? 'mocked' : 'succeeded',
      };
      const { error: insertError } = await supabase
        .from('extended_warranty_purchases')
        .insert(purchasePayload);
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('warranties')
        .update({ is_extended: true, extended_until: newExtendedUntilIso })
        .eq('id', warrantyId);
      if (updateError) throw updateError;

      return { purchase, newExtendedUntil: newExtendedUntilIso };
    },
    onSuccess: (_result, variables) => {
      analytics.capture('extended_warranty_purchased', {
        warranty_id: variables.warrantyId,
        plan: variables.quote.plan,
        amount_cents: variables.quote.amountCents,
      });
      queryClient.invalidateQueries({ queryKey: warrantyKeys.list(userId) });
      queryClient.invalidateQueries({
        queryKey: warrantyKeys.detail(variables.warrantyId),
      });
    },
    onError: (err) => {
      analytics.captureException(err, { mutation: 'extendWarranty' });
    },
  });
}
