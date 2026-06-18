"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Bell,
  Bot,
  QrCode,
  ScanLine,
  Settings,
  LogOut,
  X,
  BarChart2,
  Gift,
  Star,
} from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";

const navigation = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { key: "program", href: "/dashboard/programs", icon: CreditCard },
  { key: "scan", href: "/dashboard/scan", icon: ScanLine },
  { key: "clients", href: "/dashboard/clients", icon: Users },
  { key: "stats", href: "/dashboard/stats", icon: BarChart2 },
  { key: "assistant", href: "/dashboard/assistant", icon: Bot },
  { key: "campaigns", href: "/dashboard/campaigns", icon: Bell },
  { key: "reviews", href: "/dashboard/avis", icon: Star },
  { key: "qrcode", href: "/dashboard/qrcode", icon: QrCode },
  { key: "referral", href: "/dashboard/parrainage", icon: Gift },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("Dashboard.sidebar");
  const role = (session?.user as { role?: string })?.role ?? "USER";

  const visibleNav = navigation.filter(item => {
    if (role === "STAFF") return item.href === "/dashboard/scan";
    return true;
  });

  return (
    <aside className={`dx-sidebar${mobileOpen ? " mobile-open" : ""}`}>
      {/* Brand row + close button (mobile only) */}
      <div className="dx-sidebar-top">
        <Link href="/" className="dx-brand" onClick={onCloseMobile}>
          <LogoMark size={36} />
          <span>FIDLIFY</span>
        </Link>
        <button
          type="button"
          className="dx-sidebar-close"
          aria-label={t("closeMenu")}
          onClick={onCloseMobile}
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="dx-nav">
        {visibleNav.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onCloseMobile}
              className={`dx-nav-item${isActive ? " active" : ""}`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{t(`items.${item.key}`)}</span>
              {isActive && <span className="dx-nav-tick" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="dx-sidebar-foot">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="dx-nav-item dx-logout"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>{t("logout")}</span>
        </button>
      </div>
    </aside>
  );
}
