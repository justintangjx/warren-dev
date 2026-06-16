import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analytics } from '@/lib/analytics';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { ProductRegistration, RegistrationStatus } from '@/lib/types';
import { useAuth } from '@/providers/auth';

type RegistrationRow = Database['public']['Tables']['product_registrations']['Row'];
type RegistrationInsert = Database['public']['Tables']['product_registrations']['Insert'];

function rowToRegistration(row: RegistrationRow): ProductRegistration {
  return {
    id: row.id,
    warrantyId: row.warranty_id,
    userId: row.user_id,
    status: row.status,
    method: row.method,
    registrationUrl: row.registration_url,
    confirmationReference: row.confirmation_reference,
    registeredAt: row.registered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const registrationKeys = {
  all: ['product_registrations'] as const,
  list: (userId: string | undefined) => ['product_registrations', 'list', userId] as const,
  detail: (warrantyId: string) => ['product_registrations', 'detail', warrantyId] as const,
};

export function useProductRegistration(warrantyId: string | undefined) {
  return useQuery({
    queryKey: warrantyId
      ? registrationKeys.detail(warrantyId)
      : ['product_registrations', 'detail', 'none'],
    enabled: !!warrantyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_registrations')
        .select('*')
        .eq('warranty_id', warrantyId!)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToRegistration(data) : null;
    },
  });
}

/** Lightweight status map for the home reminder: warranty_id -> status. */
export function useProductRegistrationsList() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: registrationKeys.list(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_registrations')
        .select('warranty_id, status');
      if (error) throw error;
      const map: Record<string, RegistrationStatus> = {};
      for (const row of data ?? []) {
        map[row.warranty_id] = row.status;
      }
      return map;
    },
  });
}

export interface UpsertRegistrationInput {
  warrantyId: string;
  status: RegistrationStatus;
  method?: 'url' | 'unsupported' | null;
  registrationUrl?: string | null;
  confirmationReference?: string | null;
}

export function useUpsertProductRegistration() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (input: UpsertRegistrationInput) => {
      if (!userId) throw new Error('Not signed in');

      const payload: RegistrationInsert = {
        warranty_id: input.warrantyId,
        user_id: userId,
        status: input.status,
        method: input.method ?? null,
        registration_url: input.registrationUrl ?? null,
        confirmation_reference: input.confirmationReference ?? null,
        registered_at: input.status === 'registered' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('product_registrations')
        .upsert(payload, { onConflict: 'warranty_id' })
        .select('*')
        .single();
      if (error) throw error;
      return rowToRegistration(data);
    },
    onSuccess: (registration) => {
      analytics.capture('product_registration_marked', {
        warranty_id: registration.warrantyId,
        status: registration.status,
      });
      queryClient.invalidateQueries({
        queryKey: registrationKeys.detail(registration.warrantyId),
      });
      queryClient.invalidateQueries({ queryKey: registrationKeys.list(userId) });
    },
    onError: (err) => {
      analytics.captureException(err, { mutation: 'upsertProductRegistration' });
    },
  });
}
