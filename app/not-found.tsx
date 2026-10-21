import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="prose">
      <h1>Page not found</h1>
      <p className="muted">That company or page isn&apos;t here. It may not have enough reports yet, or the name may have changed.</p>
      <p><Link href="/" className="btn">See all rates</Link></p>
    </div>
  );
}
