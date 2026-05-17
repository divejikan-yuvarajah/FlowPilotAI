/**
 * Resolves the canonical site origin for OAuth + magic-link `redirectTo`.
 *
 * Priority (highest first):
 *   1. `NEXT_PUBLIC_SITE_URL`  — set this in Vercel to your production domain
 *   2. `NEXT_PUBLIC_VERCEL_URL` — auto-injected by Vercel for the current deploy
 *   3. `window.location.origin` — final client-side fallback (dev / preview)
 *
 * Always returns a URL with NO trailing slash.
 */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return stripTrailingSlash(ensureProtocol(vercel));

  if (typeof window !== "undefined") return window.location.origin;

  return "http://localhost:3000";
}

function ensureProtocol(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
