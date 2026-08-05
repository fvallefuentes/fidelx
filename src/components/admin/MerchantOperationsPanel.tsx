"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  BarChart3,
  Check,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Gift,
  Loader2,
  Megaphone,
  QrCode,
  RefreshCw,
  Search,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import QRCode from "qrcode";

type TabKey = "overview" | "programs" | "clients" | "cards" | "campaigns" | "qr";

type Platform = "APPLE" | "GOOGLE";

type Program = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  establishment: { id: string; name: string } | null;
  _count: { cards: number; campaigns: number; rewards: number };
};

type CardRow = {
  id: string;
  serialNumber: string;
  status: string;
  currentStamps: number;
  currentPoints: number;
  cashbackBalance: number;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  program: { id: string; name: string; type: string };
  registrations: { platform: Platform }[];
};

type ClientRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  preferredLang: string;
  createdAt: string;
  cards: {
    id: string;
    status: string;
    totalVisits: number;
    totalSpent: number;
    lastVisitAt: string | null;
    program: { id: string; name: string };
    registrations: { platform: Platform }[];
  }[];
};

type CampaignRow = {
  id: string;
  name: string;
  message: string;
  status: string;
  triggerType: string;
  targetSegment: string;
  sentCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  program: { id: string; name: string } | null;
  _count: { logs: number };
  delivery: Record<string, number>;
};

type CommerceData = {
  merchant: { id: string; name: string | null; email: string; role: string };
  generatedAt: string;
  limits: { cards: number; clients: number; campaigns: number };
  summary: {
    clientCount: number;
    cardCount: number;
    walletCardCount: number;
    totalVisits: number;
    totalSpent: number;
    transactionCount: number;
    rewardCount: number;
    campaignCount: number;
    deliveredNotifications: number;
    notificationTotal: number;
    cardsLast30: number;
    transactionsLast30: number;
    campaignsLast30: number;
  };
  programs: Program[];
  cards: CardRow[];
  clients: ClientRow[];
  campaigns: CampaignRow[];
};

const TABS: Array<{ key: TabKey; label: string; icon: ElementType }> = [
  { key: "overview", label: "Vue d'ensemble", icon: BarChart3 },
  { key: "programs", label: "Programmes", icon: Store },
  { key: "clients", label: "Clients", icon: Users },
  { key: "cards", label: "Cartes", icon: CreditCard },
  { key: "campaigns", label: "Campagnes", icon: Megaphone },
  { key: "qr", label: "QR codes", icon: QrCode },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "En attente",
  COMPLETED: "Complétée",
  EXPIRED: "Expirée",
  REVOKED: "Révoquée",
  REWARD_PENDING: "Récompense",
  DRAFT: "Brouillon",
  SCHEDULED: "Programmée",
  SENDING: "En cours",
  SENT: "Envoyée",
  FAILED: "Échec",
  CANCELLED: "Annulée",
};

export function MerchantOperationsPanel({ merchantId }: { merchantId: string }) {
  const [data, setData] = useState<CommerceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("overview");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/users/${merchantId}/commerce`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Erreur de chargement");
        return body as CommerceData;
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Erreur de chargement");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [merchantId, refreshKey]);

  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const filteredCards = useMemo(
    () =>
      data?.cards.filter((card) =>
        [
          card.serialNumber,
          card.program.name,
          card.client.firstName,
          card.client.lastName,
          card.client.email,
          card.client.phone,
          card.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("fr").includes(normalizedQuery))
      ) ?? [],
    [data, normalizedQuery]
  );
  const filteredClients = useMemo(
    () =>
      data?.clients.filter((client) =>
        [
          client.firstName,
          client.lastName,
          client.email,
          client.phone,
          ...client.cards.map((card) => card.program.name),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("fr").includes(normalizedQuery))
      ) ?? [],
    [data, normalizedQuery]
  );
  const filteredCampaigns = useMemo(
    () =>
      data?.campaigns.filter((campaign) =>
        [campaign.name, campaign.message, campaign.program?.name, campaign.status]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("fr").includes(normalizedQuery))
      ) ?? [],
    [data, normalizedQuery]
  );

  return (
    <section className="merchant-ops">
      <div className="merchant-ops-head">
        <div>
          <p className="merchant-ops-kicker">Pilotage commerçant</p>
          <h2>Activité et données opérationnelles</h2>
          <p>Programmes, clientèle, cartes Wallet, campagnes et liens d&apos;inscription.</p>
        </div>
        <button
          type="button"
          className="merchant-ops-refresh"
          onClick={() => {
            setLoading(true);
            setError("");
            setRefreshKey((value) => value + 1);
          }}
          disabled={loading}
          title="Actualiser les données"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
          Actualiser
        </button>
      </div>

      <div className="merchant-ops-tabs" role="tablist" aria-label="Données commerçant">
        {TABS.map((item) => {
          const Icon = item.icon;
          const count = data ? getTabCount(item.key, data) : null;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "active" : undefined}
              onClick={() => {
                setTab(item.key);
                setQuery("");
              }}
            >
              <Icon size={14} />
              {item.label}
              {count !== null && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      {loading && !data ? (
        <div className="merchant-ops-state"><Loader2 size={20} className="animate-spin" /> Chargement…</div>
      ) : error ? (
        <div className="merchant-ops-state error">{error}</div>
      ) : data ? (
        <>
          {(tab === "clients" || tab === "cards" || tab === "campaigns") && (
            <div className="merchant-ops-toolbar">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Rechercher dans ${tab === "clients" ? "les clients" : tab === "cards" ? "les cartes" : "les campagnes"}…`}
              />
              <span>100 plus récents maximum</span>
            </div>
          )}

          {tab === "overview" && <Overview data={data} />}
          {tab === "programs" && <ProgramsTable programs={data.programs} />}
          {tab === "clients" && <ClientsTable clients={filteredClients} total={data.summary.clientCount} />}
          {tab === "cards" && <CardsTable cards={filteredCards} total={data.summary.cardCount} />}
          {tab === "campaigns" && <CampaignsTable campaigns={filteredCampaigns} total={data.summary.campaignCount} />}
          {tab === "qr" && <QrWorkspace merchantId={merchantId} programs={data.programs} />}
        </>
      ) : null}
    </section>
  );
}

