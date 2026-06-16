import { View, type ViewProps } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'primary';

const toneContainer: Record<Tone, string> = {
  neutral: 'border border-slate-200 bg-slate-100',
  success: 'border border-emerald-200 bg-emerald-50',
  warning: 'border border-amber-200 bg-amber-50',
  destructive: 'border border-red-200 bg-red-50',
  primary: 'border border-slate-300 bg-slate-100',
};

const toneText: Record<Tone, string> = {
  neutral: 'text-slate-700',
  success: 'text-emerald-800',
  warning: 'text-amber-800',
  destructive: 'text-red-800',
  primary: 'text-slate-900',
};

interface Props extends ViewProps {
  label: string;
  tone?: Tone;
  className?: string;
}

export function Badge({ label, tone = 'neutral', className, ...rest }: Props) {
  return (
    <View
      className={cn('self-start rounded-lg px-2.5 py-1', toneContainer[tone], className)}
      {...rest}>
      <Text className={cn('text-xs font-semibold', toneText[tone])}>{label}</Text>
    </View>
  );
}
