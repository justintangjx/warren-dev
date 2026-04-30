import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { productTypeMeta } from '@/constants/products';
import { useExtendWarranty } from '@/hooks/use-extend-warranty';
import { useWarranty } from '@/hooks/use-warranties';
import type { ExtendedPlanId } from '@/lib/types';
import { cn, formatCurrencySGD, formatDate, withComputed } from '@/lib/utils';
import {
    EXTENDED_WARRANTY_BENEFITS,
    EXTENDED_WARRANTY_QUOTES,
    payments,
} from '@/services/payments';

export default function ExtendWarrantyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useWarranty(id);
  const extend = useExtendWarranty();
  const [selectedPlan, setSelectedPlan] = useState<ExtendedPlanId>('1y');

  if (isLoading) {
    return (
      <Screen>
        <Text variant="muted" className="mt-4">Loading…</Text>
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
  const quote = EXTENDED_WARRANTY_QUOTES.find((q) => q.plan === selectedPlan)!;

  if (w.isExtended) {
    return (
      <Screen>
        <Card className="mt-4 items-center gap-2">
          <ShieldCheck size={36} color="rgb(34 197 94)" />
          <Text variant="heading">Already extended</Text>
          <Text variant="muted" className="text-center">
            Coverage runs until {w.extendedUntil ? formatDate(w.extendedUntil) : 'the extended date'}.
          </Text>
          <Button label="Back to warranty" className="mt-2" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  async function onPurchase() {
    if (!id) return;
    try {
      await extend.mutateAsync({ warrantyId: id, quote });
      Alert.alert(
        'Coverage extended',
        `Your warranty is now covered for an additional ${quote.additionalMonths} months.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Purchase failed', err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Screen scroll>
      <View className="gap-4 py-4">
        <Card className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <Text className="text-2xl">{meta.emoji}</Text>
          </View>
          <View className="flex-1">
            <Text variant="subheading">{w.brand}</Text>
            <Text variant="muted">
              Currently expires {formatDate(w.expirationDate)}
            </Text>
          </View>
        </Card>

        <View>
          <Text variant="heading">Choose your plan</Text>
          <Text variant="muted" className="mt-1">
            Extend coverage past your manufacturer warranty.
          </Text>
        </View>

        <View className="gap-2">
          {EXTENDED_WARRANTY_QUOTES.map((q) => {
            const isSelected = q.plan === selectedPlan;
            return (
              <Pressable key={q.plan} onPress={() => setSelectedPlan(q.plan)}>
                <Card
                  className={cn(
                    'flex-row items-center justify-between',
                    isSelected && 'border-primary'
                  )}>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text variant="subheading">{q.label}</Text>
                      {q.plan === '2y' && <Badge label="Best value" tone="primary" />}
                    </View>
                    <Text variant="muted" className="mt-0.5">
                      Adds {q.additionalMonths} months of coverage
                    </Text>
                  </View>
                  <Text variant="heading">{formatCurrencySGD(q.amountCents)}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <Text variant="subheading" className="mb-2">What’s included</Text>
          {EXTENDED_WARRANTY_BENEFITS.map((b) => (
            <View key={b} className="flex-row items-start gap-2 py-1">
              <Check size={18} color="rgb(34 197 94)" />
              <Text className="flex-1">{b}</Text>
            </View>
          ))}
        </Card>

        <View className="gap-2">
          <Button
            label={`Pay ${formatCurrencySGD(quote.amountCents)}`}
            size="lg"
            fullWidth
            loading={extend.isPending}
            onPress={onPurchase}
          />
          <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
        </View>

        {/* TODO(phase-4): swap PaymentProvider from mock to a real Stripe implementation.
            See services/payments/index.ts — gate on EXPO_PUBLIC_PAYMENTS=stripe and add a
            StripePaymentProvider that opens the Payment Sheet (web: Stripe.js Elements,
            native: @stripe/stripe-react-native) and returns the PaymentIntent id as
            `reference`. The hook + UI here don't need to change. */}
        {payments.name === 'mock' && (
          <Text variant="small" className="text-center">
            Mock checkout — no card needed. Will charge a real card once Stripe is wired in.
          </Text>
        )}
      </View>
    </Screen>
  );
}
