"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalRole = "partner" | "admin" | "super_admin";

type Props = {
  role: PortalRole;
  open: boolean;
  onClose: () => void;
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
    href: "/admin/accounts",
    label: "Account Management",
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/users",
    label: "Admin Users",
    roles: ["super_admin"], // 🔥 FIXED
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
    href: "/partner/fleet",
    label: "Car Fleet",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/account",
    label: "Account Management",
    roles: ["partner"], // 🔥 IMPORTANT (partner only)
  },
  {
    href: "/partner/reports",
    label: "Report Management",
    roles: ["partner", "admin", "super_admin"],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalSidebar({ role, open, onClose }: Props) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {open ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={[
          "fixed left-0 z-40 w-[290px] border-r border-white/10",
          "bg-gradient-to-b from-[#003768] to-[#005b9f] text-white shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          "top-20 h-[calc(100vh-80px)]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="border-b border-white/10 px-6 pt-8 pb-6">
            <Link href="/partner/dashboard" onClick={onClose}>
              <div className="text-xs uppercase text-white/70">
                Camel Global
              </div>

              <div className="mt-2 text-2xl font-semibold">
                {role === "partner"
                  ? "Partner Portal"
                  : "Admin Portal"}
              </div>

              <div className="mt-2 text-sm text-white/70">
                {role === "partner"
                  ? "Operations dashboard"
                  : "System administration"}
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="mb-3 px-3 text-xs uppercase text-white/50">
              Navigation
            </div>

            <div className="space-y-2">
              {visibleItems.map((item) => {
                const active = isActive(pathname || "", item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={[
                      "block rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      active
                        ? "bg-white text-[#003768]"
                        : "text-white/90 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {role === "partner" && (
            <div className="border-t border-white/10 px-5 py-5">
              <Link
                href="/partner/profile"
                onClick={onClose}
                className="block rounded-2xl bg-[#ff7a00] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Edit Profile
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}