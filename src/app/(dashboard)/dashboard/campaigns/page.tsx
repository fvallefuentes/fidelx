"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Bell,
  Send,
  Clock,
  MapPin,
  UserMinus,
  Target,
  Milestone,
  Sparkles,
  Wand2,
  Trash2,
  Pencil,
} from "lucide-react";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaign-templates";
import { MAX_BIRTHDAY_DAYS_BEFORE } from "@/lib/birthday-campaign";

interface Campaign {
  id: string;
  programId: string | null;
  name: string;
  message: string;
  triggerType: string;
  triggerConfig: {
    sendAt?: string;
    sendAtLocal?: string;
    timezoneOffsetMinutes?: number;
    notifTitle?: string;
    notifLogo?: string;
    notifBgColor?: string;
    [key: string]: unknown;
  };
  targetSegment: string;
  status: string;
  sentCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  showOnNewCards: boolean;
  offerEndsAt: string | null;
  createdAt: string;
  program?: { name: string } | null;
  _count: { logs: number };
  impact?: {
    returnedClients: number;
    generatedVisits: number;
    generatedValue: number;
    rewardsUnlocked: number;
    conversionRate: number;
    windowDays: number;
  };
}

interface Program {
  id: string;
  name: string;
  establishmentId?: string | null;
  establishment?: Establishment | null;
  cardDesign?: {
    bgColor?: string;
    stampColor?: string;
    logoData?: string;
    proximityMessage?: string | null;
  };
}

interface Establishment {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface NotificationDefaults {
  logo: string;
  bgColor: string;
}

interface SpamWarning {
  totalAudience: number;
  riskyCount: number;
  threshold: number;
  windowDays: number;
  preview: Array<{
    cardId: string;
    name: string;
    recentCount: number;
  }>;
}

interface CampaignRecommendation {
  id: string;
  title: string;
  reason: string;
  impactLabel: string;
  potentialCount: number;
  programId: string;
  programName: string;
  name: string;
  notifTitle: string;
  message: string;
  triggerType: string;
  targetSegment: string;
  triggerConfig?: {
    daysInactive?: number;
    remainingBeforeReward?: number;
    daysBefore?: number;
    targetCardIds?: string[];
  };
  targetCardIds?: string[];
  priorityScore?: number;
  priorityLabel?: string;
  priorityReason?: string;
  audience?: CampaignRecommendationAudience[];
  audiencePreviewLimit?: number;
  suppressedByCooldown?: number;
}

interface CampaignRecommendationAudience {
  cardId: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  reason: string;
  lastVisitAt: string | null;
  totalVisits: number;
  currentStamps: number;
  currentPoints: number;
  lastMessageAt: string | null;
  score?: number;
  scoreLabel?: string;
  scoreReasons?: string[];
}

interface CampaignAutomation {
  id: string;
  name: string;
  title: string;
  reason: string;
  programName: string;
  message: string;
  status: string;
  active: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
  lastSentCount: number;
  lastAudienceCount: number;
  lastSkipReason: string | null;
  lastSkippedAt: string | null;
  frequencyDays: number;
  cooldownDays: number;
  minAudience: number;
  history: Array<{
    id: string;
    name: string;
    sentAt: string;
    sentCount: number;
    status: string;
  }>;
}

const triggerIcons: Record<string, typeof Send> = {
  IMMEDIATE: Send,
  SCHEDULED: Clock,
  GEOFENCE: MapPin,
  INACTIVITY: UserMinus,
  POST_STAMP: Target,
  MILESTONE: Milestone,
  BIRTHDAY: Bell,
};

const triggerLabels: Record<string, string> = {
  IMMEDIATE: "Immédiat",
  SCHEDULED: "Programmé",
  GEOFENCE: "Position Wallet",
  INACTIVITY: "Win-back",
  POST_STAMP: "Après tampon",
  MILESTONE: "Récompense proche",
  BIRTHDAY: "Anniversaire",
};

const segmentLabels: Record<string, string> = {
  ALL: "Tous les clients",
  ACTIVE: "Clients actifs",
  DORMANT: "Clients dormants",
  NEW: "Nouveaux clients",
  VIP: "Clients VIP",
};

type CampaignTab = "send" | "automations" | "history";

export default function CampaignsPage() {
  const { data: session } = useSession();
  // L'etat vient du serveur : un compte en essai a plan = FREE en session,
  // le brider ici reviendrait a lui retirer ce qu'on vient de lui promettre.
  const [planState, setPlanState] = useState<string>("");
  const [campaignMax, setCampaignMax] = useState<number | null>(null);
  const isDormant = planState === "DORMANT";
  const isFree = planState === "FREE" || isDormant;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [automations, setAutomations] = useState<CampaignAutomation[]>([]);
  const [notificationDefaults, setNotificationDefaults] = useState<NotificationDefaults>({
    logo: "",
    bgColor: "",
  });
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<CampaignTab>("send");

  useEffect(() => {
    Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/programs").then((r) => r.json()),
      fetch("/api/campaigns/automations").then((r) => r.json()),
      fetch("/api/merchants/settings").then((r) => r.json()),
    ]).then(([c, p, autos, settings]) => {
      setCampaigns(c);
      setPrograms(p);
      setAutomations(Array.isArray(autos) ? autos : []);
      setPlanState((settings?.planState as string) || "");
      setCampaignMax(
        typeof settings?.usage?.campaigns?.max === "number" ? settings.usage.campaigns.max : null
      );
      setNotificationDefaults({
        logo:
          typeof settings?.notificationDefaultLogo === "string"
            ? settings.notificationDefaultLogo
            : "",
        bgColor:
          typeof settings?.notificationDefaultBgColor === "string"
            ? settings.notificationDefaultBgColor
            : "",
      });
      setEstablishments(Array.isArray(settings?.establishments) ? settings.establishments : []);
      setLoading(false);
    });
  }, []);

  async function fetchCampaigns() {
    const res = await fetch("/api/campaigns");
    setCampaigns(await res.json());
    const autos = await fetch("/api/campaigns/automations").then((r) => r.json());
    setAutomations(Array.isArray(autos) ? autos : []);
  }

  async function fetchPrograms() {
    const res = await fetch("/api/programs");
    setPrograms(await res.json());
  }

  function startBlankCampaign() {
    setEditingCampaign(null);
    setActiveTab("send");
    setShowForm(true);
  }

  function startEditingCampaign(campaign: Campaign) {
    setEditingCampaign(campaign);
    setActiveTab("send");
    setShowForm(true);
  }

  // Période basée sur la date d'inscription (ancre mensuelle)
  const createdAt = (session?.user as { createdAt?: string })?.createdAt;
  const anchorDay = createdAt ? new Date(createdAt).getDate() : 1;
  const now = new Date();
  let periodStart = new Date(now.getFullYear(), now.getMonth(), anchorDay, 0, 0, 0, 0);
  if (periodStart > now) periodStart = new Date(now.getFullYear(), now.getMonth() - 1, anchorDay, 0, 0, 0, 0);

  const campaignsThisMonth = campaigns.filter((c) => new Date(c.createdAt) >= periodStart);
  // Limite renvoyee par le serveur (essai = illimite plafonne a 15,
  // veille = 0). En attendant le chargement, on ne bloque pas.
  const monthlyCampaignLimit = campaignMax;
  const displayedMonthlyCampaignLimit = monthlyCampaignLimit ?? 0;
  const campaignLimitReached =
    monthlyCampaignLimit !== null && campaignsThisMonth.length >= monthlyCampaignLimit;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagnes</h1>
          <p className="text-gray-500">
            Envoyez des notifications à vos clients via leur wallet
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <ExportCsvButton
            endpoint="/api/merchants/export/campaigns"
            filename="fidlify-campagnes.csv"
            label="Exporter CSV"
          />
          <Button onClick={startBlankCampaign} disabled={campaignLimitReached}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {(isFree || campaignLimitReached) && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          {isDormant ? "Essai terminé" : isFree ? "Plan Gratuit" : "Limite mensuelle"} —{" "}
          <strong>{displayedMonthlyCampaignLimit} campagne{displayedMonthlyCampaignLimit > 1 ? "s" : ""} / mois</strong>
          {isDormant
            ? ". Vos cartes restent actives chez vos clients, mais l'envoi de campagnes est suspendu. "
            : isFree ? ", envoi immédiat uniquement. " : ". "}
          {campaignLimitReached
            ? "Limite atteinte ce mois-ci."
            : `Il vous reste ${Math.max(0, displayedMonthlyCampaignLimit - campaignsThisMonth.length)} campagne(s) ce mois-ci.`}
        </div>
      )}

      <CampaignTabs
        activeTab={activeTab}
        campaignsCount={campaigns.length}
        automationsCount={automations.length}
        onChange={(tab) => {
          setActiveTab(tab);
          if (tab !== "send") {
            setShowForm(false);
            setEditingCampaign(null);
          }
        }}
      />

      {activeTab === "send" && (
        showForm ? (
          <CreateCampaignForm
            key={editingCampaign?.id ?? "blank"}
            programs={programs}
            isFree={isFree}
            notificationDefaults={notificationDefaults}
            initialCampaign={editingCampaign}
            onSuccess={() => {
              setShowForm(false);
              setEditingCampaign(null);
              fetchCampaigns();
              setActiveTab("history");
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingCampaign(null);
            }}
          />
        ) : (
          <CampaignStartPanel
            campaignLimitReached={campaignLimitReached}
            remainingCampaigns={
              monthlyCampaignLimit === null
                ? null
                : Math.max(0, monthlyCampaignLimit - campaignsThisMonth.length)
            }
            onStart={startBlankCampaign}
          />
        )
      )}

      {activeTab === "automations" && (
        <div className="space-y-4">
          <WalletProximityPanel
            programs={programs}
            establishments={establishments}
            onProgramLinked={fetchPrograms}
          />
          <CampaignAutomations automations={automations} />
        </div>
      )}

      {activeTab === "history" && (
        <CampaignHistory
          campaigns={campaigns}
          onCreate={startBlankCampaign}
          onEdit={startEditingCampaign}
          onDeleted={fetchCampaigns}
        />
      )}
    </div>
  );
}

