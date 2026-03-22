export type TriggerPartnerLiveRefreshResult = {
  ok?: boolean;
  userId?: string;
  becameLive?: boolean;
  alreadyLive?: boolean;
  missing?: string[];
  error?: string;
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export async function triggerPartnerLiveRefresh(
  userId?: string
): Promise<TriggerPartnerLiveRefreshResult> {
  try {
    const res = await fetch("/api/partner/refresh-live-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(userId ? { userId } : {}),
    });

    const json = await safeJson(res);

    if (!res.ok) {
      return {
        error: json?.error || json?._raw || "Failed to refresh partner live status.",
      };
    }

    return {
      ok: !!json?.ok,
      userId: json?.userId,
      becameLive: !!json?.becameLive,
      alreadyLive: !!json?.alreadyLive,
      missing: Array.isArray(json?.missing) ? json.missing : [],
    };
  } catch (e: any) {
    return {
      error: e?.message || "Failed to refresh partner live status.",
    };
  }
}