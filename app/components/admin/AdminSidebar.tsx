"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/accounts", label: "Account Management" },
  { href: "/admin/approvals", label: "Partner Approvals" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/reports", label: "Report Management" },
  { href: "/admin/users", label: "Admin Users" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ open, onClose }: Props) {
  const pathname = usePathname() || "";

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
          "top-[80px] h-[calc(100vh-80px)]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="border-b border-white/10 px-6 pt-8 pb-6">
            <Link href="/admin" onClick={onClose} className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Camel Global
              </div>

              <div className="mt-2 text-2xl font-semibold">
                Admin Portal
              </div>

              <div className="mt-3 text-sm text-white/75">
                System administration
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Administration
            </div>

            <div className="space-y-2">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);

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
        </div>
      </aside>
    </>
  );
}