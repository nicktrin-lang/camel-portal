import { NextResponse } from "next/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";
import { refreshPartnerLiveStatus } from "@/lib/portal/refreshPartnerLiveStatus";

export async function POST(req: Request) {
  try {
    const { user, role, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const requestedUserId = String(body?.userId || "").trim();

    const targetUserId = isAdminRole(role)
      ? requestedUserId || user.id
      : user.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const result = await refreshPartnerLiveStatus(targetUserId);

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to refresh partner live status" },
      { status: 500 }
    );
  }
}