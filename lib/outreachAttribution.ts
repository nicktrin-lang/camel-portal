// Outreach attribution — survives the client-side hops that drop the query string.
//
// The partner-outreach email links to the portal root with utm_* params plus
// `ref=<prospect_id>` (see app/api/admin/outreach/send/route.ts). That query string
// then dies twice on the way to the conversion:
//
//   /?utm_source=outreach&ref=…   →  <Link href="/partner/signup">        query dropped
//   /partner/signup               →  router.replace("/partner/application-submitted")
//                                                                          query dropped
//
// So /partner/application-submitted read utm_source/utm_term/utm_campaign off
// window.location.search and always got nothing — every partner_signup_complete
// looked organic, and `ref` was never read by anything at all.
//
// Stashing the attribution on arrival fixes the whole chain without threading a query
// string through every Link and redirect. sessionStorage (not localStorage) so it is
// scoped to the tab and expires with it — a prospect who returns organically next week
// is not credited to the campaign.

export type OutreachAttribution = {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

const KEY = "camel.outreach.attribution";
const FIELDS = ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

function fromSearch(search: string): OutreachAttribution {
  const p = new URLSearchParams(search);
  const out: OutreachAttribution = {};
  for (const f of FIELDS) {
    const v = p.get(f);
    if (v) out[f] = v;
  }
  return out;
}

/** Persist attribution if this page load is an outreach arrival. No-op otherwise.
 *  Returns what was captured (or null), so the caller can use it for the landing event. */
export function captureOutreachAttribution(search: string): OutreachAttribution | null {
  const attr = fromSearch(search);
  if (attr.utm_source !== "outreach") return null;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(attr));
  } catch {
    // Private mode / storage disabled — the landing event still fires, we just
    // cannot carry attribution to the conversion. Never break the page for this.
  }
  return attr;
}

/** Attribution for the current page: live query string first (it is authoritative when
 *  present), else whatever was captured on arrival this session. Empty object if neither. */
export function readOutreachAttribution(search: string): OutreachAttribution {
  const live = fromSearch(search);
  if (live.utm_source) return live;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OutreachAttribution;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Attribution as GA4 event params — string-valued, empty keys omitted. */
export function attributionParams(attr: OutreachAttribution): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = attr[f];
    if (v) out[f] = v;
  }
  return out;
}
