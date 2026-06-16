import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { Text as RNText, TextInput, type TextInputProps, View } from 'react-native';
import { Text } from './text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, containerClassName, className, ...rest },
  ref
) {
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && <Text variant="subheading" className="text-sm">{label}</Text>}
      <TextInput
        ref={ref}
        placeholderTextColor="rgb(148 163 184)"
        className={cn(
          'h-11 rounded-lg border border-border bg-muted px-3 text-base text-foreground',
          error && 'border-destructive',
          className
        )}
        {...rest}
      />
      {error ? (
        <RNText className="text-xs font-medium text-destructive">{error}</RNText>
      ) : hint ? (
        <Text variant="small">{hint}</Text>
      ) : null}
    </View>
  );
});
