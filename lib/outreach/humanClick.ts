// A click whose user-agent is a known corporate security scanner (or a proxy pre-fetcher) is
// almost certainly a bot, not a human. Best-effort filter, shared by the Partner Outreach page
// and the campaign results.
export const SCANNER_UA = /googleimageproxy|proofpoint|barracuda|mimecast|forcepoint|symantec|fireeye|bitdefender|cloudmark|messagelabs|microsoft|outlook|avast|trendmicro/i;

/** Nick's own test inboxes (nicktrin+anything@): left out of every result. */
export function isTestAddress(email: string | null | undefined) { return /nicktrin\+/i.test(String(email || "")); }

export function isHumanClick(clickedAt: string | null | undefined, userAgent: string | null | undefined) {
  return !!clickedAt && !(userAgent && SCANNER_UA.test(userAgent));
}
