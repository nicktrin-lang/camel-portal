"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/approvals");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#e3f4ff] pt-20">
      <div className="px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}