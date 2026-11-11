export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'ShiftRates';
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || 'http://localhost:3000').replace(/\/$/, '');
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || SITE_NAME;

export const REGIONS = [
  { slug: 'north-east', name: 'North East', seo: 'the North East' },
  { slug: 'north-west', name: 'North West', seo: 'the North West' },
  { slug: 'yorkshire-humber', name: 'Yorkshire and the Humber', seo: 'Yorkshire and the Humber' },
  { slug: 'east-midlands', name: 'East Midlands', seo: 'the East Midlands' },
  { slug: 'west-midlands', name: 'West Midlands', seo: 'the West Midlands' },
  { slug: 'east-of-england', name: 'East of England', seo: 'the East of England' },
  { slug: 'london', name: 'London', seo: 'London' },
  { slug: 'south-east', name: 'South East', seo: 'the South East' },
  { slug: 'south-west', name: 'South West', seo: 'the South West' },
  { slug: 'wales', name: 'Wales', seo: 'Wales' },
  { slug: 'scotland', name: 'Scotland', seo: 'Scotland' },
  { slug: 'northern-ireland', name: 'Northern Ireland', seo: 'Northern Ireland' },
] as const;

// What kind of shift work a report is for. HGV driver has a few extra details (licence, job type, tramping, night-outs).
export const WORK_TYPES = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'factory', label: 'Factory / production' },
  { value: 'care', label: 'Care' },
  { value: 'security', label: 'Security' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'retail', label: 'Retail' },
  { value: 'forklift', label: 'Forklift / FLT' },
  { value: 'van', label: 'Van / courier driver' },
  { value: 'hgv', label: 'HGV driver' },
  { value: 'other', label: 'Other shift work' },
] as const;

export const workLabel = (v: string | null | undefined) =>
  WORK_TYPES.find((w) => w.value === v)?.label ?? 'Shift work';

// 'haulier' is legacy data from the HGV-only days; it reads as a direct employer like any other.
export const kindLabel = (k: string) => (k === 'agency' ? 'Agency' : 'Direct employer');

export const LICENCES = [
  { value: 'C1', label: 'C1 (7.5t)' },
  { value: 'C', label: 'Class 2 / Cat C' },
  { value: 'C+E', label: 'Class 1 / Cat C+E' },
] as const;

export const JOB_TYPES = [
  { value: 'trunking', label: 'Trunking' },
  { value: 'multi-drop', label: 'Multi-drop' },
  { value: 'tipper', label: 'Tipper' },
  { value: 'tanker', label: 'Tanker' },
  { value: 'adr', label: 'ADR' },
  { value: 'general', label: 'General haulage / curtain-sider' },
  { value: 'other', label: 'Other' },
] as const;

export const SHIFTS = [
  { value: 'day', label: 'Days' },
  { value: 'night', label: 'Nights' },
  { value: 'weekend', label: 'Weekends' },
  { value: 'tramping', label: 'Tramping (HGV)' },
] as const;

export const PAY_ROUTES = [
  { value: 'agency_paye', label: 'Agency PAYE' },
  { value: 'umbrella', label: 'Umbrella company' },
  { value: 'ltd', label: 'Own Ltd company' },
  { value: 'direct', label: 'Direct employee' },
] as const;

export const label = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? v;

export const regionName = (slug: string) => REGIONS.find((r) => r.slug === slug)?.name ?? slug;

export const money = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === '' ? '–' : `£${Number(n).toFixed(2)}`;

export const monthYear = (d: string | null | undefined) =>
  d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '–';

export const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
