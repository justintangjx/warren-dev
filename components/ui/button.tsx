import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-primary active:opacity-80',
  secondary: 'bg-secondary active:opacity-80',
  outline: 'bg-transparent border border-border active:bg-accent',
  ghost: 'bg-transparent active:bg-accent',
  destructive: 'bg-destructive active:opacity-80',
};

const labelByVariant: Record<Variant, string> = {
  primary: 'text-primary-foreground font-semibold',
  secondary: 'text-secondary-foreground font-semibold',
  outline: 'text-foreground font-semibold',
  ghost: 'text-foreground font-semibold',
  destructive: 'text-destructive-foreground font-semibold',
};

const sizeContainer: Record<Size, string> = {
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-12 px-5',
};

const sizeLabel: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

interface Props extends PressableProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center rounded-lg',
        containerByVariant[variant],
        sizeContainer[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className
      )}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon}
          <Text className={cn(labelByVariant[variant], sizeLabel[size])}>{label}</Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}
