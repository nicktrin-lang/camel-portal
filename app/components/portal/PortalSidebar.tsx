"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";

export type PortalRole = "partner" | "admin" | "super_admin";

type Props = {
  role: PortalRole;
  open: boolean;
  onClose: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/partner/dashboard") return pathname === "/partner/dashboard";
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalSidebar({ role, open, onClose }: Props) {
  const { t }     = useTranslation();
  const pathname  = usePathname() || "";
  const isPartner = role === "partner";

  const partnerNavItems = [
    { href: "/partner/dashboard",   label: t("nav.dashboard") },
    { href: "/partner/account",     label: t("nav.accountManagement") },
    { href: "/partner/requests",    label: t("nav.requests") },
    { href: "/partner/bookings",    label: t("nav.bookings") },
    { href: "/partner/reports",     label: t("nav.reportManagement") },
    { href: "/partner/drivers",     label: t("nav.drivers") },
    { href: "/partner/fleet",       label: t("nav.carFleet") },
    { href: "/partner/reviews",     label: t("nav.reviews") },
    { href: "/partner/settings",    label: t("nav.settings") },
    { href: "/partner/suggestions", label: t("nav.suggestions") },
  ];

  const adminNavItems = [
    { href: "/admin/accounts",    label: t("nav.accountManagement") },
    { href: "/admin/approvals",   label: t("nav.partnerApprovals") },
    { href: "/admin/requests",    label: t("nav.requests") },
    { href: "/admin/bookings",    label: t("nav.bookings") },
    { href: "/admin/reviews",     label: t("nav.reviewModeration") },
    { href: "/admin/reports",     label: t("nav.reportManagement") },
    { href: "/admin/suggestions", label: t("nav.suggestions") },
    { href: "/admin/outreach",    label: t("nav.partnerOutreach") },
    ...(role === "super_admin" ? [{ href: "/admin/users", label: t("nav.adminUsers") }] : []),
  ];

  const navItems = isPartner ? partnerNavItems : adminNavItems;

  return (
    <>
      {open && (
        <button type="button" aria-label={t("common.closeSidebar")} onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden" />
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
          <div className="border-b border-white/10 px-6 pt-7 pb-5">
            <Link href={isPartner ? "/partner/dashboard" : "/admin/approvals"} onClick={onClose} className="block">
              <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">{t("nav.camelGlobal")}</p>
              <p className="mt-1 text-xl font-black text-white">
                {isPartner ? t("nav.partnerPortal") : t("nav.adminPortal")}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/40 uppercase tracking-widest">{t("nav.operationsDashboard")}</p>
            </Link>
          </div>
          <nav className="flex-1 px-4 py-5">
            <p className="mb-3 px-3 text-xs font-black uppercase tracking-widest text-white/30">{t("nav.navigation")}</p>
            <div className="space-y-0.5">
              {navItems.map(item => {
                const active = isActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={["block px-4 py-3 text-sm font-black transition-colors",
                      active ? "bg-[#ff7a00] text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                    ].join(" ")}>
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