function Overview({ data }: { data: CommerceData }) {
  const deliveryRate = data.summary.notificationTotal
    ? Math.round((data.summary.deliveredNotifications / data.summary.notificationTotal) * 100)
    : 0;
  const walletRate = data.summary.cardCount
    ? Math.round((data.summary.walletCardCount / data.summary.cardCount) * 100)
    : 0;
  const metrics = [
    { label: "Clients uniques", value: data.summary.clientCount, sub: `+${data.summary.cardsLast30} cartes en 30 j`, icon: Users },
    { label: "Cartes émises", value: data.summary.cardCount, sub: `${data.summary.walletCardCount} dans un Wallet`, icon: CreditCard },
    { label: "Installation Wallet", value: `${walletRate}%`, sub: "Apple ou Google enregistré", icon: Wallet },
    { label: "Visites cumulées", value: data.summary.totalVisits, sub: `${data.summary.transactionsLast30} actions en 30 j`, icon: Activity },
    { label: "Montant renseigné", value: formatMoney(data.summary.totalSpent), sub: "Somme des cartes", icon: BarChart3 },
    { label: "Récompenses", value: data.summary.rewardCount, sub: "Réclamations enregistrées", icon: Gift },
    { label: "Campagnes", value: data.summary.campaignCount, sub: `+${data.summary.campaignsLast30} en 30 j`, icon: Megaphone },
    { label: "Délivrabilité", value: `${deliveryRate}%`, sub: `${data.summary.deliveredNotifications}/${data.summary.notificationTotal} confirmations`, icon: Check },
  ];

  return (
    <div className="merchant-ops-overview">
      <div className="merchant-ops-metrics">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </div>
      <div className="merchant-ops-summary-row">
        <div><strong>{data.programs.filter((program) => program.isActive).length}</strong><span>programmes actifs</span></div>
        <div><strong>{data.summary.transactionCount}</strong><span>scans et gains cumulés</span></div>
        <div><strong>{formatDateTime(data.generatedAt)}</strong><span>dernière actualisation</span></div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub: string; icon: ElementType }) {
  return (
    <div className="merchant-ops-metric">
      <div><span>{label}</span><Icon size={15} /></div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </div>
  );
}

function ProgramsTable({ programs }: { programs: Program[] }) {
  if (programs.length === 0) return <EmptyState icon={Store} label="Aucun programme créé." />;
  return (
    <TableWrap>
      <table><thead><tr><th>Programme</th><th>Établissement</th><th>Type</th><th>Cartes</th><th>Campagnes</th><th>Récompenses</th><th>Statut</th><th /></tr></thead>
        <tbody>{programs.map((program) => (
          <tr key={program.id}>
            <td><strong>{program.name}</strong><small>Créé le {formatDate(program.createdAt)}</small></td>
            <td>{program.establishment?.name || "Non assigné"}</td>
            <td><StatusBadge value={program.type} /></td>
            <td>{program._count.cards}</td><td>{program._count.campaigns}</td><td>{program._count.rewards}</td>
            <td><StatusBadge value={program.isActive ? "ACTIVE" : "EXPIRED"} /></td>
            <td><a className="merchant-ops-icon-link" href={`/join/${program.id}`} target="_blank" rel="noreferrer" title="Ouvrir la page d'inscription"><ExternalLink size={14} /></a></td>
          </tr>
        ))}</tbody>
      </table>
    </TableWrap>
  );
}

