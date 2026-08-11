const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

/**
 * Detect external URLs in a message body so the UI can warn about
 * destination domains. Never treat detected links as trusted.
 */
export function detectLinks(body: string): {
  containsUrl: boolean;
  urlDomains: string[];
} {
  const domains = new Set<string>();
  for (const match of body.matchAll(URL_PATTERN)) {
    let raw = match[1] ?? "";
    if (!/^https?:\/\//i.test(raw)) {
      raw = `https://${raw}`;
    }
    try {
      domains.add(new URL(raw).hostname.toLowerCase());
    } catch {
      // Unparseable — still flag that something URL-like is present
      domains.add("unknown");
    }
  }
  return { containsUrl: domains.size > 0, urlDomains: [...domains] };
}
