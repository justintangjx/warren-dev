import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LifeBuoy, Send } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, Text as RNText, TextInput, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { productTypeMeta } from '@/constants/products';
import { useClaimsList, useCreateClaim } from '@/hooks/use-claims';
import { useWarranty } from '@/hooks/use-warranties';
import { claimFormSchema, type ClaimFormValues } from '@/lib/schemas';
import type { ClaimStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const OPEN_STATUSES: ReadonlySet<ClaimStatus> = new Set(['submitted', 'in_review']);
const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

type FormValues = ClaimFormValues;

export default function ContactProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: warranty } = useWarranty(id);
  const { data: claims } = useClaimsList();
  const createClaim = useCreateClaim();

  const openClaim = (claims ?? []).find(
    (c) => c.warrantyId === id && OPEN_STATUSES.has(c.status)
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: { issueDescription: '' },
  });

  async function onSubmit(values: FormValues) {
    if (!id) return;
    try {
      await createClaim.mutateAsync({
        warrantyId: id,
        issueDescription: values.issueDescription,
      });
      router.replace('/(tabs)/claims');
    } catch (err) {
      Alert.alert('Could not submit', err instanceof Error ? err.message : String(err));
    }
  }

  const meta = warranty ? productTypeMeta(warranty.productType) : null;

  if (openClaim) {
    return (
      <Screen>
        <View className="gap-4 py-4">
          {warranty && meta && (
            <Card className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Text className="text-2xl">{meta.emoji}</Text>
              </View>
              <View className="flex-1">
                <Text variant="subheading">{warranty.brand}</Text>
                <Text variant="muted">
                  {meta.label} · {warranty.modelNumber}
                </Text>
              </View>
            </Card>
          )}

          <Card className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="subheading">Open claim in progress</Text>
              <Badge
                label={CLAIM_STATUS_LABEL[openClaim.status]}
                tone={openClaim.status === 'in_review' ? 'primary' : 'neutral'}
              />
            </View>
            <Text variant="muted">
              You already filed a claim for this product. File a new claim only after this one
              is resolved or rejected.
            </Text>
            <Text numberOfLines={3}>{openClaim.issueDescription}</Text>
          </Card>

          <View className="gap-2">
            <Button
              label="View claim"
              leftIcon={<LifeBuoy size={16} color="white" />}
              onPress={() => router.replace('/(tabs)/claims')}
            />
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <Screen scroll>
        <View className="gap-4 py-4">
          {warranty && meta && (
            <Card className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Text className="text-2xl">{meta.emoji}</Text>
              </View>
              <View className="flex-1">
                <Text variant="subheading">{warranty.brand}</Text>
                <Text variant="muted">
                  {meta.label} · {warranty.modelNumber}
                </Text>
              </View>
            </Card>
          )}

          <View>
            <Text variant="heading">Describe the issue</Text>
            <Text variant="muted" className="mt-1">
              We’ll log this as a claim and route it to the warranty provider. Include what
              happened, when it started, and any troubleshooting you’ve already tried.
            </Text>
          </View>

          <Controller
            control={control}
            name="issueDescription"
            render={({ field: { value, onChange, onBlur } }) => (
              <View className="gap-1.5">
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={6}
                  placeholder="e.g. The screen has a vertical line on the left side that appeared after 8 months of use. I’ve tried a factory reset, no change."
                  placeholderTextColor="rgb(148 163 184)"
                  textAlignVertical="top"
                  className={cn(
                    'min-h-[140px] rounded-xl border border-border bg-background p-3 text-base text-foreground',
                    errors.issueDescription && 'border-destructive'
                  )}
                />
                {errors.issueDescription ? (
                  <RNText className="text-xs font-medium text-destructive">
                    {errors.issueDescription.message}
                  </RNText>
                ) : null}
              </View>
            )}
          />

          {/* TODO(phase-3-polish): attach photos to a claim.
              Add an optional image picker (expo-image-picker on native, file input on web)
              that uploads to a `claim-attachments` Supabase bucket. Schema change required:
              add `attachment_urls text[]` to claims, plus storage bucket + RLS. */}

          <View className="mt-2 gap-2">
            <Button
              label="Submit claim"
              size="lg"
              fullWidth
              loading={isSubmitting || createClaim.isPending}
              leftIcon={<Send size={16} color="white" />}
              onPress={handleSubmit(onSubmit)}
            />
            <Button
              label="Cancel"
              variant="ghost"
              fullWidth
              onPress={() => router.back()}
            />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
