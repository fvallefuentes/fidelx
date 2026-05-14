"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  User,
  Stamp,
  Megaphone,
  ArrowRight,
  LayoutDashboard,
  Users as UsersIcon,
  BarChart2,
  Settings,
  ScanLine,
  QrCode,
  Bell,
} from "lucide-react";

/**
 * Command palette globale (Ctrl/Cmd + K).
 * - Recherche en parallèle clients, programmes, campagnes
 * - Quick nav vers les pages du dashboard
 * - Navigation clavier ↑ ↓ Enter / Escape
 * - Debounce 200ms sur la recherche
 */

type ClientHit = {
  id: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  serialNumber: string;
  programName: string;
};
type ProgramHit = { id: string; name: string; type: string };
type CampaignHit = { id: string; name: string; message: string; status: string };

type SearchResult = {
  clients: ClientHit[];
  programs: ProgramHit[];
  campaigns: CampaignHit[];
};

type NavItem = {
  key: "dashboard" | "clients" | "programs" | "campaigns" | "scan" | "qrcode" | "stats" | "settings";
  href: string;
  icon: typeof LayoutDashboard;
  keywords: string[];
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["dashboard", "accueil", "home"] },
  { key: "clients", href: "/dashboard/clients", icon: UsersIcon, keywords: ["clients", "customers", "kunden", "cartes"] },
  { key: "programs", href: "/dashboard/programs", icon: Stamp, keywords: ["programmes", "programs", "programme", "fidélité"] },
  { key: "campaigns", href: "/dashboard/campaigns", icon: Megaphone, keywords: ["campagnes", "campaigns", "kampagnen", "notifications"] },
  { key: "scan", href: "/dashboard/scan", icon: ScanLine, keywords: ["scan", "scanner", "qr"] },
  { key: "qrcode", href: "/dashboard/qrcode", icon: QrCode, keywords: ["qr", "qrcode"] },
  { key: "stats", href: "/dashboard/stats", icon: BarChart2, keywords: ["stats", "statistiques", "statistics", "berichte"] },
  { key: "settings", href: "/dashboard/settings", icon: Settings, keywords: ["paramètres", "settings", "einstellungen", "compte"] },
];

