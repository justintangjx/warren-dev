import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

export function Card({ className, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-2xl border border-border bg-card p-4', className)}
      {...rest}
    />
  );
}
