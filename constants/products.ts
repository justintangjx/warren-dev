import type { ProductType } from '@/lib/types';

export const COMMON_BRANDS = [
  'Samsung',
  'Sony',
  'Philips',
  'LG',
  'Apple',
  'Dyson',
  'Bosch',
  'Panasonic',
  'Xiaomi',
  'Asus',
  'Dell',
  'HP',
  'Lenovo',
  'Microsoft',
  'Nintendo',
  'Logitech',
  'Bose',
  'JBL',
  'Canon',
  'Nikon',
  'Tefal',
  'Mistral',
  'Europace',
  'Toshiba',
  'Sharp',
] as const;

export const PRODUCT_TYPES: { value: ProductType; label: string; emoji: string }[] = [
  { value: 'television', label: 'Television', emoji: '📺' },
  { value: 'laptop', label: 'Laptop', emoji: '💻' },
  { value: 'phone', label: 'Phone', emoji: '📱' },
  { value: 'tablet', label: 'Tablet', emoji: '📱' },
  { value: 'audio', label: 'Audio / Speaker', emoji: '🔊' },
  { value: 'kitchen_appliance', label: 'Kitchen appliance', emoji: '🍳' },
  { value: 'home_appliance', label: 'Home appliance', emoji: '🧺' },
  { value: 'lighting', label: 'Lighting', emoji: '💡' },
  { value: 'wearable', label: 'Wearable', emoji: '⌚' },
  { value: 'gaming_console', label: 'Gaming console', emoji: '🎮' },
  { value: 'camera', label: 'Camera', emoji: '📷' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export function productTypeMeta(type: ProductType) {
  return PRODUCT_TYPES.find((p) => p.value === type) ?? PRODUCT_TYPES[PRODUCT_TYPES.length - 1];
}
