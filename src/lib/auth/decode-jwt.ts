/**
 * Tiny JWT payload decoder. We only read claims (session_id, sub) from our own
 * Supabase tokens, so we don't verify the signature here — the browser's
 * cookie has already been authenticated by Supabase middleware.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(jwt: string): T | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}
