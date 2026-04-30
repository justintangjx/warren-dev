import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { productTypeMeta } from '@/constants/products';
import { useClaimsList } from '@/hooks/use-claims';
import { useWarrantiesList } from '@/hooks/use-warranties';
import type { Claim, ClaimStatus, Warranty } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const STATUS_TONE: Record<ClaimStatus, 'neutral' | 'warning' | 'success' | 'destructive'> = {
  submitted: 'neutral',
  in_review: 'warning',
  resolved: 'success',
  rejected: 'destructive',
};

function ClaimRow({
  claim,
  warranty,
  onPress,
}: {
  claim: Claim;
  warranty: Warranty | undefined;
  onPress: () => void;
}) {
  const meta = warranty ? productTypeMeta(warranty.productType) : null;
  return (
    <Pressable onPress={onPress}>
      <Card className="gap-2">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Text className="text-xl">{meta?.emoji ?? '📦'}</Text>
          </View>
          <View className="flex-1">
            <Text variant="subheading" numberOfLines={1}>
              {warranty ? `${warranty.brand} · ${meta?.label}` : 'Unknown warranty'}
            </Text>
            <Text variant="muted" numberOfLines={1}>
              {warranty?.modelNumber ?? '—'}
            </Text>
          </View>
          <Badge label={STATUS_LABEL[claim.status]} tone={STATUS_TONE[claim.status]} />
          <ChevronRight size={18} color="rgb(100 116 139)" />
        </View>
        <Text numberOfLines={2}>{claim.issueDescription}</Text>
        <Text variant="small">Filed {formatDate(claim.createdAt)}</Text>
      </Card>
    </Pressable>
  );
}

export default function ClaimsScreen() {
  const router = useRouter();
  const claimsQuery = useClaimsList();
  const warrantiesQuery = useWarrantiesList();

  const warrantyById = useMemo(() => {
    const map = new Map<string, Warranty>();
    (warrantiesQuery.data ?? []).forEach((w) => map.set(w.id, w));
    return map;
  }, [warrantiesQuery.data]);

  const claims = claimsQuery.data ?? [];
  const isRefetching = claimsQuery.isRefetching || warrantiesQuery.isRefetching;

  function refetchAll() {
    claimsQuery.refetch();
    warrantiesQuery.refetch();
  }

  return (
    <Screen>
      <View className="py-4">
        <Text variant="title">Claims</Text>
      </View>

      <FlatList
        data={claims}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <ClaimRow
            claim={item}
            warranty={warrantyById.get(item.warrantyId)}
            onPress={() => router.push(`/warranties/${item.warrantyId}`)}
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} />}
        ListEmptyComponent={
          <Card>
            {claimsQuery.error ? (
              <>
                <Text variant="heading">Couldn’t load claims</Text>
                <Text variant="muted" className="mt-1">
                  {claimsQuery.error instanceof Error
                    ? claimsQuery.error.message
                    : 'Unknown error'}
                </Text>
              </>
            ) : claimsQuery.isLoading ? (
              <Text variant="muted">Loading…</Text>
            ) : (
              <>
                <Text variant="heading">No claims yet</Text>
                <Text variant="muted" className="mt-1">
                  When you contact a warranty provider from a warranty’s detail page, the
                  request will appear here with its status.
                </Text>
              </>
            )}
          </Card>
        }
      />
    </Screen>
  );
}
