import { Input } from '@/components/ui/input';
import type { ComponentProps } from 'react';

interface PhoneInputProps extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string;
  onChange: (digits: string) => void;
  countryCode?: string;
  maxDigits?: number;
}

export function PhoneInput({
  value,
  onChange,
  countryCode = '+91',
  maxDigits = 10,
  ...props
}: PhoneInputProps) {
  return (
    <div className="flex gap-2">
      <div
        className="flex items-center rounded-md bg-muted px-3 text-sm font-medium text-foreground"
        aria-hidden="true"
      >
        {countryCode}
      </div>
      <Input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, maxDigits))}
        maxLength={maxDigits}
        {...props}
      />
    </div>
  );
}

export function formatPhoneE164(countryCode: string, digits: string): string {
  return `${countryCode}${digits.replace(/\D/g, '')}`;
}
