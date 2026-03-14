"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalRole = "partner" | "admin" | "super_admin";

type PortalSidebarProps = {
  role: PortalRole;
  open?: boolean;
  onClose?: () => void;
};

type NavItem = {
  href: string;
  label: string;
  roles: PortalRole[];
};

const navItems: NavItem[] = [
  {
    href: "/admin/approvals",
    label: "Partner Approvals",
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/users",
    label: "Admin Users",
    roles: ["super_admin"],
  },
  {
    href: "/partner/requests",
    label: "Requests",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/bookings",
    label: "Bookings",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/account",
    label: "Account Management",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/reports",
    label: "Report Management",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/profile",
    label: "Edit Profile",
    roles: ["partner", "admin", "super_admin"],
  },
];

export default function PortalSidebar({
  role,
  open = false,
  onClose,
}: PortalSidebarProps) {
  const pathname = usePathname();

  const items = navItems.filter((item) => item.roles.includes(role));

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
      />

      <aside
        className={[
          "fixed left-0 top-20 z-50 flex h-[calc(100vh-5rem)] w-[290px] flex-col border-r border-white/10 bg-[#123f79] text-white transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="border-b border-white/10 px-6 py-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
            Camel Global
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Partner Portal</h2>
          <p className="mt-4 text-sm text-white/80">
            Operations dashboard
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <p className="px-4 text-xs font-bold uppercase tracking-[0.25em] text-white/55">
            Navigation
          </p>

          <nav className="mt-4 space-y-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  "block rounded-2xl px-4 py-4 text-base font-semibold transition",
                  isActive(item.href)
                    ? "bg-white text-[#123f79]"
                    : "text-white hover:bg-white/10",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}