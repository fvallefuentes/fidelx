"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Bell,
  QrCode,
  Settings,
  LogOut,
} from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { name: "Programme", href: "/dashboard/programs", icon: CreditCard },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Campagnes", href: "/dashboard/campaigns", icon: Bell },
  { name: "QR Code", href: "/dashboard/qrcode", icon: QrCode },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="dx-sidebar">
      {/* Brand */}
      <Link href="/" className="dx-brand">
        <LogoMark size={36} />
        <span>FIDLIFY</span>
      </Link>

      {/* Navigation */}
      <nav className="dx-nav">
        {navigation.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`dx-nav-item${isActive ? " active" : ""}`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.name}</span>
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
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
