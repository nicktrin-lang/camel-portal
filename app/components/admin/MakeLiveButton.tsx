"use client";

import { useState } from "react";

type MakeLiveButtonProps = {
  applicationId: string;
  onDone?: () => void;
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

export default function MakeLiveButton({
  applicationId,
  onDone,
}: MakeLiveButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleMakeLive() {
    const ok = window.confirm(
      "Make this partner account live and send the live email?"
    );

    if (!ok) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/applications/make-live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to make account live.");
      }

      if (json?.warning) {
        alert(`Account made live, but email warning:\n\n${json.warning}`);
      } else if (json?.message) {
        alert(json.message);
      } else {
        alert("Partner account is now live.");
      }

      onDone?.();
    } catch (e: any) {
      alert(e?.message || "Failed to make account live.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleMakeLive}
      disabled={loading}
      className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
    >
      {loading ? "Making live..." : "Make Live"}
    </button>
  );
}