"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalRole = "partner" | "admin" | "super_admin";

type Props = {
  role: PortalRole;
  open: boolean;
  onClose: () => void;
};

const partnerNavItems = [
  { href: "/partner/dashboard",   label: "Dashboard" },
  { href: "/partner/account",     label: "Account Management" },
  { href: "/partner/requests",    label: "Requests" },
  { href: "/partner/bookings",    label: "Bookings" },
  { href: "/partner/reports",     label: "Report Management" },
  { href: "/partner/drivers",     label: "Drivers" },
  { href: "/partner/fleet",       label: "Car Fleet" },
  { href: "/partner/reviews",     label: "Reviews" },
  { href: "/partner/settings",    label: "Settings" },
  { href: "/partner/suggestions", label: "Suggestions" },
];

function getAdminNavItems(role: PortalRole) {
  const items = [
    { href: "/admin/accounts",    label: "Account Management" },
    { href: "/admin/approvals",   label: "Partner Approvals" },
    { href: "/admin/requests",    label: "Requests" },
    { href: "/admin/bookings",    label: "Bookings" },
    { href: "/admin/reviews",     label: "Review Moderation" },
    { href: "/admin/reports",     label: "Report Management" },
    { href: "/admin/suggestions", label: "Suggestions" },
    { href: "/admin/outreach",    label: "Partner Outreach" },
  ];
  if (role === "super_admin") items.push({ href: "/admin/users", label: "Admin Users" });
  return items;
}

function isActive(pathname: string, href: string) {
  if (href === "/partner/dashboard") return pathname === "/partner/dashboard";
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalSidebar({ role, open, onClose }: Props) {
  const pathname  = usePathname() || "";
  const isPartner = role === "partner";
  const navItems  = isPartner ? partnerNavItems : getAdminNavItems(role);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside className={[
        "fixed left-0 z-40 w-[290px]",
        "bg-black border-r border-white/10 text-white",
        "transform transition-transform duration-300 ease-in-out",
        "top-[76px] h-[calc(100vh-76px)]",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
      ].join(" ")}>
        <div className="flex h-full flex-col overflow-y-auto">

          {/* Portal label */}
          <div className="border-b border-white/10 px-6 pt-7 pb-5">
            <Link
              href={isPartner ? "/partner/dashboard" : "/admin/approvals"}
              onClick={onClose}
              className="block"
            >
              <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">Camel Global</p>
              <p className="mt-1 text-xl font-black text-white">
                {isPartner ? "Partner Portal" : "Admin Portal"}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/40 uppercase tracking-widest">Operations dashboard</p>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-5">
            <p className="mb-3 px-3 text-xs font-black uppercase tracking-widest text-white/30">Navigation</p>
            <div className="space-y-0.5">
              {navItems.map(item => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={[
                      "block px-4 py-3 text-sm font-black transition-colors",
                      active
                        ? "bg-[#ff7a00] text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

        </div>
      </aside>
    </>
  );
}