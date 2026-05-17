/**
 * Lightweight user-agent parser. Avoids adding ua-parser-js as a dependency.
 * Returns the bits we actually display in the active-sessions list.
 */

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
}

const UNKNOWN: ParsedUserAgent = {
  browser: "Unknown browser",
  os: "Unknown OS",
  device: "Desktop",
  isMobile: false,
};

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return UNKNOWN;

  // ── OS ───────────────────────────────────────────────────────────────────
  let os = "Unknown OS";
  if (/Windows NT 10\.0/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 11/.test(ua)) os = "Windows 11";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/.test(ua)) os = "Windows 7";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone OS (\d+_\d+)/.test(ua)) {
    const m = ua.match(/iPhone OS (\d+)_(\d+)/);
    os = m ? `iOS ${m[1]}.${m[2]}` : "iOS";
  } else if (/iPad/.test(ua)) os = "iPadOS";
  else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
    const m = ua.match(/Mac OS X (\d+)[._](\d+)/);
    os = m ? `macOS ${m[1]}.${m[2]}` : "macOS";
  } else if (/Android (\d+(?:\.\d+)?)/.test(ua)) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/Linux/.test(ua)) os = "Linux";
  else if (/CrOS/.test(ua)) os = "ChromeOS";

  // ── Browser ──────────────────────────────────────────────────────────────
  // Order matters: more specific UAs first (Edge/OPR include "Chrome" too).
  let browser = "Unknown browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = "Opera";
  else if (/Brave/.test(ua)) browser = "Brave";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  // ── Device class ─────────────────────────────────────────────────────────
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(ua);
  let device = "Desktop";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua) && /Mobile/.test(ua)) device = "Android phone";
  else if (/Android/.test(ua)) device = "Android tablet";
  else if (isMobile) device = "Mobile";

  return { browser, os, device, isMobile };
}

/** Nice human label like "Chrome on Windows 10/11". */
export function formatUserAgent(ua: string | null | undefined): string {
  const { browser, os } = parseUserAgent(ua);
  return `${browser} on ${os}`;
}
