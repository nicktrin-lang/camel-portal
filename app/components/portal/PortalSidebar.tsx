"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
};

const navItems = [
  { href: "/partner/account", label: "Account Management" },
  { href: "/partner/bookings", label: "Bookings" },
  { href: "/partner/drivers", label: "Drivers" },
  { href: "/partner/fleet", label: "Car Fleet" },
  { href: "/partner/reports", label: "Report Management" },
  { href: "/partner/requests", label: "Requests" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalSidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={[
          "fixed left-0 z-40 w-[290px] border-r border-white/10",
          "bg-gradient-to-b from-[#003768] to-[#005b9f] text-white shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          "top-[105px] h-[calc(100vh-105px)] md:top-[115px] md:h-[calc(100vh-115px)]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="border-b border-white/10 px-6 pb-6 pt-8">
            <Link href="/partner/dashboard" onClick={onClose} className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Camel Global
              </div>

              <div className="mt-2 text-2xl font-semibold">Partner Portal</div>

              <div className="mt-3 text-sm text-white/75">
                Operations dashboard
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Navigation
            </div>

            <div className="space-y-2">
              {navItems.map((item) => {
                const active = isActive(pathname || "", item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={[
                      "block rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      active
                        ? "bg-white text-[#003768] shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                        : "text-white/90 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 px-5 py-5">
            <Link
              href="/partner/profile"
              onClick={onClose}
              className="block rounded-2xl bg-[#ff7a00] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}