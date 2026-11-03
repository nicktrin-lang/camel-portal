import { NextResponse } from "next/server";
import { trackProspect } from "@/lib/outreach/trackProspect";

// Public, cookieless beacon from the partner landing page and signup form: records that
// the prospect behind an outreach email's ?ref= reached the site or opened the form.
// Only page JavaScript calls it, so link-scanning bots that pre-fetch the email's links
// never count. "signed_up" is NOT accepted here; complete-signup records that itself.
// Always 204: it reveals nothing about whether a ref exists.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const event = body?.event;
  if (event === "landing" || event === "signup_started") {
    await trackProspect(body?.ref, event);
  }
  return new NextResponse(null, { status: 204 });
}
