import type { Metadata } from 'next';
import Calculator from './calculator';
import { TAX_YEAR } from '@/lib/tax-config';

export const metadata: Metadata = {
  title: `Take-home pay calculator for shift workers ${TAX_YEAR}`,
  description: `Work out your take-home pay from an hourly rate for ${TAX_YEAR}: PAYE or umbrella, overtime, and tax-free night-out allowances for drivers.`,
  alternates: { canonical: '/calculator' },
};

export default function CalculatorPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <h1>Take-home pay calculator</h1>
      <p className="muted">PAYE or umbrella, with overtime and night-outs. Updates as you type.</p>
      <Calculator />
    </div>
  );
}
