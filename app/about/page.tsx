import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/options';

export const metadata: Metadata = { title: 'About' };

export default function About() {
  return (
    <div className="prose">
      <h1>About {SITE_NAME}</h1>
      <p>
        Job adverts for shift work often show pay ranges so wide they&apos;re useless, and two agencies can pay very
        different rates for the same work. {SITE_NAME} is a free UK site where shift workers – drivers, warehouse,
        factory, care, security, cleaning, hospitality, retail and more – anonymously share what they were actually
        paid, so the next person knows what a fair rate looks like before taking the shift. It&apos;s early days, and it
        started with HGV drivers.
      </p>
      <h2>How it works</h2>
      <p>You report the kind of work, hourly rate and shift for a job you&apos;ve done (drivers also add licence and job type). We show the median and range for each company, separately for each kind of work.</p>
      <h2>How we protect you</h2>
      <p>
        Your email is only used to log in and stop spam. It is never shown or linked to your rates on the site. A
        company&apos;s figures only appear once at least 3 people have reported the same kind of work there, and we only record the month you worked,
        not exact dates. Comments are checked before they go live, and anything naming individuals is removed.
      </p>
      <h2>Fair to companies</h2>
      <p>
        Figures are workers&apos; own reports and aren&apos;t verified. Any company that thinks something is wrong can{' '}
        <Link href="/contact">ask us to review it</Link>.
      </p>
      <p><Link href="/submit" className="btn">Share your rate</Link></p>
    </div>
  );
}
