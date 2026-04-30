import { useLocalSearchParams, useRouter } from 'expo-router';
import { LifeBuoy, Sparkles, Trash2 } from 'lucide-react-native';
import { Alert, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { productTypeMeta } from '@/constants/products';
import { useClaimsList } from '@/hooks/use-claims';
import { useDeleteWarranty, useWarranty } from '@/hooks/use-warranties';
import type { ClaimStatus } from '@/lib/types';
import { formatDate, formatRelativeExpiry, withComputed } from '@/lib/utils';

const OPEN_STATUSES: ReadonlySet<ClaimStatus> = new Set(['submitted', 'in_review']);
const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text variant="muted" className="flex-1">
        {label}
      </Text>
      <Text className="flex-1 text-right">{value}</Text>
    </View>
  );
}

export default function WarrantyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useWarranty(id);
  const { data: claims } = useClaimsList();
  const deleteWarranty = useDeleteWarranty();

  const openClaim = (claims ?? []).find(
    (c) => c.warrantyId === id && OPEN_STATUSES.has(c.status)
  );

  if (isLoading) {
    return (
      <Screen>
        <Text variant="muted" className="mt-4">
          Loading…
        </Text>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <Card className="mt-4">
          <Text variant="heading">Warranty not found</Text>
          <Text variant="muted" className="mt-1">
            {error instanceof Error ? error.message : 'It may have been deleted.'}
          </Text>
          <Button label="Back" className="mt-3" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const w = withComputed(data);
  const meta = productTypeMeta(w.productType);
  const status = !w.isActive
    ? { tone: 'destructive' as const, label: 'Expired' }
    : w.daysUntilExpiry <= 30
      ? { tone: 'warning' as const, label: 'Expiring soon' }
      : { tone: 'success' as const, label: 'Active' };

  function confirmDelete() {
    Alert.alert('Delete warranty?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWarranty.mutateAsync(w.id);
            router.back();
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <View className="gap-4 py-4">
        <Card className="items-center gap-2">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Text className="text-3xl">{meta.emoji}</Text>
          </View>
          <Text variant="heading" className="text-center">
            {w.brand}
          </Text>
          <Text variant="muted" className="text-center">
            {meta.label} · {w.modelNumber}
          </Text>
          <Badge label={status.label} tone={status.tone} className="mt-1" />
          <Text className="mt-1 text-center">{formatRelativeExpiry(w.daysUntilExpiry)}</Text>
        </Card>

        <Card>
          <Text variant="subheading" className="mb-1">
            Details
          </Text>
          <Detail label="Brand" value={w.brand} />
          <Detail label="Product type" value={meta.label} />
          <Detail label="Model" value={w.modelNumber} />
          <Detail label="Serial" value={w.serialNumber} />
          <Detail label="Purchased" value={formatDate(w.purchaseDate)} />
          <Detail label="Duration" value={`${w.warrantyDurationMonths} months`} />
          <Detail label="Expires" value={formatDate(w.expirationDate)} />
          {w.isExtended && w.extendedUntil ? (
            <Detail label="Extended until" value={formatDate(w.extendedUntil)} />
          ) : null}
        </Card>

        {/* TODO(phase-2-polish): receipt viewer + uploader.
            Render w.receiptUrl (image / PDF) when present. When absent, show an "Add receipt"
            button that opens the same picker used in the new-warranty form and updates
            warranties.receipt_url. See note in app/warranties/new.tsx for picker details. */}

        {/* TODO(phase-2-polish): edit warranty screen.
            Add an "Edit" action that routes to /warranties/[id]/edit, reusing the form in
            app/warranties/new.tsx (extract a <WarrantyForm /> component, pass initialValues +
            onSubmit). Wire to a useUpdateWarranty hook that mirrors useCreateWarranty. */}
        {openClaim ? (
          <Card className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="subheading">Open claim</Text>
              <Badge
                label={CLAIM_STATUS_LABEL[openClaim.status]}
                tone={openClaim.status === 'in_review' ? 'primary' : 'neutral'}
              />
            </View>
            <Text variant="muted">
              You already have a claim in progress for this product. File a new claim only after
              this one is resolved or rejected.
            </Text>
            <Button
              label="View claim"
              variant="secondary"
              leftIcon={<LifeBuoy size={16} color="rgb(15 23 42)" />}
              onPress={() => router.push('/(tabs)/claims')}
            />
          </Card>
        ) : null}

        <View className="gap-2">
          {!openClaim ? (
            <Button
              label="Contact provider"
              leftIcon={<LifeBuoy size={16} color="white" />}
              onPress={() => router.push(`/warranties/${w.id}/contact`)}
            />
          ) : null}
          <Button
            label={w.isExtended ? 'Already extended' : 'Extend warranty'}
            variant="secondary"
            disabled={w.isExtended}
            leftIcon={<Sparkles size={16} color="rgb(15 23 42)" />}
            onPress={() => router.push(`/warranties/${w.id}/extend`)}
          />
          <Button
            label="Delete"
            variant="destructive"
            leftIcon={<Trash2 size={16} color="white" />}
            loading={deleteWarranty.isPending}
            onPress={confirmDelete}
          />
        </View>
      </View>
    </Screen>
  );
}
