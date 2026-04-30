import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Warranty, WarrantyWithComputed } from './types';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function computeExpirationDate(w: Pick<Warranty, 'purchaseDate' | 'warrantyDurationMonths' | 'isExtended' | 'extendedUntil'>): Date {
  if (w.isExtended && w.extendedUntil) {
    return parseISO(w.extendedUntil);
  }
  return addMonths(parseISO(w.purchaseDate), w.warrantyDurationMonths);
}

export function withComputed(w: Warranty, now: Date = new Date()): WarrantyWithComputed {
  const expiration = computeExpirationDate(w);
  const daysUntilExpiry = differenceInCalendarDays(expiration, now);
  return {
    ...w,
    expirationDate: expiration.toISOString(),
    daysUntilExpiry,
    isActive: daysUntilExpiry >= 0,
  };
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy');
}

export function formatRelativeExpiry(daysUntilExpiry: number): string {
  if (daysUntilExpiry < 0) {
    const days = Math.abs(daysUntilExpiry);
    return `Expired ${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (daysUntilExpiry === 0) return 'Expires today';
  if (daysUntilExpiry === 1) return 'Expires tomorrow';
  if (daysUntilExpiry < 30) return `Expires in ${daysUntilExpiry} days`;
  if (daysUntilExpiry < 365) {
    const months = Math.round(daysUntilExpiry / 30);
    return `Expires in ${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.round(daysUntilExpiry / 365);
  return `Expires in ${years} year${years === 1 ? '' : 's'}`;
}

export function formatCurrencySGD(cents: number): string {
  return `S$${(cents / 100).toFixed(2)}`;
}
