import { useRouter } from 'expo-router';
import { ChevronRight, ClipboardCheck, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { productTypeMeta } from '@/constants/products';
import { useProductRegistrationsList } from '@/hooks/use-product-registration';
import { useWarrantiesList } from '@/hooks/use-warranties';
import { shouldPromptRegistration } from '@/lib/product-registration';
import type { WarrantyWithComputed } from '@/lib/types';
import { cn, formatRelativeExpiry, withComputed } from '@/lib/utils';

type Filter = 'all' | 'active' | 'expired';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

function statusTone(w: WarrantyWithComputed): {
  tone: 'success' | 'warning' | 'destructive';
  label: string;
} {
  if (!w.isActive) return { tone: 'destructive', label: 'Expired' };
  if (w.daysUntilExpiry <= 30) return { tone: 'warning', label: 'Expiring soon' };
  return { tone: 'success', label: 'Active' };
}

function WarrantyRow({ w, onPress }: { w: WarrantyWithComputed; onPress: () => void }) {
  const meta = productTypeMeta(w.productType);
  const status = statusTone(w);
  return (
    <Pressable onPress={onPress}>
      <Card className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-secondary">
          <Text className="text-2xl">{meta.emoji}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="subheading" numberOfLines={1} className="flex-1">
              {w.brand} · {meta.label}
            </Text>
            <Badge label={status.label} tone={status.tone} />
          </View>
          <Text variant="muted" numberOfLines={1} className="mt-0.5">
            {w.modelNumber}
          </Text>
          <Text variant="small" className="mt-0.5">
            {formatRelativeExpiry(w.daysUntilExpiry)}
          </Text>
        </View>
        <ChevronRight size={18} color="rgb(100 116 139)" />
      </Card>
    </Pressable>
  );
}

export default function WarrantiesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [registrationDismissed, setRegistrationDismissed] = useState(false);
  const { data, isLoading, isRefetching, refetch, error } = useWarrantiesList();
  const { data: registrationStatusMap } = useProductRegistrationsList();

  const enriched = useMemo(() => (data ?? []).map((w) => withComputed(w)), [data]);

  const needsRegistration = useMemo(
    () =>
      enriched.filter(
        (w) =>
          shouldPromptRegistration({
            purchaseDate: w.purchaseDate,
            status: registrationStatusMap?.[w.id] ?? 'not_started',
            isActive: w.isActive,
          }).show
      ),
    [enriched, registrationStatusMap]
  );

  const visible = useMemo(() => {
    if (filter === 'active') return enriched.filter((w) => w.isActive);
    if (filter === 'expired') return enriched.filter((w) => !w.isActive);
    return enriched;
  }, [enriched, filter]);

  return (
    <Screen>
      <View className="flex-row items-center justify-between py-4">
        <Text variant="title">Warranties</Text>
        <Button
          label="Add"
          size="sm"
          leftIcon={<Plus size={16} color="white" />}
          onPress={() => router.push('/warranties/new')}
        />
      </View>

      <View className="mb-3 flex-row gap-2">
        {FILTERS.map((f) => {
          const isActive = filter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1.5',
                isActive ? 'border-primary bg-primary' : 'border-border bg-background'
              )}>
              <Text
                className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-primary-foreground' : 'text-foreground'
                )}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        ListHeaderComponent={
          needsRegistration.length > 0 && !registrationDismissed ? (
            <Pressable onPress={() => router.push(`/warranties/${needsRegistration[0].id}`)}>
              <Card className="mb-3 flex-row items-center gap-3 border-primary">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <ClipboardCheck size={20} color="rgb(15 23 42)" />
                </View>
                <View className="flex-1">
                  <Text variant="subheading">
                    {needsRegistration.length === 1
                      ? '1 product needs registration'
                      : `${needsRegistration.length} products need registration`}
                  </Text>
                  <Text variant="muted" className="mt-0.5">
                    Register to activate the full manufacturer warranty.
                  </Text>
                </View>
                <Pressable hitSlop={8} onPress={() => setRegistrationDismissed(true)}>
                  <Text variant="muted">Dismiss</Text>
                </Pressable>
              </Card>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <WarrantyRow w={item} onPress={() => router.push(`/warranties/${item.id}`)} />
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <Card>
            {error ? (
              <>
                <Text variant="heading">Couldn’t load warranties</Text>
                <Text variant="muted" className="mt-1">
                  {error instanceof Error ? error.message : 'Unknown error'}
                </Text>
              </>
            ) : isLoading ? (
              <Text variant="muted">Loading…</Text>
            ) : enriched.length === 0 ? (
              <>
                <Text variant="heading">No warranties yet</Text>
                <Text variant="muted" className="mt-1">
                  Tap “Add” to register your first warranty. We’ll calculate expiration dates
                  and warn you before they lapse.
                </Text>
              </>
            ) : (
              <>
                <Text variant="heading">No {filter} warranties</Text>
                <Text variant="muted" className="mt-1">
                  Try a different filter.
                </Text>
              </>
            )}
          </Card>
        }
      />
    </Screen>
  );
}
