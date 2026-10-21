import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, OPERATOR_NAME, CONTACT_EMAIL } from '@/lib/options';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  const contact = CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <Link href="/contact">our contact form</Link>;
  return (
    <div className="prose">
      <h1>Privacy policy</h1>
      <p className="muted small">Last updated: October 2026</p>
      <p>{SITE_NAME} is run by {OPERATOR_NAME} (&quot;we&quot;), the data controller for personal data collected through this site under UK GDPR. Contact us at {contact}.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your email address</strong>, only if you sign in to share a rate. We use it to send login links and to stop spam.</li>
        <li><strong>The rates and comments you submit.</strong> These are stored against your account so you can manage them and so we can apply daily limits, but they are never shown with your email or any identifier.</li>
        <li><strong>Complaint and removal requests</strong>, including your name, email and message.</li>
        <li><strong>Technical data</strong> such as IP address and browser type, processed by our hosting and database providers for security and to keep the site running.</li>
      </ul>

      <h2>What we show publicly</h2>
      <p>Only aggregate figures (median and range) for companies with at least 3 reports, and comments we have checked. We never publish your email, and we record the month you worked rather than exact dates.</p>

      <h2>Why we use it (lawful basis)</h2>
      <p>Legitimate interests: running a pay comparison service for drivers, preventing spam and abuse, and handling complaints.</p>

      <h2>Who we share it with</h2>
      <p>Supabase (database and login) and Vercel (website hosting), who process data on our behalf under data processing terms. We don&apos;t sell personal data or share it with employers or agencies.</p>

      <h2>Cookies</h2>
      <p>We only use essential cookies that keep you signed in. No advertising or tracking cookies.</p>

      <h2>How long we keep it</h2>
      <p>Account data is kept until you ask us to delete it. Rate figures may be kept in aggregate after an account is deleted, with no link to you. Complaint records are kept for up to 2 years.</p>

      <h2>Your rights</h2>
      <p>You can ask to access, correct or delete your data, or object to how we use it, by contacting {contact}. You can also complain to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk">ico.org.uk</a>.</p>
    </div>
  );
}
