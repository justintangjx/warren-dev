import * as ImagePicker from 'expo-image-picker';
import { ScanLine } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { parseReceiptText, type ParsedReceipt } from '@/lib/receipt-parser';
import { formatCurrencySGD, formatDate } from '@/lib/utils';
import { inferWarrantyTerm, type InferredWarrantyTerm } from '@/lib/warranty-terms';
import { ocrEngine, OcrUnavailableError } from '@/services/ocr';

interface Props {
  onExtracted: (parsed: ParsedReceipt, inferredTerm: InferredWarrantyTerm) => void;
}

type ScanState =
  | { status: 'idle' }
  | { status: 'working'; progress: number }
  | { status: 'done'; parsed: ParsedReceipt; inferredTerm: InferredWarrantyTerm }
  | { status: 'error'; message: string };

function summarize(parsed: ParsedReceipt): string[] {
  const parts: string[] = [];
  if (parsed.retailer) parts.push(parsed.retailer);
  if (parsed.brand) parts.push(parsed.brand);
  if (parsed.purchaseDate) parts.push(formatDate(parsed.purchaseDate));
  if (parsed.totalCents != null) parts.push(formatCurrencySGD(parsed.totalCents));
  return parts;
}

export function ReceiptScanner({ onExtracted }: Props) {
  const [state, setState] = useState<ScanState>({ status: 'idle' });

  if (!ocrEngine.isSupported) {
    return null;
  }

  async function scan() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;

      setState({ status: 'working', progress: 0 });
      const { text } = await ocrEngine.recognize(result.assets[0].uri, (progress) =>
        setState({ status: 'working', progress })
      );

      const parsed = parseReceiptText(text);
      const found = summarize(parsed).length > 0 || parsed.productType !== null;
      analytics.capture('receipt_scanned', {
        success: found,
        found_retailer: parsed.retailer !== null,
        found_date: parsed.purchaseDate !== null,
        found_total: parsed.totalCents !== null,
        found_brand: parsed.brand !== null,
        found_product_type: parsed.productType !== null,
      });

      if (!found) {
        setState({
          status: 'error',
          message:
            "Couldn't read any details from that photo. Try a sharper, well-lit shot — or fill in the fields below.",
        });
        return;
      }

      const inferredTerm = inferWarrantyTerm(parsed.brand, parsed.productType);
      setState({ status: 'done', parsed, inferredTerm });
      onExtracted(parsed, inferredTerm);
    } catch (err) {
      if (err instanceof OcrUnavailableError) {
        setState({ status: 'error', message: err.message });
        return;
      }
      analytics.captureException(err, { mutation: 'receiptScan' });
      setState({
        status: 'error',
        message: 'Something went wrong while reading the receipt. You can still fill in the fields below.',
      });
    }
  }

  const working = state.status === 'working';

  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-2">
        <ScanLine size={18} color="rgb(15 23 42)" />
        <Text variant="subheading">Scan a receipt</Text>
      </View>
      <Text variant="muted">
        Snap or upload a photo of your receipt and we’ll fill in what we find — retailer, date,
        product, price, and a suggested warranty term.
      </Text>

      <Button
        label={
          working
            ? `Reading receipt… ${Math.round((state.status === 'working' ? state.progress : 0) * 100)}%`
            : state.status === 'done'
              ? 'Scan a different receipt'
              : 'Choose receipt photo'
        }
        variant={state.status === 'done' ? 'outline' : 'secondary'}
        loading={working}
        onPress={scan}
      />

      {state.status === 'done' ? (
        <View className="gap-1">
          <Text variant="small">Found: {summarize(state.parsed).join(' · ')}</Text>
          <Text variant="small">
            Suggested warranty: {state.inferredTerm.months} months ({state.inferredTerm.note}).
            Check the fields below before saving.
          </Text>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <Text variant="small" className="text-destructive">
          {state.message}
        </Text>
      ) : null}
    </Card>
  );
}
