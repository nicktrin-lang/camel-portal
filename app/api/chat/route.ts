import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";

function fmt(v?: string | null) {
  if (!v) return "not set";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Europe/Madrid" }); } catch { return v; }
}

function bookingStatusReadable(s?: string | null) {
  switch (String(s || "").toLowerCase()) {
    case "confirmed": return "Confirmed — awaiting driver assignment";
    case "driver_assigned": return "Driver assigned";
    case "en_route": return "Driver en route";
    case "arrived": return "Driver has arrived";
    case "collected": return "Car collected — on hire";
    case "returned": return "Car returned";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(s || "unknown").replaceAll("_", " ");
  }
}

export async function POST(req: Request) {
  try {
    const { user, role, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const messages: { role: string; content: string }[] = body?.messages || [];
    if (!messages.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();
    const isAdmin = isAdminRole(role);
    const userLabel = isAdmin ? "ADMIN" : "PARTNER";

    // Fetch bookings — admin sees all recent, partner sees their own
    let bookingQuery = db
      .from("partner_bookings")
      .select(`
        id, job_number, booking_status, amount, currency,
        car_hire_price, fuel_price, commission_rate, commission_amount,
        partner_payout_amount, fuel_charge, fuel_refund,
        driver_name, driver_phone, driver_vehicle,
        driver_assigned_at, created_at, request_id, partner_user_id
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!isAdmin) bookingQuery = bookingQuery.eq("partner_user_id", user.id);

    const { data: bookingRows } = await bookingQuery;
    const rows = bookingRows || [];

    // Fetch related requests
    const reqIds = Array.from(new Set(rows.map((r: any) => r.request_id).filter(Boolean)));
    let requestMap = new Map<string, any>();
    if (reqIds.length > 0) {
      const { data: reqs } = await db
        .from("customer_requests")
        .select("id, job_number, pickup_address, dropoff_address, pickup_at, dropoff_at, customer_name, customer_phone, status")
        .in("id", reqIds);
      requestMap = new Map((reqs || []).map((r: any) => [r.id, r]));
    }

    // Fetch partner profile if partner
    let partnerProfile: any = null;
    let commissionRate = 20;
    if (!isAdmin) {
      const { data: profile } = await db
        .from("partner_profiles")
        .select("company_name, phone, commission_rate, default_currency, service_radius_km, base_city")
        .eq("user_id", user.id)
        .maybeSingle();
      partnerProfile = profile;
      commissionRate = profile?.commission_rate ?? 20;
    }

    const bookingContext = rows.length === 0
      ? `This ${userLabel.toLowerCase()} has no bookings yet.`
      : rows.map((b: any) => {
          const req = requestMap.get(b.request_id);
          const rate = b.commission_rate ?? commissionRate;
          const lines = [
            `--- Job #${b.job_number || b.id.slice(0, 8)} ---`,
            `Status: ${bookingStatusReadable(b.booking_status)}`,
            `Pickup: ${req?.pickup_address || "unknown"}`,
            `Drop-off: ${req?.dropoff_address || "unknown"}`,
            `Pickup time: ${fmt(req?.pickup_at)}`,
            `Customer: ${req?.customer_name || "unknown"}`,
            `Customer phone: ${req?.customer_phone || "not available"}`,
            `Car hire: ${b.car_hire_price} ${b.currency}`,
            `Fuel deposit: ${b.fuel_price} ${b.currency}`,
            `Total: ${b.amount} ${b.currency}`,
            `Commission rate: ${rate}%`,
            `Commission amount: ${b.commission_amount ?? "not yet calculated"} ${b.currency}`,
            `Your payout: ${b.partner_payout_amount ?? "not yet calculated"} ${b.currency}`,
            `Driver: ${b.driver_name || "not assigned"}`,
            `Driver phone: ${b.driver_phone || "not assigned"}`,
          ];
          if (b.fuel_charge != null) lines.push(`Fuel charge: ${b.fuel_charge} ${b.currency}`);
          if (b.fuel_refund != null) lines.push(`Fuel refund: ${b.fuel_refund} ${b.currency}`);
          return lines.join("\n");
        }).join("\n\n");

    const partnerContext = partnerProfile ? `
== PARTNER PROFILE ==
Company: ${partnerProfile.company_name || "not set"}
Commission rate: ${partnerProfile.commission_rate ?? 20}%
Default currency: ${partnerProfile.default_currency || "EUR"}
Service radius: ${partnerProfile.service_radius_km || "not set"} km
Base city: ${partnerProfile.base_city || "not set"}
` : "";

    const systemPrompt = `You are Camel Help, the AI assistant for Camel Global — a meet & greet car hire platform.

You are talking to a ${userLabel}${partnerProfile ? ` — ${partnerProfile.company_name || "unknown company"}` : ""}.

TODAY'S DATE/TIME: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/Madrid" })} (Spain time)

== HOW CAMEL GLOBAL WORKS (PARTNER/ADMIN VIEW) ==
- Customers submit hire requests. Partners submit bids. Customer accepts a bid, creating a confirmed booking.
- The partner assigns a driver who delivers the car to the customer (meet & greet).
- At delivery: driver records fuel level and hands over insurance documents.
- At collection: driver records return fuel level. Fuel charge or refund is calculated per quarter tank vs the full-tank deposit.
- Commission: Camel Global earns a commission (default 20%, may be reduced by agreement). Commission is calculated on the car hire price only — fuel passes through 100% to the partner. Minimum commission is €10.
- Partners are paid their payout amount (car hire price minus commission) plus the full fuel amount.
- Partners must be "live" to receive requests: they need a fleet base address, GPS coordinates, service radius, at least one active vehicle, one active driver, billing currency set, and VAT/NIF number set.

== CANCELLATION POLICY ==
- If the PARTNER cancels: customer receives a full refund.
- If the CUSTOMER cancels more than 48 hours before pickup: full refund.
- If the CUSTOMER cancels within 48 hours: car hire is NOT refunded, but fuel deposit IS refunded.

== WHAT YOU CAN AND CANNOT DO ==
- You CAN explain bookings, statuses, payout calculations, commission, and platform rules.
- You CAN share booking details from the data below.
- You CANNOT modify bookings, process payments, or override admin decisions.
- For account or technical issues, advise contacting contact@camel-global.com or the admin team via the portal.
${partnerContext}
== BOOKING DATA ==
${bookingContext}

Be concise and professional. Only share data from the booking data above — never invent figures.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed?.delta?.text || "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch { /* skip */ }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}