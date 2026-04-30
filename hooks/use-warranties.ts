import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analytics } from '@/lib/analytics';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { ProductType, Warranty } from '@/lib/types';
import { useAuth } from '@/providers/auth';

type WarrantyRow = Database['public']['Tables']['warranties']['Row'];
type WarrantyInsert = Database['public']['Tables']['warranties']['Insert'];

function rowToWarranty(row: WarrantyRow): Warranty {
  return {
    id: row.id,
    userId: row.user_id,
    brand: row.brand,
    productType: row.product_type as ProductType,
    modelNumber: row.model_number,
    serialNumber: row.serial_number,
    purchaseDate: row.purchase_date,
    warrantyDurationMonths: row.warranty_duration_months,
    receiptUrl: row.receipt_url,
    isExtended: row.is_extended,
    extendedUntil: row.extended_until,
    createdAt: row.created_at,
  };
}

export interface NewWarrantyInput {
  brand: string;
  productType: ProductType;
  modelNumber: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyDurationMonths: number;
}

export const warrantyKeys = {
  all: ['warranties'] as const,
  list: (userId: string | undefined) => ['warranties', 'list', userId] as const,
  detail: (id: string) => ['warranties', 'detail', id] as const,
};

export function useWarrantiesList() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: warrantyKeys.list(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToWarranty);
    },
  });
}

export function useWarranty(id: string | undefined) {
  return useQuery({
    queryKey: id ? warrantyKeys.detail(id) : ['warranties', 'detail', 'none'],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToWarranty(data) : null;
    },
  });
}

export function useCreateWarranty() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (input: NewWarrantyInput) => {
      if (!userId) throw new Error('Not signed in');
      const payload: WarrantyInsert = {
        user_id: userId,
        brand: input.brand,
        product_type: input.productType,
        model_number: input.modelNumber,
        serial_number: input.serialNumber,
        purchase_date: input.purchaseDate,
        warranty_duration_months: input.warrantyDurationMonths,
      };
      const { data, error } = await supabase
        .from('warranties')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return rowToWarranty(data);
    },
    onSuccess: (warranty) => {
      analytics.capture('warranty_created', {
        product_type: warranty.productType,
        duration_months: warranty.warrantyDurationMonths,
        is_extended: warranty.isExtended,
      });
      queryClient.invalidateQueries({ queryKey: warrantyKeys.list(userId) });
    },
    onError: (err) => {
      analytics.captureException(err, { mutation: 'createWarranty' });
    },
  });
}

export function useDeleteWarranty() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('warranties').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      analytics.capture('warranty_deleted', { warranty_id: id });
      queryClient.invalidateQueries({ queryKey: warrantyKeys.list(userId) });
      queryClient.removeQueries({ queryKey: warrantyKeys.detail(id) });
    },
    onError: (err) => {
      analytics.captureException(err, { mutation: 'deleteWarranty' });
    },
  });
}
