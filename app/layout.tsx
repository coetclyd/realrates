import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import Tracker from './tracker';
import { SITE_NAME, SITE_URL } from '@/lib/options';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} – real HGV driver pay rates`, template: `%s | ${SITE_NAME}` },
  description:
    'What do HGV agencies and hauliers actually pay? Real, anonymous pay rates reported by UK lorry drivers, plus a take-home pay calculator.',
  openGraph: { siteName: SITE_NAME, type: 'website' },
};

export const viewport: Viewport = { themeColor: '#111316', width: 'device-width', initialScale: 1 };

const [first, ...rest] = SITE_NAME.match(/[A-Z][a-z]*|[a-z]+|\d+/g) ?? [SITE_NAME];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="logo" aria-label={`${SITE_NAME} home`}>
              {first}
              <span>{rest.join('')}</span>
            </Link>
            <nav className="nav" aria-label="Main">
              <Link href="/" className="hide-sm">Rates</Link>
              <Link href="/calculator">Calculator</Link>
              <Link href="/submit" className="btn small">Share your rate</Link>
            </nav>
          </div>
          <div className="road" aria-hidden="true" />
        </header>
        <main>
          <div className="wrap">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="wrap">
            <nav aria-label="Footer">
              <Link href="/about">About</Link>
              <Link href="/calculator">Take-home calculator</Link>
              <Link href="/guides">Guides</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/contact">Complaints and removals</Link>
            </nav>
            <p>Rates are reported anonymously by drivers and are not verified. Pay estimates are not tax advice.</p>
          </div>
        </footer>
        <Analytics />
        <Tracker />
      </body>
    </html>
  );
}