/* Live iPhone notification preview */
function CampaignSentCountBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: "#f2ffd0", color: "#5d7d13" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#739c12" }} />
      {count} envoyé{count > 1 ? "s" : ""}
    </span>
  );
}

function CampaignStatusBadge({ status, triggerType }: { status: string; triggerType: string }) {
  const isActiveEventCampaign =
    status === "SCHEDULED" &&
    (triggerType === "POST_STAMP" || triggerType === "MILESTONE");
  const states: Record<string, { label: string; background: string; color: string; dot: string }> = {
    SENT: { label: "Envoyé", background: "#effbd0", color: "#5d7d13", dot: "#739c12" },
    SCHEDULED: { label: "Programmé", background: "#fff2d6", color: "#a16207", dot: "#d97706" },
    DRAFT: { label: "Brouillon", background: "#efefeb", color: "#797a72", dot: "#989891" },
    CANCELLED: { label: "Annulé", background: "#fee9eb", color: "#db3a42", dot: "#ef4444" },
  };
  const state = isActiveEventCampaign
    ? { label: "Active", background: "#effbd0", color: "#5d7d13", dot: "#739c12" }
    : states[status] ?? { label: status, background: "#efefeb", color: "#797a72", dot: "#989891" };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: state.background, color: state.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: state.dot }} />
      {state.label}
    </span>
  );
}