function ClientsTable({ clients, total }: { clients: ClientRow[]; total: number }) {
  if (clients.length === 0) return <EmptyState icon={Users} label="Aucun client correspondant." />;
  return (
    <><ListCaption shown={clients.length} total={total} label="clients" />
    <TableWrap><table><thead><tr><th>Client</th><th>Contact</th><th>Programmes</th><th>Wallet</th><th>Visites</th><th>Dépensé</th><th>Dernière visite</th></tr></thead>
      <tbody>{clients.map((client) => {
        const visits = client.cards.reduce((sum, card) => sum + card.totalVisits, 0);
        const spent = client.cards.reduce((sum, card) => sum + card.totalSpent, 0);
        const lastVisit = latestDate(client.cards.map((card) => card.lastVisitAt));
        const platforms = uniquePlatforms(client.cards.flatMap((card) => card.registrations));
        return <tr key={client.id}>
          <td><strong>{fullName(client)}</strong><small>Inscrit le {formatDate(client.createdAt)}</small></td>
          <td>{client.email || client.phone || "Aucun contact"}<small>{client.email && client.phone ? client.phone : ""}</small></td>
          <td><div className="merchant-ops-tags">{client.cards.slice(0, 3).map((card) => <span key={card.id}>{card.program.name}</span>)}{client.cards.length > 3 && <span>+{client.cards.length - 3}</span>}</div></td>
          <td><PlatformBadges platforms={platforms} /></td><td>{visits}</td><td>{formatMoney(spent)}</td><td>{lastVisit ? formatDate(lastVisit) : "Jamais"}</td>
        </tr>;
      })}</tbody>
    </table></TableWrap></>
  );
}

function CardsTable({ cards, total }: { cards: CardRow[]; total: number }) {
  if (cards.length === 0) return <EmptyState icon={CreditCard} label="Aucune carte correspondante." />;
  return (
    <><ListCaption shown={cards.length} total={total} label="cartes" />
    <TableWrap><table><thead><tr><th>Carte</th><th>Client</th><th>Programme</th><th>Progression</th><th>Wallet</th><th>Visites</th><th>Statut</th><th>Dernière activité</th></tr></thead>
      <tbody>{cards.map((card) => <tr key={card.id}>
        <td><code>{card.serialNumber}</code><small>Créée le {formatDate(card.createdAt)}</small></td>
        <td><strong>{fullName(card.client)}</strong><small>{card.client.email || card.client.phone || "Sans contact"}</small></td>
        <td>{card.program.name}</td><td>{cardProgress(card)}</td><td><PlatformBadges platforms={uniquePlatforms(card.registrations)} /></td><td>{card.totalVisits}</td><td><StatusBadge value={card.status} /></td><td>{card.lastVisitAt ? formatDate(card.lastVisitAt) : card.lastMessageAt ? `Notification ${formatDate(card.lastMessageAt)}` : "Aucune"}</td>
      </tr>)}</tbody>
    </table></TableWrap></>
  );
}

function CampaignsTable({ campaigns, total }: { campaigns: CampaignRow[]; total: number }) {
  if (campaigns.length === 0) return <EmptyState icon={Megaphone} label="Aucune campagne correspondante." />;
  return (
    <><ListCaption shown={campaigns.length} total={total} label="campagnes" />
    <TableWrap><table><thead><tr><th>Campagne</th><th>Programme</th><th>Déclenchement</th><th>Segment</th><th>Envois</th><th>Wallet</th><th>Statut</th><th>Date</th></tr></thead>
      <tbody>{campaigns.map((campaign) => {
        const confirmed = confirmedDeliveries(campaign.delivery);
        return <tr key={campaign.id}>
          <td className="merchant-ops-message"><strong>{campaign.name}</strong><small title={campaign.message}>{campaign.message}</small></td>
          <td>{campaign.program?.name || "Tous les programmes"}</td><td>{triggerLabel(campaign.triggerType)}</td><td>{campaign.targetSegment}</td><td>{campaign.sentCount || campaign._count.logs}</td><td>{confirmed}/{campaign._count.logs}</td><td><StatusBadge value={campaign.status} /></td><td>{formatDate(campaign.sentAt || campaign.scheduledAt || campaign.createdAt)}</td>
        </tr>;
      })}</tbody>
    </table></TableWrap></>
  );
}

