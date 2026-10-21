import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, OPERATOR_NAME } from '@/lib/options';

export const metadata: Metadata = { title: 'Terms of use' };

export default function Terms() {
  return (
    <div className="prose">
      <h1>Terms of use</h1>
      <p className="muted small">Last updated: October 2026</p>
      <p>By using {SITE_NAME}, run by {OPERATOR_NAME}, you agree to these terms.</p>

      <h2>Sharing a rate</h2>
      <ul>
        <li>Only report jobs you have personally worked, and be accurate.</li>
        <li>Don&apos;t name or identify individuals (managers, planners, other drivers) or include phone numbers, emails or other personal details.</li>
        <li>Comments should be honest opinions based on your own experience. Don&apos;t state things as fact that you can&apos;t back up, and don&apos;t post abuse.</li>
        <li>By submitting, you allow us to publish your report as part of aggregate figures and, after checking, your comment, without your name or email.</li>
      </ul>

      <h2>Moderation</h2>
      <p>We check comments and new company names before they appear, and we may edit out, refuse or remove anything that breaks these rules or that we reasonably believe is inaccurate or unlawful.</p>

      <h2>Accuracy</h2>
      <p>Rates are reported by drivers and are not verified by us or by the companies listed. The take-home calculator gives estimates only and is not tax or financial advice. Always check pay with the employer and your payslip.</p>

      <h2>Complaints</h2>
      <p>If you believe content is wrong or unlawful, use our <Link href="/contact">complaints and removal form</Link>. We aim to respond within 5 working days.</p>

      <h2>Liability</h2>
      <p>The site is provided as is. We aren&apos;t liable for decisions made using information on it, except where the law doesn&apos;t allow us to exclude liability.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The date above shows the latest version. These terms are governed by the law of England and Wales.</p>
    </div>
  );
}
