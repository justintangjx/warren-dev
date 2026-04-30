import { View, type ViewProps } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'primary';

const toneContainer: Record<Tone, string> = {
  neutral: 'bg-secondary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  primary: 'bg-primary',
};

const toneText: Record<Tone, string> = {
  neutral: 'text-secondary-foreground',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive-foreground',
  primary: 'text-primary-foreground',
};

interface Props extends ViewProps {
  label: string;
  tone?: Tone;
  className?: string;
}

export function Badge({ label, tone = 'neutral', className, ...rest }: Props) {
  return (
    <View
      className={cn('self-start rounded-full px-2.5 py-1', toneContainer[tone], className)}
      {...rest}>
      <Text className={cn('text-xs font-semibold', toneText[tone])}>{label}</Text>
    </View>
  );
}