function CampaignTabs({
  activeTab,
  campaignsCount,
  automationsCount,
  onChange,
}: {
  activeTab: CampaignTab;
  campaignsCount: number;
  automationsCount: number;
  onChange: (tab: CampaignTab) => void;
}) {
  const tabs: Array<{ id: CampaignTab; label: string; description: string; countLabel?: string }> = [
    { id: "send", label: "Envoyer", description: "Créer une notification" },
    {
      id: "automations",
      label: "Automatisations",
      description: automationsCount > 0 ? `${automationsCount} règle active` : "Règles et proximité Wallet",
    },
    {
      id: "history",
      label: "Historique",
      description: campaignsCount > 0 ? `${campaignsCount} campagne${campaignsCount > 1 ? "s" : ""}` : "Envois et résultats",
    },
  ];

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="rounded-lg border px-4 py-3 text-left transition-colors"
            style={{
              borderColor: active ? "#D9FF3C" : "rgb(var(--ovr) / 0.1)",
              background: active ? "rgba(217,255,60,0.14)" : "rgb(var(--ovr) / 0.025)",
              color: "rgb(var(--ovr) / 0.86)",
            }}
          >
            <span className="flex items-center justify-between gap-3">
              <strong className="text-sm">{tab.label}</strong>
              {tab.countLabel && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                  {tab.countLabel}
                </span>
              )}
            </span>
            <span className="mt-1 block text-xs text-gray-500">{tab.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function CampaignStartPanel({
  campaignLimitReached,
  remainingCampaigns,
  onStart,
}: {
  campaignLimitReached: boolean;
  remainingCampaigns: number | null;
  onStart: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-800">
              <Sparkles className="h-3.5 w-3.5" />
              Assistant guidé
            </div>
            <h2 className="mt-3 text-xl font-semibold text-gray-900">
              Créer une campagne en 4 étapes
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Choisissez un objectif, sélectionnez les clients, écrivez le message,
              puis validez l&apos;aperçu avant l&apos;envoi.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {["Objectif", "Clients", "Message", "Vérifier"].map((step, index) => (
                <div key={step} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-xs font-semibold text-lime-700">{index + 1}</span>
                  <p className="text-sm font-medium text-gray-900">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">Ce mois-ci</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">
              {remainingCampaigns === null ? "∞" : remainingCampaigns}
            </p>
            <p className="text-xs text-gray-500">
              {remainingCampaigns === null
                ? "campagnes disponibles"
                : `campagne${remainingCampaigns > 1 ? "s" : ""} restante${remainingCampaigns > 1 ? "s" : ""}`}
            </p>
            <Button className="mt-4 w-full" onClick={onStart} disabled={campaignLimitReached}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une campagne
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignHistory({
  campaigns,
  onCreate,
  onEdit,
  onDeleted,
}: {
  campaigns: Campaign[];
  onCreate: () => void;
  onEdit: (campaign: Campaign) => void;
  onDeleted: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function deleteScheduledCampaign(campaign: Campaign) {
    const isStampEventCampaign =
      campaign.triggerType === "POST_STAMP" || campaign.triggerType === "MILESTONE";
    const ok = window.confirm(
      isStampEventCampaign
        ? `Désactiver la campagne "${campaign.name}" ? Elle ne se déclenchera plus lors des prochains tampons.`
        : `Supprimer la campagne programmée "${campaign.name}" ? Elle ne sera pas envoyée.`
    );
    if (!ok) return;

    setDeletingId(campaign.id);
    setDeleteError("");
    const res = await fetch(`/api/campaigns?id=${encodeURIComponent(campaign.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error || "Impossible de supprimer cette campagne.");
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    onDeleted();
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold">Aucune campagne envoyée</h3>
          <p className="mb-4 mt-1 text-gray-500">L&apos;historique apparaîtra après le premier envoi.</p>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Créer une campagne
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {deleteError}
        </div>
      )}
      {campaigns.map((campaign) => {
        const Icon = triggerIcons[campaign.triggerType] || Bell;
        const isStampEventCampaign =
          campaign.triggerType === "POST_STAMP" || campaign.triggerType === "MILESTONE";
        const canDelete =
          campaign.status === "SCHEDULED" &&
          (isStampEventCampaign || (!campaign.sentAt && campaign.sentCount === 0));
        const canEdit =
          campaign.status === "SCHEDULED" &&
          campaign.triggerType === "SCHEDULED" &&
          !campaign.sentAt &&
          campaign.sentCount === 0;
        const impact = campaign.impact;
        const hasImpact =
          impact &&
          (impact.returnedClients > 0 ||
            impact.generatedVisits > 0 ||
            impact.rewardsUnlocked > 0);
        return (
          <Card key={campaign.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      background: "#D9FF3C",
                      border: "1px solid #D9FF3C",
                    }}
                  >
                    <Icon className="h-5 w-5 text-[#141710]" />
                  </div>
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="line-clamp-1 text-sm text-gray-500">
                      {campaign.message}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="text-right text-sm">
                    <p className="text-gray-500">
                      {triggerLabels[campaign.triggerType]}
                    </p>
                    <p className="text-xs text-gray-400">
                      {segmentLabels[campaign.targetSegment]}
                    </p>
                  </div>
                  {campaign.sentCount > 0 && (
                    <CampaignSentCountBadge count={campaign.sentCount} />
                  )}
                  {campaign.showOnNewCards && campaign.offerEndsAt && (
                    <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-1 text-xs font-medium text-lime-800">
                      {new Date(campaign.offerEndsAt) > new Date()
                        ? `Offre carte jusqu'au ${new Intl.DateTimeFormat("fr-CH").format(new Date(campaign.offerEndsAt))}`
                        : "Offre carte expirée"}
                    </span>
                  )}
                  <CampaignStatusBadge status={campaign.status} triggerType={campaign.triggerType} />
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(campaign)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Modifier
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deleteScheduledCampaign(campaign)}
                      disabled={deletingId === campaign.id}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {deletingId === campaign.id
                        ? isStampEventCampaign ? "Désactivation..." : "Suppression..."
                        : isStampEventCampaign ? "Désactiver" : "Supprimer"}
                    </Button>
                  )}
                </div>
              </div>
              {impact && campaign.sentCount > 0 && (
                <div className="campaign-impact-row">
                  <span>
                    <strong>{impact.returnedClients}</strong> client
                    {impact.returnedClients > 1 ? "s" : ""} revenu
                    {impact.returnedClients > 1 ? "s" : ""}
                  </span>
                  <span>
                    <strong>{impact.generatedVisits}</strong> visite
                    {impact.generatedVisits > 1 ? "s" : ""} attribuée
                    {impact.generatedVisits > 1 ? "s" : ""}
                  </span>
                  <span>
                    <strong>{impact.conversionRate}%</strong> retour J+{impact.windowDays}
                  </span>
                  {impact.rewardsUnlocked > 0 && (
                    <span>
                      <strong>{impact.rewardsUnlocked}</strong> récompense
                      {impact.rewardsUnlocked > 1 ? "s" : ""} débloquée
                      {impact.rewardsUnlocked > 1 ? "s" : ""}
                    </span>
                  )}
                  {!hasImpact && (
                    <span className="campaign-impact-muted">
                      En attente de retours clients
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RecommendedActions({
  recommendations,
  isFree,
  onUse,
  onAutomate,
}: {
  recommendations: CampaignRecommendation[];
  isFree: boolean;
  onUse: (rec: CampaignRecommendation) => void;
  onAutomate: (rec: CampaignRecommendation) => void;
}) {
  const [excludedByRecommendation, setExcludedByRecommendation] = useState<Record<string, string[]>>({});

  function toggleExcluded(recommendationId: string, cardId: string) {
    setExcludedByRecommendation((prev) => {
      const current = new Set(prev[recommendationId] || []);
      if (current.has(cardId)) current.delete(cardId);
      else current.add(cardId);
      return { ...prev, [recommendationId]: [...current] };
    });
  }

  function buildAdjustedRecommendation(rec: CampaignRecommendation) {
    const excluded = new Set(excludedByRecommendation[rec.id] || []);
    const targetCardIds = (rec.targetCardIds || []).filter((id) => !excluded.has(id));
    return {
      ...rec,
      potentialCount: targetCardIds.length,
      targetCardIds,
      triggerConfig: {
        ...(rec.triggerConfig || {}),
        targetCardIds,
      },
    };
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-50">
              <Sparkles className="h-5 w-5 text-lime-600" />
            </div>
            <div>
              <p className="font-medium">Actions recommandées</p>
              <p className="text-sm text-gray-500">
                Aucune opportunité urgente détectée pour l&apos;instant. Fidlify surveille
                les clients dormants, les anniversaires et les cartes proches d&apos;une récompense.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-lime-500" />
              Actions recommandées
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Fidlify détecte les opportunités, applique l&apos;anti-spam et prépare le message à envoyer.
            </p>
          </div>
          <Badge variant="secondary">{recommendations.length} suggestion(s)</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="campaign-recommendations-grid">
          {recommendations.map((rec) => {
            const TriggerIcon = triggerIcons[rec.triggerType] || Wand2;
            const lockedByFreePlan = isFree && rec.triggerType !== "IMMEDIATE";
            const adjusted = buildAdjustedRecommendation(rec);
            const excluded = new Set(excludedByRecommendation[rec.id] || []);
            const previewLimit = rec.audiencePreviewLimit || 8;
            const audience = rec.audience || [];
            const totalTarget = rec.targetCardIds?.length || rec.potentialCount;
            const hiddenAudienceCount = Math.max(0, totalTarget - audience.length);
            return (
              <div key={rec.id} className="campaign-recommendation-card">
                <div className="campaign-recommendation-top">
                  <div className="campaign-recommendation-icon">
                    <TriggerIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="campaign-recommendation-title">{rec.title}</p>
                    <p className="campaign-recommendation-program">{rec.programName}</p>
                  </div>
                </div>

                <p className="campaign-recommendation-reason">{rec.reason}</p>

                <div className="campaign-recommendation-meta">
                  <span>
                    <strong>{adjusted.potentialCount}</strong> {rec.impactLabel}
                  </span>
                  <span>{segmentLabels[rec.targetSegment] || rec.targetSegment}</span>
                </div>

                {rec.priorityScore !== undefined && (
                  <div className="campaign-priority-panel">
                    <span>
                      <strong>{rec.priorityScore}/100</strong>
                      {rec.priorityLabel || "Priorite"}
                    </span>
                    <p>{rec.priorityReason}</p>
                  </div>
                )}

                {rec.suppressedByCooldown ? (
                  <div className="campaign-recommendation-cooldown">
                    {rec.suppressedByCooldown} client{rec.suppressedByCooldown > 1 ? "s" : ""} exclu{rec.suppressedByCooldown > 1 ? "s" : ""} automatiquement: notification récente.
                  </div>
                ) : null}

                <div className="campaign-recommendation-message">
                  <span>{rec.notifTitle}</span>
                  <p>{rec.message}</p>
                </div>

                {audience.length > 0 && (
                  <div className="campaign-audience">
                    <div className="campaign-audience-head">
                      <span>Audience ciblée</span>
                      <span>{adjusted.potentialCount}/{totalTarget}</span>
                    </div>
                    <div className="campaign-audience-list">
                      {audience.slice(0, previewLimit).map((person) => {
                        const isExcluded = excluded.has(person.cardId);
                        return (
                          <label
                            key={person.cardId}
                            className={`campaign-audience-row ${isExcluded ? "is-excluded" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => toggleExcluded(rec.id, person.cardId)}
                            />
                            <span className="campaign-audience-person">
                              <strong>{person.clientName || "Client"}</strong>
                              <small>{person.reason}</small>
                            </span>
                            <span className="campaign-audience-stats">
                              {person.score || 0}/100
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {hiddenAudienceCount > 0 && (
                      <p className="campaign-audience-more">
                        +{hiddenAudienceCount} autre{hiddenAudienceCount > 1 ? "s" : ""} client{hiddenAudienceCount > 1 ? "s" : ""} ciblé{hiddenAudienceCount > 1 ? "s" : ""} non affiché{hiddenAudienceCount > 1 ? "s" : ""}.
                      </p>
                    )}
                  </div>
                )}

                <div className="campaign-recommendation-actions">
                  <Button
                    type="button"
                    className="w-full"
                    variant={lockedByFreePlan ? "outline" : "default"}
                    disabled={lockedByFreePlan || adjusted.potentialCount === 0}
                    onClick={() => onUse(adjusted)}
                  >
                  {lockedByFreePlan
                    ? "Plan payant requis"
                    : adjusted.potentialCount === 0
                      ? "Aucun client ciblé"
                      : "Préparer l'envoi ciblé"}
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    disabled={isFree || lockedByFreePlan || adjusted.potentialCount === 0}
                    onClick={() => onAutomate(adjusted)}
                  >
                    {isFree ? "Automatisation plan payant" : "Automatiser chaque semaine"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

void RecommendedActions;

function WalletProximityPanel({
  programs,
  establishments,
  onProgramLinked,
}: {
  programs: Program[];
  establishments: Establishment[];
  onProgramLinked: () => Promise<void>;
}) {
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [linkingProgram, setLinkingProgram] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [savingMessageId, setSavingMessageId] = useState("");
  const [unlinkingProgramId, setUnlinkingProgramId] = useState("");
  const [programActionError, setProgramActionError] = useState("");
  const positionedEstablishments = establishments.filter(hasWalletPosition);
  const establishmentToAssign = positionedEstablishments[0] || null;
  const programsWithPosition = programs.filter(
    (program) => program.establishment && hasWalletPosition(program.establishment)
  );
  const linkablePrograms = establishmentToAssign
    ? programs.filter((program) => program.establishmentId !== establishmentToAssign.id)
    : [];
  const isReady = programsWithPosition.length > 0;
  const hasEstablishment = establishments.length > 0;
  const hasPosition = positionedEstablishments.length > 0;
  const statusLabel = isReady
    ? "Actif"
    : !hasEstablishment
      ? "Établissement à ajouter"
      : !hasPosition
        ? "Position à ajouter"
        : "Programme à relier";
  const summary = isReady
    ? `Vos cartes peuvent être proposées à proximité pour ${programsWithPosition.length} programme${programsWithPosition.length > 1 ? "s" : ""}.`
    : !hasEstablishment
      ? "Ajoutez d'abord votre établissement dans Paramètres."
      : !hasPosition
        ? "Votre établissement existe, mais il manque sa latitude et sa longitude."
        : "Votre position est prête. Il reste à associer au moins un programme à cet établissement.";

  async function linkProgramToEstablishment() {
    if (!selectedProgramId || !establishmentToAssign) return;

    setLinkingProgram(true);
    setLinkError("");
    setLinkSuccess("");

    const res = await fetch(`/api/programs/${selectedProgramId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ establishmentId: establishmentToAssign.id }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setLinkError(data?.error || "Impossible d'assigner ce programme.");
      setLinkingProgram(false);
      return;
    }

    const linkedProgram = programs.find((program) => program.id === selectedProgramId);
    await onProgramLinked();
    setSelectedProgramId("");
    setLinkSuccess(`${linkedProgram?.name || "Programme"} assigné à ${establishmentToAssign.name}.`);
    setLinkingProgram(false);
  }

  async function saveProximityMessage(program: Program) {
    const message = (messageDrafts[program.id] ?? getProgramProximityMessage(program)).trim();

    setSavingMessageId(program.id);
    setProgramActionError("");
    setLinkSuccess("");

    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardDesign: {
          proximityMessage: message || null,
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setProgramActionError(data?.error || "Impossible d'enregistrer le message.");
      setSavingMessageId("");
      return;
    }

    await onProgramLinked();
    setMessageDrafts((current) => ({ ...current, [program.id]: message }));
    setLinkSuccess(`Message de proximité enregistré pour ${program.name}.`);
    setSavingMessageId("");
  }

  async function unlinkProgramFromProximity(program: Program) {
    setUnlinkingProgramId(program.id);
    setProgramActionError("");
    setLinkSuccess("");

    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ establishmentId: null }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setProgramActionError(data?.error || "Impossible de retirer cette assignation.");
      setUnlinkingProgramId("");
      return;
    }

    await onProgramLinked();
    setMessageDrafts((current) => {
      const next = { ...current };
      delete next[program.id];
      return next;
    });
    setLinkSuccess(`${program.name} n'utilise plus la proximité Wallet.`);
    setUnlinkingProgramId("");
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "#D9FF3C", color: "#141710" }}
            >
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">Proximité Wallet</p>
                <WalletProximityStatusBadge active={isReady} label={statusLabel} />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {summary}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <WalletProximityStep
                  done={hasEstablishment}
                  title="1. Établissement"
                  text={hasEstablishment ? establishments[0]?.name || "Ajouté" : "À créer"}
                />
                <WalletProximityStep
                  done={hasPosition}
                  title="2. Position"
                  text={hasPosition ? "Latitude et longitude OK" : "Coordonnées manquantes"}
                />
                <WalletProximityStep
                  done={isReady}
                  title="3. Programme"
                  text={isReady ? `${programsWithPosition.length} actif${programsWithPosition.length > 1 ? "s" : ""}` : "À associer"}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href="/dashboard/settings#establishments"
              className="inline-flex h-10 items-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Régler l&apos;établissement
            </a>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ce que ça fait
            </p>
            {programsWithPosition.length > 0 ? (
              <div className="mt-2 space-y-2">
                {programsWithPosition.map((program) => (
                  <div key={program.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{program.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {program.establishment?.name || "Établissement assigné"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => unlinkProgramFromProximity(program)}
                        disabled={unlinkingProgramId === program.id}
                        className="shrink-0 gap-1.5 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {unlinkingProgramId === program.id ? "Retrait..." : "Retirer"}
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Message affichable à proximité
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={messageDrafts[program.id] ?? getProgramProximityMessage(program)}
                          onChange={(event) => {
                            setMessageDrafts((current) => ({
                              ...current,
                              [program.id]: event.target.value.slice(0, 90),
                            }));
                            setProgramActionError("");
                            setLinkSuccess("");
                          }}
                          maxLength={90}
                          placeholder={`Vous êtes près de ${program.establishment?.name || "votre commerce"} !`}
                          className="h-10"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => saveProximityMessage(program)}
                          disabled={savingMessageId === program.id}
                          className="shrink-0"
                        >
                          {savingMessageId === program.id ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Utilisé par Apple Wallet quand la carte devient pertinente. Google Wallet peut adapter l&apos;affichage.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Une fois configuré, Apple Wallet et Google Wallet peuvent rendre la carte plus visible
                quand le client est près de votre commerce.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              À savoir
            </p>
            <p className="mt-2 text-sm text-amber-900">
              Ce n&apos;est pas une campagne push classique : vous ne choisissez pas un rayon précis.
              Wallet utilise la position du pass et décide quand afficher la carte selon le téléphone,
              les permissions et le contexte.
            </p>
          </div>
        </div>

        {hasPosition && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-gray-900">Assigner la proximité à un programme</p>
            <p className="mt-1 text-sm text-gray-500">
              Choisissez le programme qui doit utiliser l&apos;établissement {establishmentToAssign?.name}.
            </p>
            {linkablePrograms.length > 0 ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  className="flex h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={selectedProgramId}
                  onChange={(event) => {
                    setSelectedProgramId(event.target.value);
                    setLinkError("");
                    setLinkSuccess("");
                  }}
                >
                  <option value="">Choisir un programme</option>
                  {linkablePrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={linkProgramToEstablishment}
                  disabled={!selectedProgramId || linkingProgram}
                  style={{ background: "#D9FF3C", color: "#141710" }}
                >
                  {linkingProgram ? "Assignation..." : "Assigner"}
                </Button>
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-lime-900">
                Tous les programmes utilisent déjà cet établissement.
              </p>
            )}
            {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}
            {programActionError && <p className="mt-2 text-sm text-red-600">{programActionError}</p>}
            {linkSuccess && <p className="mt-2 text-sm text-lime-700">{linkSuccess}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WalletProximityStatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        background: active ? "#effbd0" : "#fff2d6",
        color: active ? "#5d7d13" : "#a16207",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: active ? "#739c12" : "#d97706" }}
      />
      {label}
    </span>
  );
}

function WalletProximityStep({
  done,
  title,
  text,
}: {
  done: boolean;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <p className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: done ? "#739c12" : "#d97706" }}
        />
        {title}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{text}</p>
    </div>
  );
}

function hasWalletPosition(establishment: Establishment | null | undefined) {
  return (
    typeof establishment?.latitude === "number" &&
    establishment.latitude >= -90 &&
    establishment.latitude <= 90 &&
    typeof establishment.longitude === "number" &&
    establishment.longitude >= -180 &&
    establishment.longitude <= 180
  );
}

function getProgramProximityMessage(program: Program) {
  const savedMessage = program.cardDesign?.proximityMessage?.trim();
  if (savedMessage) return savedMessage;
  return `Vous êtes près de ${program.establishment?.name || "votre commerce"} !`;
}

function CampaignAutomations({ automations }: { automations: CampaignAutomation[] }) {
  if (automations.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-50">
              <Wand2 className="h-5 w-5 text-lime-600" />
            </div>
            <div>
              <p className="font-medium">Aucune règle automatique active</p>
              <p className="text-sm text-gray-500">
                Les règles créées depuis l&apos;assistant apparaîtront ici avec leur historique d&apos;envoi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-lime-500" />
              Automatisations
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Règles prudentes: une vérification par semaine, anti-spam client et seuil minimum avant envoi.
            </p>
          </div>
          <Badge variant="secondary">{automations.length} active(s)</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="campaign-automations-grid">
          {automations.map((automation) => (
            <div key={automation.id} className="campaign-automation-card">
              <div className="campaign-automation-head">
                <div>
                  <p className="campaign-automation-title">{automation.title}</p>
                  <p className="campaign-automation-program">{automation.programName}</p>
                </div>
                <Badge variant={automation.active ? "success" : "secondary"}>
                  {automation.active ? "Active" : "Pause"}
                </Badge>
              </div>

              <p className="campaign-automation-reason">{automation.reason}</p>

              <div className="campaign-automation-kpis">
                <span>
                  <strong>{automation.lastSentCount}</strong> envoyés dernier run
                </span>
                <span>
                  <strong>{automation.runCount}</strong> exécution{automation.runCount > 1 ? "s" : ""}
                </span>
                <span>
                  <strong>{automation.minAudience}</strong> clients min.
                </span>
              </div>

              <div className="campaign-automation-timeline">
                <p>
                  Prochain passage:{" "}
                  <strong>{formatDateTime(automation.nextRunAt)}</strong>
                </p>
                <p>
                  Dernier envoi:{" "}
                  <strong>{formatDateTime(automation.lastRunAt)}</strong>
                </p>
                {automation.lastSkipReason && (
                  <p className="campaign-automation-skip">
                    Dernier saut: {automation.lastSkipReason}
                  </p>
                )}
              </div>

              {automation.history.length > 0 && (
                <div className="campaign-automation-history">
                  {automation.history.map((run) => (
                    <div key={run.id}>
                      <span>{formatDateTime(run.sentAt)}</span>
                      <strong>{run.sentCount} envoyé{run.sentCount > 1 ? "s" : ""}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Pas encore";
  return new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function NotificationPreview({
  program,
  message,
  title,
  defaultLogo,
  defaultBgColor,
  triggerType,
}: {
  program?: Program;
  message: string;
  title?: string;
  defaultLogo?: string;
  defaultBgColor?: string;
  triggerType: string;
}) {
  const bgColor = defaultBgColor || program?.cardDesign?.bgColor || "#1a1a2e";
  const accent = program?.cardDesign?.stampColor || "#d4ff4e";
  const logoData = defaultLogo || program?.cardDesign?.logoData;
  const programName = program?.name || "Mon programme";
  const finalTitle = title || programName;
  const body = message || "Votre message apparaîtra ici…";
  const time = triggerType === "IMMEDIATE" ? "maintenant" : "à venir";

  return (
    <div className="dx-notif-preview">
      <div className="dx-iphone">
        {/* Status bar */}
        <div className="dx-iphone-status">
          <span>10:23</span>
          <span className="dx-iphone-notch" />
          <span className="dx-iphone-status-right">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="6" width="2" height="4" rx="0.5"/><rect x="3" y="4" width="2" height="6" rx="0.5"/><rect x="6" y="2" width="2" height="8" rx="0.5"/><rect x="9" y="0" width="2" height="10" rx="0.5"/></svg>
            <span style={{ fontWeight: 600, fontSize: 11 }}>5G</span>
            <span className="dx-iphone-battery">
              <span className="dx-iphone-battery-fill" />
            </span>
          </span>
        </div>

        {/* Background glow / lockscreen feel */}
        <div className="dx-iphone-screen">
          <div className="dx-iphone-clock">
            <div className="dx-iphone-day">samedi 30 avril</div>
            <div className="dx-iphone-time">10:23</div>
          </div>

          {/* Notification card */}
          <div className="dx-notif">
            <div
              className="dx-notif-icon"
              style={{ background: bgColor, color: accent }}
            >
              {logoData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoData} alt="" />
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                  {programName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="dx-notif-body">
              <div className="dx-notif-meta">
                <span className="dx-notif-app">WALLET</span>
                <span className="dx-notif-time">{time}</span>
              </div>
              <div className="dx-notif-title">{finalTitle}</div>
              <div className="dx-notif-text">{body}</div>
            </div>
          </div>

          <div className="dx-iphone-hint">
            Glissez pour ouvrir Wallet · {programName}
          </div>
        </div>
      </div>

      <div className="dx-notif-helper">
        <strong>Aperçu lock-screen iPhone</strong>
        <span>
          L&apos;icône et le fond reprennent l&apos;apparence définie dans Paramètres.
        </span>
      </div>
    </div>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function getLocalScheduleParts(value?: string | null) {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function getDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDefaultOfferEndDate(scheduleDate?: string) {
  const base = scheduleDate
    ? new Date(`${scheduleDate}T12:00:00`)
    : new Date();
  base.setDate(base.getDate() + 7);
  return getDateInputValue(base.toISOString());
}

function CreateCampaignForm({
  programs,
  isFree,
  notificationDefaults,
  initialRecommendation,
  initialCampaign,
  onSuccess,
  onCancel,
}: {
  programs: Program[];
  isFree: boolean;
  notificationDefaults: NotificationDefaults;
  initialRecommendation?: CampaignRecommendation | null;
  initialCampaign?: Campaign | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(initialCampaign);
  const initialSchedule = getLocalScheduleParts(initialCampaign?.scheduledAt);
  const [name, setName] = useState(initialCampaign?.name || initialRecommendation?.name || "");
  const [message, setMessage] = useState(initialCampaign?.message || initialRecommendation?.message || "");
  const [programId, setProgramId] = useState(
    initialCampaign?.programId || initialRecommendation?.programId || programs[0]?.id || ""
  );
  const [triggerType, setTriggerType] = useState(
    initialCampaign?.triggerType ||
    (isFree && initialRecommendation?.triggerType !== "IMMEDIATE"
      ? "IMMEDIATE"
      : initialRecommendation?.triggerType || "IMMEDIATE")
  );
  const [targetSegment, setTargetSegment] = useState(
    initialCampaign?.targetSegment || initialRecommendation?.targetSegment || "ALL"
  );
  const [showTemplates, setShowTemplates] = useState(!initialRecommendation && !initialCampaign);

  function applyTemplate(tpl: CampaignTemplate) {
    setName(tpl.name);
    setNotifTitle(tpl.title);
    setMessage(tpl.message);
    // FREE plan : seulement IMMEDIATE autorisé pour le push manuel
    if (isFree && tpl.triggerType !== "IMMEDIATE") {
      setTriggerType("IMMEDIATE");
    } else {
      setTriggerType(tpl.triggerType);
    }
    setTargetSegment(tpl.targetSegment);
    if (tpl.triggerType === "MILESTONE") setRemainingBeforeReward(1);
    setShowTemplates(false);
    setCampaignStep(1);
  }
  const [notifTitle, setNotifTitle] = useState(
    initialCampaign?.triggerConfig.notifTitle || initialRecommendation?.notifTitle || ""
  );
  const [scheduledDate, setScheduledDate] = useState(initialSchedule.date);
  const [scheduledTime, setScheduledTime] = useState(initialSchedule.time);
  const [inactivityDays, setInactivityDays] = useState(
    initialRecommendation?.triggerConfig?.daysInactive || 30
  );
  const [remainingBeforeReward, setRemainingBeforeReward] = useState(
    initialRecommendation?.triggerConfig?.remainingBeforeReward || 1
  );
  const [birthdayDaysBefore, setBirthdayDaysBefore] = useState(
    initialRecommendation?.triggerConfig?.daysBefore || 0
  );
  const [showOnNewCards, setShowOnNewCards] = useState(
    initialCampaign?.showOnNewCards || false
  );
  const [offerEndDate, setOfferEndDate] = useState(
    getDateInputValue(initialCampaign?.offerEndsAt)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [spamWarning, setSpamWarning] = useState<SpamWarning | null>(null);
  const [spamWarningLoading, setSpamWarningLoading] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const selectedProgram = programs.find((p) => p.id === programId);
  const defaultBgColor = isHexColor(notificationDefaults.bgColor)
    ? notificationDefaults.bgColor
    : "";
  const isRecommendedMode = Boolean(initialRecommendation);
  const exactAudienceCount =
    initialRecommendation?.targetCardIds?.length || initialRecommendation?.potentialCount || 0;
  const exactAudience = initialRecommendation?.audience || [];
  const hiddenAudienceCount = Math.max(0, exactAudienceCount - exactAudience.length);
  const exactTargetCardIds =
    initialRecommendation?.targetCardIds ||
    initialRecommendation?.triggerConfig?.targetCardIds ||
    [];
  const exactTargetCardIdsKey = exactTargetCardIds.join("|");
  const supportsCardOffer = triggerType === "IMMEDIATE" || triggerType === "SCHEDULED";
  const cardOfferEligible =
    supportsCardOffer && targetSegment === "ALL" && exactTargetCardIds.length === 0;
  const effectiveShowOnNewCards = showOnNewCards && cardOfferEligible;
  const [campaignStep, setCampaignStep] = useState(isEditing ? 2 : 0);
  const wizardSteps = isRecommendedMode
    ? ["Audience", "Message", "Vérifier"]
    : ["Objectif", "Clients", "Message", "Vérifier"];
  const lastWizardStep = wizardSteps.length - 1;
  const isObjectiveStep = !isRecommendedMode && campaignStep === 0;
  const isAudienceStep = isRecommendedMode ? campaignStep === 0 : campaignStep === 1;
  const isMessageStep = isRecommendedMode ? campaignStep === 1 : campaignStep === 2;
  const isReviewStep = campaignStep === lastWizardStep;
  const canGoNext =
    isObjectiveStep ||
    (isAudienceStep && Boolean(programId)) ||
    (isMessageStep &&
      Boolean(notifTitle.trim()) &&
      Boolean(message.trim()) &&
      (!effectiveShowOnNewCards || Boolean(offerEndDate))) ||
    isReviewStep;

  function startFreeMessage() {
    if (!name) setName("Message libre");
    if (!notifTitle) setNotifTitle(selectedProgram?.name || "Nouvelle notification");
    setTriggerType("IMMEDIATE");
    setTargetSegment("ALL");
    setShowTemplates(false);
    setCampaignStep(1);
  }

  function goToNextStep() {
    setError("");
    if (!canGoNext) {
      setError("Complétez les champs de cette étape avant de continuer.");
      return;
    }
    setCampaignStep((step) => {
      const nextStep = Math.min(lastWizardStep, step + 1);
      if (nextStep === lastWizardStep) setReviewConfirmed(false);
      return nextStep;
    });
  }

  function goToStep(stepIndex: number) {
    setError("");
    if (stepIndex <= campaignStep) {
      if (stepIndex !== lastWizardStep) setReviewConfirmed(false);
      setCampaignStep(stepIndex);
      return;
    }
    if (stepIndex === campaignStep + 1) {
      goToNextStep();
      return;
    }
    setError("Avancez étape par étape pour vérifier la campagne avant l'envoi.");
  }

  useEffect(() => {
    if (!programId) {
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      setSpamWarningLoading(true);
      fetch("/api/campaigns/spam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          targetSegment,
          targetCardIds: exactTargetCardIdsKey ? exactTargetCardIdsKey.split("|") : [],
        }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSpamWarning(data))
        .catch((err) => {
          if (err?.name !== "AbortError") setSpamWarning(null);
        })
        .finally(() => setSpamWarningLoading(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [programId, targetSegment, exactTargetCardIdsKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReviewStep) {
      goToNextStep();
      return;
    }
    if (!reviewConfirmed) {
      setError("Cochez la confirmation après avoir vérifié la campagne.");
      return;
    }

    // Le titre de la notif est obligatoire — refus côté UI avant l'appel API.
    const trimmedTitle = notifTitle.trim();
    if (!trimmedTitle) {
      setError("Le titre de la notification est obligatoire.");
      return;
    }
    const offerEndsAt = effectiveShowOnNewCards && offerEndDate
      ? new Date(`${offerEndDate}T23:59:59`).toISOString()
      : null;
    if (effectiveShowOnNewCards) {
      const activationAt =
        triggerType === "SCHEDULED" && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}:00`)
          : new Date();
      if (!offerEndsAt || new Date(offerEndsAt) <= activationAt) {
        setError("La date de fin de l'offre doit être postérieure à son envoi.");
        return;
      }
    }
    setSaving(true);
    setError("");

    let triggerConfig: Record<string, unknown> = {
      ...(initialCampaign?.triggerConfig || {}),
      ...(initialRecommendation?.triggerConfig || {}),
    };
    if (triggerType === "SCHEDULED" && scheduledDate && scheduledTime) {
      const sendAtLocal = `${scheduledDate}T${scheduledTime}:00`;
      triggerConfig = {
        ...triggerConfig,
        sendAtLocal,
        timezoneOffsetMinutes: new Date(sendAtLocal).getTimezoneOffset(),
      };
    } else if (triggerType === "INACTIVITY") {
      triggerConfig = { ...triggerConfig, daysInactive: inactivityDays };
    } else if (triggerType === "MILESTONE") {
      triggerConfig = { ...triggerConfig, remainingBeforeReward };
    } else if (triggerType === "BIRTHDAY") {
      triggerConfig = { ...triggerConfig, daysBefore: birthdayDaysBefore };
    }

    const saveCampaign = (replaceActiveOffer: boolean) =>
      fetch("/api/campaigns", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialCampaign?.id,
          programId,
          name,
          message,
          reviewConfirmed,
          triggerType,
          triggerConfig: {
            ...triggerConfig,
            notifTitle: trimmedTitle,
          },
          targetSegment,
          showOnNewCards: effectiveShowOnNewCards,
          offerEndsAt,
          replaceActiveOffer,
        }),
      });

    let res = await saveCampaign(false);

    if (res.status === 409) {
      const conflict = await res.json();
      if (conflict.errorCode === "ACTIVE_CARD_OFFER_CONFLICT") {
        const endLabel = conflict.activeOffer?.endsAt
          ? new Intl.DateTimeFormat("fr-CH", { dateStyle: "medium" }).format(
              new Date(conflict.activeOffer.endsAt)
            )
          : null;
        const confirmed = window.confirm(
          `${conflict.activeOffer?.title || "Une offre"} est déjà active${endLabel ? ` jusqu'au ${endLabel}` : ""}. Cette nouvelle offre la remplacera sur les cartes. Continuer ?`
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
        res = await saveCampaign(true);
      } else {
        setError(conflict.error || "Erreur");
        setSaving(false);
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur");
      setSaving(false);
      return;
    }

    onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing
            ? "Modifier la campagne programmée"
            : isRecommendedMode
              ? "Préparer l'envoi ciblé"
              : "Nouvelle campagne"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="campaign-wizard-steps">
          {wizardSteps.map((step, index) => (
            <button
              key={step}
              type="button"
              className={`campaign-wizard-step ${index === campaignStep ? "is-active" : ""} ${index < campaignStep ? "is-done" : ""}`}
              onClick={() => goToStep(index)}
            >
              <span>{index + 1}</span>
              {step}
            </button>
          ))}
        </div>

        <div className="dx-campaign-grid">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {isObjectiveStep && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Que voulez-vous faire ?</h3>
                  <p className="text-sm text-gray-500">
                    Choisissez un objectif. Fidlify préremplit le message et le mode d&apos;envoi.
                  </p>
                </div>
                {showTemplates && (
                  <div className="campaign-templates-grid">
                    {CAMPAIGN_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="campaign-template-card"
                      >
                        <span className="campaign-template-emoji">{tpl.emoji}</span>
                        <div className="campaign-template-info">
                          <div className="campaign-template-title">{tpl.title}</div>
                          <div className="campaign-template-desc">{tpl.description}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={startFreeMessage}
                      className="campaign-template-card"
                    >
                      <span className="campaign-template-emoji">✍</span>
                      <div className="campaign-template-info">
                        <div className="campaign-template-title">Message libre</div>
                        <div className="campaign-template-desc">
                          Partir d&apos;une notification vide.
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {isAudienceStep && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Qui doit recevoir cette notification ?</h3>
                  <p className="text-sm text-gray-500">
                    Gardez simple : choisissez le programme et le groupe de clients.
                  </p>
                </div>

                {isRecommendedMode && initialRecommendation && (
                  <div className="campaign-exact-target">
                    <div className="campaign-exact-target-head">
                      <div>
                        <p>Audience exacte</p>
                        <span>
                          {exactAudienceCount} client{exactAudienceCount > 1 ? "s" : ""} sélectionné{exactAudienceCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <Badge variant="secondary">Ciblage verrouillé</Badge>
                    </div>
                    <div className="campaign-exact-target-reason">
                      {initialRecommendation.reason}
                    </div>
                    {exactAudience.length > 0 && (
                      <div className="campaign-exact-target-list">
                        {exactAudience.slice(0, 8).map((person) => (
                          <span key={person.cardId}>
                            <strong>{person.clientName || "Client"}</strong>
                            <small>{person.reason}</small>
                          </span>
                        ))}
                        {hiddenAudienceCount > 0 && (
                          <span>
                            <strong>+{hiddenAudienceCount}</strong>
                            <small>autre{hiddenAudienceCount > 1 ? "s" : ""} client{hiddenAudienceCount > 1 ? "s" : ""}</small>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Programme</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={programId}
                      onChange={(e) => setProgramId(e.target.value)}
                      disabled={isRecommendedMode}
                    >
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isRecommendedMode && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Clients ciblés</label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        value={targetSegment}
                        onChange={(e) => setTargetSegment(e.target.value)}
                      >
                        <option value="ALL">Tous les clients</option>
                        <option value="ACTIVE">Clients actifs</option>
                        <option value="DORMANT">Clients dormants</option>
                        <option value="NEW">Nouveaux clients</option>
                        <option value="VIP">Clients VIP</option>
                      </select>
                    </div>
                  )}
                </div>

                {(spamWarningLoading || (spamWarning && spamWarning.riskyCount > 0)) && (
                  <div
                    className="rounded-lg border px-4 py-3 text-sm"
                    style={{
                      borderColor: spamWarning?.riskyCount ? "rgba(245,158,11,0.35)" : "rgb(var(--ovr) / 0.12)",
                      background: spamWarning?.riskyCount ? "rgba(245,158,11,0.08)" : "rgb(var(--ovr) / 0.03)",
                      color: "rgb(var(--ovr) / 0.78)",
                    }}
                  >
                    {spamWarningLoading ? (
                      "Vérification anti-spam..."
                    ) : (
                      <>
                        <strong style={{ color: "#b45309" }}>Avertissement anti-spam</strong>
                        <p className="mt-1">
                          {spamWarning?.riskyCount} client{spamWarning?.riskyCount !== 1 ? "s" : ""} sur{" "}
                          {spamWarning?.totalAudience} recevrai{spamWarning?.riskyCount !== 1 ? "ent" : "t"} une{" "}
                          {spamWarning?.threshold}e notification en {spamWarning?.windowDays} jours.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {isMessageStep && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Quel message envoyer ?</h3>
                  <p className="text-sm text-gray-500">
                    Le titre est le texte visible en gras sur la notification Wallet.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom interne</label>
                  <Input
                    placeholder="Happy Hour vendredi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Titre de la notification <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder={selectedProgram?.name || "Ex : Nouvelle offre disponible"}
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    required
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    className="flex min-h-[110px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Votre message apparaîtra sur l'écran de verrouillage de vos clients"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={140}
                    required
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Notification Wallet</span>
                    <span className={message.length > 120 ? "text-orange-500" : ""}>
                      {message.length}/140
                    </span>
                  </div>
                </div>

                {!isRecommendedMode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mode d&apos;envoi</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value)}
                      disabled={isFree || isEditing}
                    >
                      <option value="IMMEDIATE">Envoyer maintenant</option>
                      {!isFree && <option value="SCHEDULED">Programmer une date</option>}
                      {!isFree && <option value="INACTIVITY">Client inactif</option>}
                      {!isFree && <option value="POST_STAMP">Après chaque tamponnage</option>}
                      {!isFree && <option value="MILESTONE">Récompense proche</option>}
                      {!isFree && <option value="BIRTHDAY">Anniversaire</option>}
                    </select>
                  </div>
                )}

                {triggerType === "SCHEDULED" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Heure</label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {supportsCardOffer && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Afficher l&apos;offre aux futurs clients
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Les cartes ajoutées après l&apos;envoi afficheront aussi cette offre, sans nouvelle notification.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={effectiveShowOnNewCards}
                        disabled={!cardOfferEligible}
                        onClick={() => {
                          const nextValue = !showOnNewCards;
                          setShowOnNewCards(nextValue);
                          if (nextValue && !offerEndDate) {
                            setOfferEndDate(getDefaultOfferEndDate(scheduledDate));
                          }
                        }}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          effectiveShowOnNewCards ? "bg-[#9eea22]" : "bg-gray-300"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                        aria-label="Afficher l'offre aux futurs clients"
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                            effectiveShowOnNewCards ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {!cardOfferEligible && (
                      <p className="mt-3 text-xs font-medium text-amber-700">
                        Cette option nécessite une campagne manuelle destinée à « Tous les clients ».
                      </p>
                    )}

                    {effectiveShowOnNewCards && (
                      <div className="mt-4 max-w-sm space-y-2">
                        <label className="text-sm font-medium" htmlFor="offer-end-date">
                          Afficher jusqu&apos;au
                        </label>
                        <Input
                          id="offer-end-date"
                          type="date"
                          value={offerEndDate}
                          min={scheduledDate || getDateInputValue(new Date().toISOString())}
                          onChange={(event) => setOfferEndDate(event.target.value)}
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Une seule offre peut être active par programme. Une nouvelle offre remplacera l&apos;ancienne après confirmation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {triggerType === "INACTIVITY" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Jours d&apos;inactivité</label>
                    <Input
                      type="number"
                      min={7}
                      max={365}
                      value={inactivityDays}
                      onChange={(e) => setInactivityDays(parseInt(e.target.value))}
                    />
                  </div>
                )}

                {triggerType === "MILESTONE" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prévenir quand il reste</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={remainingBeforeReward}
                        onChange={(e) => setRemainingBeforeReward(Number(e.target.value) || 1)}
                        className="max-w-24"
                      />
                      <span className="text-sm text-gray-600">tampon(s) ou point(s)</span>
                    </div>
                  </div>
                )}

                {triggerType === "POST_STAMP" && (
                  <div className="rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-lime-900">
                    Cette notification part automatiquement juste après le passage en caisse du client.
                  </div>
                )}

                {triggerType === "MILESTONE" && (
                  <div className="rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-lime-900">
                    La notification part une seule fois au moment où le client entre dans cette zone proche de sa prochaine récompense.
                  </div>
                )}

                {triggerType === "BIRTHDAY" && (
                  <div className="rounded-lg border border-lime-200 bg-lime-50 p-4">
                    <label className="text-sm font-medium text-gray-900" htmlFor="birthday-days-before">
                      Quand envoyer la notification ?
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <Input
                        id="birthday-days-before"
                        type="number"
                        min={0}
                        max={MAX_BIRTHDAY_DAYS_BEFORE}
                        value={birthdayDaysBefore}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setBirthdayDaysBefore(
                            Number.isFinite(value)
                              ? Math.min(
                                  MAX_BIRTHDAY_DAYS_BEFORE,
                                  Math.max(0, Math.trunc(value))
                                )
                              : 0
                          );
                        }}
                        className="max-w-24"
                      />
                      <span className="text-sm text-gray-700">
                        {birthdayDaysBefore === 0
                          ? "Le jour même"
                          : `${birthdayDaysBefore} jour${birthdayDaysBefore > 1 ? "s" : ""} avant`}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Choisissez de 0 à {MAX_BIRTHDAY_DAYS_BEFORE} jours avant l&apos;anniversaire.
                    </p>
                  </div>
                )}
              </div>
            )}

            {isReviewStep && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Vérifier avant l&apos;envoi</h3>
                  <p className="text-sm text-gray-500">
                    Dernier contrôle : programme, audience et message.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-400">Programme</p>
                    <p className="font-medium text-gray-900">{selectedProgram?.name || "Aucun programme"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-400">Audience</p>
                    <p className="font-medium text-gray-900">
                      {isRecommendedMode
                        ? `${exactAudienceCount} clients ciblés`
                        : segmentLabels[targetSegment]}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-400">Envoi</p>
                    <p className="font-medium text-gray-900">
                      {triggerType === "BIRTHDAY"
                        ? birthdayDaysBefore === 0
                          ? "Anniversaire · le jour même"
                          : `Anniversaire · ${birthdayDaysBefore} jour${birthdayDaysBefore > 1 ? "s" : ""} avant`
                        : triggerLabels[triggerType] || triggerType}
                    </p>
                    {triggerType === "SCHEDULED" && scheduledDate && scheduledTime && (
                      <p className="mt-1 text-xs text-gray-500">
                        {new Intl.DateTimeFormat("fr-CH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(`${scheduledDate}T${scheduledTime}:00`))}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-400">Titre</p>
                    <p className="font-medium text-gray-900">{notifTitle || "À compléter"}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-400">Message</p>
                  <p className="mt-1 text-sm text-gray-800">{message || "À compléter"}</p>
                </div>
                {effectiveShowOnNewCards && offerEndDate && (
                  <div className="rounded-lg border border-lime-200 bg-lime-50 p-3">
                    <p className="text-xs font-medium uppercase text-lime-700">
                      Offre visible sur les nouvelles cartes
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      Jusqu&apos;au {new Intl.DateTimeFormat("fr-CH", { dateStyle: "long" }).format(
                        new Date(`${offerEndDate}T12:00:00`)
                      )}
                    </p>
                  </div>
                )}
                <label className="campaign-review-confirmation">
                  <input
                    type="checkbox"
                    checked={reviewConfirmed}
                    onChange={(event) => setReviewConfirmed(event.target.checked)}
                  />
                  <span>
                    <strong>Je confirme cette campagne.</strong>
                    {triggerType === "IMMEDIATE"
                      ? " Elle sera envoyée uniquement après mon clic sur le bouton ci-dessous."
                      : isEditing
                        ? " Les modifications seront enregistrées sans envoyer la campagne maintenant."
                        : " Elle sera enregistrée et envoyée selon le mode indiqué ci-dessus."}
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <div className="flex gap-2">
                {campaignStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReviewConfirmed(false);
                      setCampaignStep((step) => Math.max(0, step - 1));
                    }}
                  >
                    Retour
                  </Button>
                )}
                {isReviewStep ? (
                  <Button
                    type="submit"
                    disabled={saving || !reviewConfirmed || !notifTitle.trim() || !message.trim()}
                  >
                    {saving
                      ? isEditing ? "Enregistrement..." : "Envoi..."
                      : isEditing
                        ? "Enregistrer les modifications"
                        : isRecommendedMode
                        ? `Envoyer aux ${exactAudienceCount} clients ciblés`
                        : triggerType === "IMMEDIATE"
                          ? "Envoyer maintenant"
                          : triggerType === "POST_STAMP" || triggerType === "MILESTONE"
                            ? "Activer la campagne"
                          : "Programmer"}
                  </Button>
                ) : (
                  <Button type="button" onClick={goToNextStep}>
                    Continuer
                  </Button>
                )}
              </div>
            </div>
          </form>

          <div className="dx-campaign-preview">
            <NotificationPreview
              program={selectedProgram}
              message={message}
              title={notifTitle}
              defaultLogo={notificationDefaults.logo}
              defaultBgColor={defaultBgColor}
              triggerType={triggerType}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
