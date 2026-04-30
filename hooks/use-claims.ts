import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analytics } from '@/lib/analytics';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { Claim, ClaimStatus } from '@/lib/types';
import { useAuth } from '@/providers/auth';

type ClaimRow = Database['public']['Tables']['claims']['Row'];
type ClaimInsert = Database['public']['Tables']['claims']['Insert'];

function rowToClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    warrantyId: row.warranty_id,
    userId: row.user_id,
    issueDescription: row.issue_description,
    status: row.status as ClaimStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface NewClaimInput {
  warrantyId: string;
  issueDescription: string;
}

export const claimKeys = {
  all: ['claims'] as const,
  list: (userId: string | undefined) => ['claims', 'list', userId] as const,
};

export function useClaimsList() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: claimKeys.list(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToClaim);
    },
  });
}

export function useCreateClaim() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (input: NewClaimInput) => {
      if (!userId) throw new Error('Not signed in');
      const payload: ClaimInsert = {
        user_id: userId,
        warranty_id: input.warrantyId,
        issue_description: input.issueDescription,
      };
      const { data, error } = await supabase
        .from('claims')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return rowToClaim(data);
    },
    onSuccess: (claim) => {
      analytics.capture('claim_submitted', {
        warranty_id: claim.warrantyId,
        status: claim.status,
      });
      queryClient.invalidateQueries({ queryKey: claimKeys.list(userId) });
    },
    onError: (err) => {
      analytics.captureException(err, { mutation: 'createClaim' });
    },
  });
}
