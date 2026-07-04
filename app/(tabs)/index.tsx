import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Plus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { productTypeMeta } from '@/constants/products';
import {
  useAgentRecommendations,
  useDismissAgentRecommendation,
} from '@/hooks/use-agent-recommendations';
import type { AgentAction, AgentPriority, AgentRecommendation } from '@/lib/agent-readiness';
import { useWarrantiesList } from '@/hooks/use-warranties';
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

function priorityBadge(priority: AgentPriority): {
  tone: 'neutral' | 'primary' | 'warning';
  label: string;
} {
  if (priority === 'high') return { tone: 'warning', label: 'Time-sensitive' };
  if (priority === 'medium') return { tone: 'primary', label: 'Recommended' };
  return { tone: 'neutral', label: 'Useful' };
}

function actionLabel(recommendation: AgentRecommendation): string {
  switch (recommendation.kind) {
    case 'register_product':
      return 'Open details';
    case 'extend_before_expiry':
      return 'Review extension';
    case 'claim_follow_up':
      return 'Open claims';
  }
}

function ReadinessRow({
  recommendation,
  onAction,
  onDismiss,
  dismissing,
}: {
  recommendation: AgentRecommendation;
  onAction: (action: AgentAction) => void;
  onDismiss: (id: string) => void;
  dismissing: boolean;
}) {
  const badge = priorityBadge(recommendation.priority);
  return (
    <Card className="gap-3">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <ClipboardCheck size={20} color="rgb(15 23 42)" />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="subheading" className="flex-1">
              {recommendation.title}
            </Text>
            <Badge label={badge.label} tone={badge.tone} />
          </View>
          <Text variant="muted">{recommendation.body}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          disabled={dismissing}
          onPress={() => onDismiss(recommendation.id)}>
          <X size={18} color="rgb(100 116 139)" />
        </Pressable>
      </View>
      <Button
        label={actionLabel(recommendation)}
        variant="secondary"
        leftIcon={<ChevronRight size={16} color="rgb(15 23 42)" />}
        onPress={() => onAction(recommendation.action)}
      />
    </Card>
  );
}

function ReadinessInbox({
  recommendations,
  loading,
  error,
  dismissing,
  onAction,
  onDismiss,
}: {
  recommendations: AgentRecommendation[];
  loading: boolean;
  error: unknown;
  dismissing: boolean;
  onAction: (action: AgentAction) => void;
  onDismiss: (id: string) => void;
}) {
  const visible = recommendations.slice(0, 3);

  return (
    <View className="mb-4 gap-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-bold uppercase text-slate-500">Readiness</Text>
          <Text variant="heading" className="mt-0.5">
            Next useful actions
          </Text>
        </View>
        <Clock3 size={20} color="rgb(100 116 139)" />
      </View>

      {error ? (
        <Card className="gap-1">
          <Text variant="subheading">Readiness unavailable</Text>
          <Text variant="muted">
            We could not refresh recommendations. Your warranties are still available below.
          </Text>
        </Card>
      ) : loading && visible.length === 0 ? (
        <Card className="flex-row items-center gap-3">
          <Clock3 size={18} color="rgb(100 116 139)" />
          <Text variant="muted">Checking coverage windows…</Text>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="flex-row items-center gap-3">
          <CheckCircle2 size={18} color="rgb(22 101 52)" />
          <View className="flex-1">
            <Text variant="subheading">All caught up.</Text>
            <Text variant="muted" className="mt-0.5">
              No registration, extension, or claim follow-up needs attention right now.
            </Text>
          </View>
        </Card>
      ) : (
        visible.map((recommendation) => (
          <ReadinessRow
            key={recommendation.id}
            recommendation={recommendation}
            dismissing={dismissing}
            onAction={onAction}
            onDismiss={onDismiss}
          />
        ))
      )}
    </View>
  );
}

export default function WarrantiesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const warrantiesQuery = useWarrantiesList();
  const recommendationsQuery = useAgentRecommendations();
  const dismissRecommendation = useDismissAgentRecommendation();

  const enriched = useMemo(
    () => (warrantiesQuery.data ?? []).map((w) => withComputed(w)),
    [warrantiesQuery.data]
  );

  const visible = useMemo(() => {
    if (filter === 'active') return enriched.filter((w) => w.isActive);
    if (filter === 'expired') return enriched.filter((w) => !w.isActive);
    return enriched;
  }, [enriched, filter]);

  function onReadinessAction(action: AgentAction) {
    if (action.route === 'claims') {
      router.push('/(tabs)/claims');
      return;
    }
    if (action.route === 'extend_warranty') {
      router.push(`/warranties/${action.warrantyId}/extend`);
      return;
    }
    router.push(`/warranties/${action.warrantyId}`);
  }

  function refetchAll() {
    warrantiesQuery.refetch();
    recommendationsQuery.refetch();
  }

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

      <ReadinessInbox
        recommendations={recommendationsQuery.data ?? []}
        loading={recommendationsQuery.isLoading}
        error={recommendationsQuery.error}
        dismissing={dismissRecommendation.isPending}
        onAction={onReadinessAction}
        onDismiss={(id) => dismissRecommendation.mutate(id)}
      />

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
        renderItem={({ item }) => (
          <WarrantyRow w={item} onPress={() => router.push(`/warranties/${item.id}`)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={warrantiesQuery.isRefetching || recommendationsQuery.isRefetching}
            onRefresh={refetchAll}
          />
        }
        ListEmptyComponent={
          <Card>
            {warrantiesQuery.error ? (
              <>
                <Text variant="heading">Couldn’t load warranties</Text>
                <Text variant="muted" className="mt-1">
                  {warrantiesQuery.error instanceof Error
                    ? warrantiesQuery.error.message
                    : 'Unknown error'}
                </Text>
              </>
            ) : warrantiesQuery.isLoading ? (
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
