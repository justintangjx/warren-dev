import { Text as RNText, type TextProps } from 'react-native';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'muted' | 'title' | 'heading' | 'subheading' | 'small';

const variantStyles: Record<Variant, string> = {
  default: 'text-foreground text-base',
  muted: 'text-muted-foreground text-sm',
  title: 'text-foreground text-3xl font-bold',
  heading: 'text-foreground text-xl font-semibold',
  subheading: 'text-foreground text-base font-semibold',
  small: 'text-muted-foreground text-xs',
};

interface Props extends TextProps {
  variant?: Variant;
  className?: string;
}

export function Text({ variant = 'default', className, ...rest }: Props) {
  return <RNText className={cn(variantStyles[variant], className)} {...rest} />;
}
