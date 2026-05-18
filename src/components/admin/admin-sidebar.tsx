"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Shield,
  Settings,
  LogOut,
  X,
  ScrollText,
  Mail,
  ShieldCheck,
} from "lucide-react";
import LogoMark from "@/components/landing/LogoMark";

const navigation = [
  { name: "Tableau de bord", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Utilisateurs", href: "/admin/users", icon: Users },
  { name: "Statistiques", href: "/admin/stats", icon: BarChart2 },
  { name: "Anti-abus", href: "/admin/abuse", icon: Shield },
  { name: "Audit", href: "/admin/audit", icon: ScrollText },
  { name: "Newsletter", href: "/admin/newsletter", icon: Mail },
  { name: "Sécurité 2FA", href: "/admin/security", icon: ShieldCheck },
  { name: "Paramètres", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`dx-sidebar${mobileOpen ? " mobile-open" : ""}`}>
      <div className="dx-sidebar-top">
        <Link href="/admin" className="dx-brand" onClick={onCloseMobile}>
          <LogoMark size={36} />
          <span>
            FIDLIFY{" "}
            <span
              style={{
                color: "#d4ff4e",
                fontSize: 11,
                marginLeft: 4,
                letterSpacing: "0.1em",
              }}
            >
              ADMIN
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="dx-sidebar-close"
          aria-label="Fermer le menu"
          onClick={onCloseMobile}
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      <nav className="dx-nav">
        {navigation.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={`dx-nav-item${isActive ? " active" : ""}`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.name}</span>
              {isActive && <span className="dx-nav-tick" />}
            </Link>
          );
        })}
      </nav>

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