export function CommandPalette() {
  const router = useRouter();
  const t = useTranslations("Dashboard.commandPalette");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    clients: [],
    programs: [],
    campaigns: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open/close on Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced search
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults({ clients: [], programs: [], campaigns: [] });
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/merchants/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data: SearchResult = await res.json();
          setResults(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Filtre nav local
  const navMatches = query.trim()
    ? NAV_ITEMS.filter(
        (n) =>
          t(`items.${n.key}`).toLowerCase().includes(query.toLowerCase()) ||
          n.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      )
    : NAV_ITEMS;

  // Flatten all items for keyboard navigation
  type FlatItem = {
    type: "nav" | "client" | "program" | "campaign";
    id: string;
    onSelect: () => void;
    node: React.ReactNode;
  };

  const flatItems: FlatItem[] = [];

  // Nav (when query empty, show all; when query, show filtered)
  if (query.trim().length === 0 || navMatches.length > 0) {
    navMatches.forEach((n) => {
      const Icon = n.icon;
      flatItems.push({
        type: "nav",
        id: `nav-${n.href}`,
        onSelect: () => {
          router.push(n.href);
          setOpen(false);
        },
        node: (
          <>
            <span className="cp-item-icon">
              <Icon size={14} />
            </span>
            <div className="cp-item-body">
              <div className="cp-item-title">{t(`items.${n.key}`)}</div>
              <div className="cp-item-sub">{t("quickNav")}</div>
            </div>
            <span className="cp-item-arrow">
              <ArrowRight size={12} />
            </span>
          </>
        ),
      });
    });
  }

  results.clients.forEach((c) => {
    flatItems.push({
      type: "client",
      id: `client-${c.id}`,
      onSelect: () => {
        router.push(`/dashboard/clients/${c.id}`);
        setOpen(false);
      },
      node: (
        <>
          <span className="cp-item-icon" style={{ background: "rgba(212,255,78,0.1)" }}>
            <User size={14} style={{ color: "#d4ff4e" }} />
          </span>
          <div className="cp-item-body">
            <div className="cp-item-title">{c.firstName}</div>
            <div className="cp-item-sub">
              {c.email || c.phone || c.serialNumber} · {c.programName}
            </div>
          </div>
          <span className="cp-item-arrow">
            <ArrowRight size={12} />
          </span>
        </>
      ),
    });
  });

  results.programs.forEach((p) => {
    flatItems.push({
      type: "program",
      id: `program-${p.id}`,
      onSelect: () => {
        router.push(`/dashboard/programs`);
        setOpen(false);
      },
      node: (
        <>
          <span className="cp-item-icon">
            <Stamp size={14} />
          </span>
          <div className="cp-item-body">
            <div className="cp-item-title">{p.name}</div>
            <div className="cp-item-sub">{t("program")} · {p.type}</div>
          </div>
          <span className="cp-item-arrow">
            <ArrowRight size={12} />
          </span>
        </>
      ),
    });
  });

  results.campaigns.forEach((c) => {
    flatItems.push({
      type: "campaign",
      id: `campaign-${c.id}`,
      onSelect: () => {
        router.push(`/dashboard/campaigns`);
        setOpen(false);
      },
      node: (
        <>
          <span className="cp-item-icon">
            <Megaphone size={14} />
          </span>
          <div className="cp-item-body">
            <div className="cp-item-title">{c.name}</div>
            <div className="cp-item-sub">{c.message}</div>
          </div>
          <span className="cp-item-arrow">
            <ArrowRight size={12} />
          </span>
        </>
      ),
    });
  });

  // Reset selected index if results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(flatItems.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item) item.onSelect();
      }
    },
    [flatItems, selectedIndex]
  );

  if (!open) return null;

  const hasQuery = query.trim().length >= 2;
  const hasResults =
    results.clients.length +
      results.programs.length +
      results.campaigns.length >
    0;

  return (
    <div
      className="cp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t("globalSearch")}
      onClick={() => setOpen(false)}
    >
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-input-row">
          <Search size={16} className="cp-input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="cp-input"
            autoComplete="off"
          />
          <kbd className="cp-kbd">ESC</kbd>
        </div>

        <div className="cp-list">
          {/* Empty state with quick nav */}
          {!hasQuery && (
            <>
              <div className="cp-section-title">{t("navigation")}</div>
              {flatItems
                .filter((i) => i.type === "nav")
                .map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`cp-item${i === selectedIndex ? " selected" : ""}`}
                  >
                    {item.node}
                  </button>
                ))}
            </>
          )}

          {/* With query */}
          {hasQuery && (
            <>
              {navMatches.length > 0 && (
                <>
                  <div className="cp-section-title">{t("navigation")}</div>
                  {flatItems
                    .filter((i) => i.type === "nav")
                    .map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`cp-item${globalIndex === selectedIndex ? " selected" : ""}`}
                        >
                          {item.node}
                        </button>
                      );
                    })}
                </>
              )}

              {results.clients.length > 0 && (
                <>
                  <div className="cp-section-title">
                    {t("items.clients")} ({results.clients.length})
                  </div>
                  {flatItems
                    .filter((i) => i.type === "client")
                    .map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`cp-item${globalIndex === selectedIndex ? " selected" : ""}`}
                        >
                          {item.node}
                        </button>
                      );
                    })}
                </>
              )}

              {results.programs.length > 0 && (
                <>
                  <div className="cp-section-title">
                    {t("items.programs")} ({results.programs.length})
                  </div>
                  {flatItems
                    .filter((i) => i.type === "program")
                    .map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`cp-item${globalIndex === selectedIndex ? " selected" : ""}`}
                        >
                          {item.node}
                        </button>
                      );
                    })}
                </>
              )}

              {results.campaigns.length > 0 && (
                <>
                  <div className="cp-section-title">
                    {t("items.campaigns")} ({results.campaigns.length})
                  </div>
                  {flatItems
                    .filter((i) => i.type === "campaign")
                    .map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`cp-item${globalIndex === selectedIndex ? " selected" : ""}`}
                        >
                          {item.node}
                        </button>
                      );
                    })}
                </>
              )}

              {!loading && !hasResults && navMatches.length === 0 && (
                <div className="cp-empty">
                  <Bell size={20} />
                  <p>{t("noResult")}</p>
                  <span>{t("tryAnother")}</span>
                </div>
              )}

              {loading && (
                <div className="cp-loading">
                  {t("searching")}
                </div>
              )}
            </>
          )}
        </div>

        <div className="cp-footer">
          <span>
            <kbd className="cp-kbd-sm">↑</kbd>
            <kbd className="cp-kbd-sm">↓</kbd>
            {t("navigate")}
          </span>
          <span>
            <kbd className="cp-kbd-sm">↵</kbd>
            {t("open")}
          </span>
          <span>
            <kbd className="cp-kbd-sm">esc</kbd>
            {t("close")}
          </span>
        </div>
      </div>
    </div>
  );
}
