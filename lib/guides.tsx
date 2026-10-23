import Link from 'next/link';
import { NIGHT_OUT, UMBRELLA, TAX_YEAR } from './tax-config';

export type Guide = { slug: string; title: string; description: string; body: React.ReactNode };

const gbp = (n: number) => `£${n.toFixed(2)}`;

export const GUIDES: Guide[] = [
  {
    slug: 'agency-paye-vs-umbrella',
    title: 'Agency PAYE vs umbrella: what an HGV driver really takes home',
    description: `How agency PAYE and umbrella pay differ for UK HGV drivers in ${TAX_YEAR}, what the umbrella takes out, and how to compare rates fairly.`,
    body: (
      <>
        <p>Two agencies can quote you the same hourly rate and still leave you with different money at the end of the week. The difference is usually how you&apos;re paid.</p>
        <h2>Agency PAYE</h2>
        <p>The agency employs you for each assignment and runs your pay through its own payroll. You pay normal income tax and National Insurance. The agency pays employer costs on top, so the rate you&apos;re quoted is close to your gross pay.</p>
        <h2>Umbrella company</h2>
        <p>The agency pays an <strong>assignment rate</strong> to an umbrella company, which then employs you. Before you see a penny, the umbrella takes out:</p>
        <ul>
          <li>employer&apos;s National Insurance ({Math.round(UMBRELLA.employerNiRate * 100)}% above the threshold)</li>
          <li>the apprenticeship levy ({UMBRELLA.apprenticeshipLevyRate * 100}%)</li>
          <li>its own margin, often around £20–£30 a week</li>
        </ul>
        <p>So an umbrella rate needs to be noticeably higher than a PAYE rate just to come out the same. Always ask: <em>is that the PAYE rate or the umbrella rate?</em></p>
        <h2>Compare the two properly</h2>
        <p>Put both into the <Link href="/calculator">take-home calculator</Link> with the same hours. It shows the umbrella deductions line by line.</p>
        <h2>What other drivers are actually getting</h2>
        <p>Advertised ranges like &quot;£18–£35 an hour&quot; don&apos;t tell you much. <Link href="/">See what drivers report</Link> for real, or <Link href="/submit">add your own rate</Link> anonymously.</p>
        <p className="small muted">General information, not tax advice. Check your payslip and the agency&apos;s key information document.</p>
      </>
    ),
  },
  {
    slug: 'night-out-allowance',
    title: `HGV night-out allowance explained (${TAX_YEAR})`,
    description: `HMRC's tax-free overnight allowance for lorry drivers: ${gbp(NIGHT_OUT.withoutSleeperCab)} without a sleeper cab, ${gbp(NIGHT_OUT.withSleeperCab)} with one. What it covers and what to check.`,
    body: (
      <>
        <p>If you&apos;re tramping or on nights away, your night-out money can make a big difference to your take-home pay, because up to HMRC&apos;s benchmark it&apos;s paid without tax or National Insurance.</p>
        <h2>The HMRC benchmark rates</h2>
        <table>
          <thead><tr><th>Situation</th><th>Tax-free up to</th></tr></thead>
          <tbody>
            <tr><td>No sleeper cab</td><td><strong>{gbp(NIGHT_OUT.withoutSleeperCab)}</strong> per night</td></tr>
            <tr><td>Sleeper cab</td><td><strong>{gbp(NIGHT_OUT.withSleeperCab)}</strong> per night</td></tr>
          </tbody>
        </table>
        <p>Anything an employer pays above these figures is usually taxed like normal pay.</p>
        <h2>Questions to ask before you accept</h2>
        <ul>
          <li>Is the night-out paid on top of the hourly rate, or are some hours unpaid instead?</li>
          <li>Is it paid for every night out, including weekends parked up?</li>
          <li>Does it show as a separate line on the payslip?</li>
        </ul>
        <h2>See the difference it makes</h2>
        <p>Add your nights out in the <Link href="/calculator">take-home calculator</Link>. When you <Link href="/submit">share your rate</Link>, include the night-out figure so other drivers can compare.</p>
        <p className="small muted">General information, not tax advice. HMRC rules can change, so check GOV.UK for the current figures.</p>
      </>
    ),
  },
  {
    slug: 'questions-to-ask-an-agency',
    title: '12 questions to ask an HGV agency before your first shift',
    description: 'A checklist for new and experienced HGV drivers signing with a driving agency: pay, hours, cancellations, holiday pay and more.',
    body: (
      <>
        <p>Most bad agency experiences come down to things nobody asked about upfront. Screenshot this list before you sign up.</p>
        <h2>Pay</h2>
        <ol>
          <li>Is the rate PAYE or umbrella? (<Link href="/guides/agency-paye-vs-umbrella">why it matters</Link>)</li>
          <li>What&apos;s the rate for nights, weekends and overtime, and after how many hours does overtime start?</li>
          <li>How is holiday pay handled: rolled up in the rate or accrued?</li>
          <li>Is there a night-out allowance, and how much? (<Link href="/guides/night-out-allowance">current HMRC figures</Link>)</li>
          <li>When is pay day, and how are missing hours fixed?</li>
        </ol>
        <h2>Work</h2>
        <ol start={6}>
          <li>How many shifts a week can you realistically offer at my licence level?</li>
          <li>What happens if a shift is cancelled the same day? Do I get paid anything?</li>
          <li>Who are the main clients, and what work is it: trunking, multi-drop, tipper?</li>
          <li>Are there unpaid breaks, waiting time or yard time I should know about?</li>
        </ol>
        <h2>Paperwork</h2>
        <ol start={10}>
          <li>Can I see the Key Information Document before I sign?</li>
          <li>Who pays for my CPC, medical and tacho card renewals?</li>
          <li>After 12 weeks on the same assignment, do I get equal pay with permanent drivers?</li>
        </ol>
        <h2>Check what they actually pay</h2>
        <p>Before you take the work, <Link href="/">check the agency&apos;s real rates</Link> from other drivers. After your first week, <Link href="/submit">add yours</Link> so the next driver knows too.</p>
      </>
    ),
  },
];
