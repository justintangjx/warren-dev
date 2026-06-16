import { Check, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';

import { cn } from '@/lib/utils';
import { Text } from './text';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string = string> {
  label?: string;
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  error?: string;
  searchable?: boolean;
  containerClassName?: string;
}

export function Select<T extends string = string>({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  error,
  searchable,
  containerClassName,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text variant="subheading" className="text-sm">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'h-11 flex-row items-center justify-between rounded-lg border border-border bg-muted px-3',
          error && 'border-destructive'
        )}>
        <Text className={cn(selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color="rgb(100 116 139)" />
      </Pressable>
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable className="flex-1 bg-black/40" onPress={close}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="mx-auto mt-24 w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm"
            style={{ maxHeight: '70%' }}>
            {label && (
              <Text variant="heading" className="mb-3">
                {label}
              </Text>
            )}
            {searchable && (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor="rgb(148 163 184)"
                className="mb-2 h-10 rounded-lg border border-border bg-background px-3 text-foreground"
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    className={cn(
                      'flex-row items-center justify-between rounded-lg px-3 py-3',
                      isSelected && 'bg-accent'
                    )}>
                    <View className="flex-1">
                      <Text>{item.label}</Text>
                      {item.hint ? (
                        <Text variant="small" className="mt-0.5">
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && <Check size={18} color="rgb(15 23 42)" />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text variant="muted" className="py-6 text-center">
                  No matches
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
