import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { ReceiptScanner } from '@/components/receipt-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Select, type SelectOption } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { COMMON_BRANDS, PRODUCT_TYPES } from '@/constants/products';
import { useCreateWarranty } from '@/hooks/use-warranties';
import type { ParsedReceipt } from '@/lib/receipt-parser';
import { purchasePriceToCents, warrantyFormSchema, type WarrantyFormValues } from '@/lib/schemas';
import type { ProductType } from '@/lib/types';
import type { InferredWarrantyTerm } from '@/lib/warranty-terms';

type FormValues = WarrantyFormValues;

const brandOptions: SelectOption[] = COMMON_BRANDS.map((b) => ({ value: b, label: b }));
const productOptions: SelectOption<ProductType>[] = PRODUCT_TYPES.map((p) => ({
  value: p.value,
  label: `${p.emoji}  ${p.label}`,
}));
const durationOptions: SelectOption[] = [
  { value: '12', label: '1 year', hint: 'Most consumer electronics' },
  { value: '24', label: '2 years', hint: 'EU baseline / many appliances' },
  { value: '36', label: '3 years' },
  { value: '60', label: '5 years' },
];

export default function NewWarrantyScreen() {
  const router = useRouter();
  const createWarranty = useCreateWarranty();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(warrantyFormSchema),
    mode: 'onTouched',
    defaultValues: {
      brand: '',
      productType: 'other',
      modelNumber: '',
      serialNumber: '',
      purchaseDate: '',
      warrantyDurationMonths: 12,
      retailer: '',
      purchasePrice: '',
    },
  });

  function applyScanResults(parsed: ParsedReceipt, inferredTerm: InferredWarrantyTerm) {
    const opts = { shouldValidate: true, shouldDirty: true };
    if (parsed.brand) setValue('brand', parsed.brand, opts);
    if (parsed.productType) setValue('productType', parsed.productType, opts);
    if (parsed.modelNumber) setValue('modelNumber', parsed.modelNumber, opts);
    if (parsed.purchaseDate) setValue('purchaseDate', parsed.purchaseDate, opts);
    if (parsed.retailer) setValue('retailer', parsed.retailer, opts);
    if (parsed.totalCents != null) {
      setValue('purchasePrice', (parsed.totalCents / 100).toFixed(2), opts);
    }
    if (parsed.brand || parsed.productType) {
      setValue('warrantyDurationMonths', inferredTerm.months, opts);
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      await createWarranty.mutateAsync({
        brand: values.brand,
        productType: values.productType,
        modelNumber: values.modelNumber,
        serialNumber: values.serialNumber,
        purchaseDate: values.purchaseDate,
        warrantyDurationMonths: values.warrantyDurationMonths,
        retailer: values.retailer?.trim() || null,
        purchasePriceCents: purchasePriceToCents(values.purchasePrice),
      });
      router.back();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <Screen scroll>
        <View className="gap-4 py-4">
          <ReceiptScanner onExtracted={applyScanResults} />

          <Controller
            control={control}
            name="brand"
            render={({ field: { value, onChange } }) => (
              <Select
                label="Brand"
                value={value || null}
                onChange={onChange}
                options={brandOptions}
                placeholder="Select a brand"
                searchable
                error={errors.brand?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="productType"
            render={({ field: { value, onChange } }) => (
              <Select<ProductType>
                label="Product type"
                value={value}
                onChange={onChange}
                options={productOptions}
                error={errors.productType?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="modelNumber"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Model number"
                placeholder="e.g. QN65Q80B"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="characters"
                error={errors.modelNumber?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="serialNumber"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Serial number"
                placeholder="On the box or device label"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="characters"
                error={errors.serialNumber?.message}
              />
            )}
          />

          {/* TODO(phase-2-polish): replace with a real date picker.
              Web: render <input type="date"> via Platform.OS === 'web'.
              Native: install @react-native-community/datetimepicker (expo install) and gate by Platform.
              Keep the YYYY-MM-DD wire format so the Zod schema and Supabase column don't change. */}
          <Controller
            control={control}
            name="purchaseDate"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Purchase date"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                hint="Format: 2025-01-15"
                error={errors.purchaseDate?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="retailer"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Retailer (optional)"
                placeholder="Where you bought it, e.g. Courts"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.retailer?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="purchasePrice"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Purchase price (optional)"
                placeholder="e.g. 1299.99"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                hint="In SGD — helps when filing a claim"
                error={errors.purchasePrice?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="warrantyDurationMonths"
            render={({ field: { value, onChange } }) => (
              <Select
                label="Warranty duration"
                value={String(value)}
                onChange={(v) => onChange(Number(v))}
                options={durationOptions}
                error={errors.warrantyDurationMonths?.message}
              />
            )}
          />

          <View className="mt-2 gap-2">
            <Button
              label="Save warranty"
              size="lg"
              fullWidth
              loading={isSubmitting || createWarranty.isPending}
              onPress={handleSubmit(onSubmit)}
            />
            <Button
              label="Cancel"
              variant="ghost"
              fullWidth
              onPress={() => router.back()}
            />
          </View>

          {/* TODO(phase-2-polish): receipt upload field.
              Add an optional receipt picker here that uploads to the `receipts` Supabase
              bucket at path `<user_id>/<warranty_id>/<filename>` and writes the public/signed
              URL into warranties.receipt_url. Web: <input type="file" accept="image/*,.pdf">.
              Native: expo-image-picker (already installed) -> ArrayBuffer -> supabase.storage. */}
          <Text variant="small" className="mt-2">
            Receipt photo upload is coming next — you’ll be able to add it from the warranty
            detail screen.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

