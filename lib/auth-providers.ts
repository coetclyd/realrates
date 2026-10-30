export const SOCIAL_PROVIDERS = ['google', 'azure', 'facebook'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

// Explicit opt-in. Unset or empty means no social login.
export function enabledSocialProviders(): SocialProvider[] {
  const configured = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? '')
    .split(',').map((value) => value.trim().toLowerCase());
  return SOCIAL_PROVIDERS.filter((provider) => configured.includes(provider));
}