function QrWorkspace({ merchantId, programs }: { merchantId: string; programs: Program[] }) {
  const activePrograms = programs.filter((program) => program.isActive);
  const [target, setTarget] = useState(activePrograms.length > 1 ? "all" : activePrograms[0]?.id || "");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const joinUrl = target && typeof window !== "undefined"
    ? target === "all"
      ? `${window.location.origin}/join-all/${merchantId}`
      : `${window.location.origin}/join/${target}`
    : "";

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      width: 560,
      margin: 2,
      color: { dark: "#0a0d04", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [joinUrl]);

  if (activePrograms.length === 0) return <EmptyState icon={QrCode} label="Aucun programme actif pour générer un QR code." />;

  function copyUrl() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  function downloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `fidlify-qr-${target}.png`;
    link.click();
  }

  return (
    <div className="merchant-ops-qr">
      <div className="merchant-ops-qr-controls">
        <label htmlFor="admin-qr-target">Lien d&apos;inscription</label>
        <select id="admin-qr-target" value={target} onChange={(event) => setTarget(event.target.value)}>
          {activePrograms.length > 1 && <option value="all">Tous les programmes</option>}
          {activePrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
        </select>
        <div className="merchant-ops-url"><span>{joinUrl}</span><a href={joinUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></div>
        <div className="merchant-ops-qr-actions">
          <button type="button" onClick={copyUrl}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copié" : "Copier le lien"}</button>
          <button type="button" className="primary" onClick={downloadQr}><Download size={14} />Télécharger le QR</button>
        </div>
        <p>Ce QR utilise exactement la même page publique que celle du commerçant.</p>
      </div>
      <div className="merchant-ops-qr-preview">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR code d'inscription" />
        ) : <Loader2 size={22} className="animate-spin" />}
      </div>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="merchant-ops-table-wrap">{children}</div>;
}

function EmptyState({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return <div className="merchant-ops-empty"><Icon size={24} /><span>{label}</span></div>;
}

function ListCaption({ shown, total, label }: { shown: number; total: number; label: string }) {
  return <p className="merchant-ops-caption">{shown} {label} affiché{shown > 1 ? "s" : ""} sur {total}</p>;
}

function StatusBadge({ value }: { value: string }) {
  const tone = ["ACTIVE", "SENT", "COMPLETED"].includes(value)
    ? "success"
    : ["FAILED", "REVOKED", "EXPIRED", "CANCELLED"].includes(value)
      ? "danger"
      : ["SCHEDULED", "PENDING", "REWARD_PENDING"].includes(value)
        ? "warning"
        : "neutral";
  return <span className={`merchant-ops-status ${tone}`}>{STATUS_LABELS[value] || typeLabel(value)}</span>;
}

function PlatformBadges({ platforms }: { platforms: Platform[] }) {
  if (platforms.length === 0) return <span className="merchant-ops-muted">Non installée</span>;
  return <div className="merchant-ops-tags">{platforms.map((platform) => <span key={platform}>{platform === "APPLE" ? "Apple" : "Google"}</span>)}</div>;
}

function getTabCount(tab: TabKey, data: CommerceData) {
  if (tab === "programs") return data.programs.length;
  if (tab === "clients") return data.summary.clientCount;
  if (tab === "cards") return data.summary.cardCount;
  if (tab === "campaigns") return data.summary.campaignCount;
  return null;
}

function fullName(person: { firstName: string; lastName: string | null }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}
function uniquePlatforms(registrations: { platform: Platform }[]) {
  return Array.from(new Set(registrations.map((registration) => registration.platform)));
}
function latestDate(values: Array<string | null>) {
  const dates = values.filter((value): value is string => Boolean(value));
  return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" });
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(value);
}
function typeLabel(value: string) {
  return ({ STAMPS: "Tampons", POINTS: "Points", CASHBACK: "Cashback" } as Record<string, string>)[value] || value;
}
function cardProgress(card: CardRow) {
  if (card.program.type === "POINTS") return `${Math.round(card.currentPoints)} pts`;
  if (card.program.type === "CASHBACK") return formatMoney(card.cashbackBalance);
  return `${card.currentStamps} tampon${card.currentStamps > 1 ? "s" : ""}`;
}
function triggerLabel(value: string) {
  return ({ IMMEDIATE: "Immédiat", SCHEDULED: "Programmé", BIRTHDAY: "Anniversaire", INACTIVITY: "Inactivité", POST_STAMP: "Après visite", MILESTONE: "Palier", GEOFENCE: "Proximité" } as Record<string, string>)[value] || value;
}
function confirmedDeliveries(delivery: Record<string, number>) {
  return ["SYNCED", "ACCEPTED", "OBJECT_UPDATED", "SENT"].reduce((sum, key) => sum + (delivery[key] || 0), 0);
}
