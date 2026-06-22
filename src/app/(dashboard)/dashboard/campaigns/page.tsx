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
} from "lucide-react";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaign-templates";

interface Campaign {
  id: string;
  name: string;
  message: string;
  triggerType: string;
  targetSegment: string;
  status: string;
  sentCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
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
  cardDesign?: {
    bgColor?: string;
    stampColor?: string;
    logoData?: string;
  };
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
    targetCardIds?: string[];
    notifLogo?: string;
    notifBgColor?: string;
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
  IMMEDIATE: "ImmÃ©diat",
  SCHEDULED: "ProgrammÃ©",
  GEOFENCE: "Position Wallet",
  INACTIVITY: "Win-back",
  POST_STAMP: "AprÃ¨s tampon",
  MILESTONE: "Palier atteint",
  BIRTHDAY: "Anniversaire",
};

const segmentLabels: Record<string, string> = {
  ALL: "Tous les clients",
  ACTIVE: "Clients actifs",
  DORMANT: "Clients dormants",
  NEW: "Nouveaux clients",
  VIP: "Clients VIP",
};

const statusVariants: Record<string, "default" | "success" | "secondary" | "warning"> = {
  DRAFT: "secondary",
  SCHEDULED: "warning",
  SENT: "success",
  CANCELLED: "destructive" as "secondary",
};

export default function CampaignsPage() {
  const { data: session } = useSession();
  const isFree = ((session?.user?.plan as string) || "FREE") === "FREE";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [automations, setAutomations] = useState<CampaignAutomation[]>([]);
  const [notificationDefaults, setNotificationDefaults] = useState<NotificationDefaults>({
    logo: "",
    bgColor: "",
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
      setLoading(false);
    });
  }, []);

  async function fetchCampaigns() {
    const res = await fetch("/api/campaigns");
    setCampaigns(await res.json());
    const autos = await fetch("/api/campaigns/automations").then((r) => r.json());
    setAutomations(Array.isArray(autos) ? autos : []);
  }

  function startBlankCampaign() {
    setShowForm(true);
  }

  // PÃ©riode basÃ©e sur la date d'inscription (ancre mensuelle)
  const createdAt = (session?.user as { createdAt?: string })?.createdAt;
  const anchorDay = createdAt ? new Date(createdAt).getDate() : 1;
  const now = new Date();
  let periodStart = new Date(now.getFullYear(), now.getMonth(), anchorDay, 0, 0, 0, 0);
  if (periodStart > now) periodStart = new Date(now.getFullYear(), now.getMonth() - 1, anchorDay, 0, 0, 0, 0);

  const campaignsThisMonth = campaigns.filter((c) => new Date(c.createdAt) >= periodStart);
  const monthlyCampaignLimit = isFree ? 1 : 15;
  const campaignLimitReached = campaignsThisMonth.length >= monthlyCampaignLimit;

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
            Envoyez des notifications Ã  vos clients via leur wallet
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
          {isFree ? "Plan Gratuit" : "Limite mensuelle"} â€”{" "}
          <strong>{monthlyCampaignLimit} campagne{monthlyCampaignLimit > 1 ? "s" : ""} / mois</strong>
          {isFree ? ", envoi immÃ©diat uniquement. " : ". "}
          {campaignLimitReached
            ? "Limite atteinte ce mois-ci."
            : `Il vous reste ${monthlyCampaignLimit - campaignsThisMonth.length} campagne(s) ce mois-ci.`}
        </div>
      )}

      <CampaignAutomations automations={automations} />

      {showForm && (
        <CreateCampaignForm
          key="blank"
          programs={programs}
          isFree={isFree}
          notificationDefaults={notificationDefaults}
          onSuccess={() => {
            setShowForm(false);
            fetchCampaigns();
          }}
          onCancel={() => {
            setShowForm(false);
          }}
        />
      )}

      {campaigns.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold">Aucune campagne</h3>
            <p className="text-gray-500 mt-1 mb-4">
              Envoyez votre premiÃ¨re notification wallet
            </p>
            <Button onClick={startBlankCampaign}>
              <Plus className="mr-2 h-4 w-4" />
              CrÃ©er une campagne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const Icon = triggerIcons[campaign.triggerType] || Bell;
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {campaign.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <div className="text-right text-sm">
                        <p className="text-gray-500">
                          {triggerLabels[campaign.triggerType]}
                        </p>
                        <p className="text-xs text-gray-400">
                          {segmentLabels[campaign.targetSegment]}
                        </p>
                      </div>
                      {campaign.sentCount > 0 && (
                        <Badge variant="default">{campaign.sentCount} envoyÃ©s</Badge>
                      )}
                      <Badge variant={statusVariants[campaign.status] || "secondary"}>
                        {campaign.status === "SENT"
                          ? "EnvoyÃ©"
                          : campaign.status === "SCHEDULED"
                            ? "ProgrammÃ©"
                            : campaign.status === "DRAFT"
                              ? "Brouillon"
                              : campaign.status}
                      </Badge>
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
      )}
    </div>
  );
}

/* â”€â”€â”€ Live iPhone notification preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

function CampaignAutomations({ automations }: { automations: CampaignAutomation[] }) {
  if (automations.length === 0) {
    return null;
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
  customLogo,
  customBgColor,
  defaultLogo,
  defaultBgColor,
  triggerType,
}: {
  program?: Program;
  message: string;
  title?: string;
  customLogo?: string;
  customBgColor?: string;
  defaultLogo?: string;
  defaultBgColor?: string;
  triggerType: string;
}) {
  const bgColor = customBgColor || defaultBgColor || program?.cardDesign?.bgColor || "#1a1a2e";
  const accent = program?.cardDesign?.stampColor || "#d4ff4e";
  // Priorité: campagne, réglage global, puis programme.
  const logoData = customLogo || defaultLogo || program?.cardDesign?.logoData;
  const programName = program?.name || "Mon programme";
  const finalTitle = title || programName;
  const body = message || "Votre message apparaÃ®tra iciâ€¦";
  const time = triggerType === "IMMEDIATE" ? "maintenant" : "Ã  venir";

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
            Glissez pour ouvrir Wallet Â· {programName}
          </div>
        </div>
      </div>

      <div className="dx-notif-helper">
        <strong>AperÃ§u lock-screen iPhone</strong>
        <span>
          Le titre, l&apos;icÃ´ne et le fond reprennent les choix de cette campagne.
          Sans surcharge, les valeurs par défaut des paramètres sont utilisées.
        </span>
      </div>
    </div>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function getProgramBgColor(program?: Program) {
  const color = program?.cardDesign?.bgColor || "";
  return isHexColor(color) ? color : "#1a1a2e";
}

function CreateCampaignForm({
  programs,
  isFree,
  notificationDefaults,
  initialRecommendation,
  onSuccess,
  onCancel,
}: {
  programs: Program[];
  isFree: boolean;
  notificationDefaults: NotificationDefaults;
  initialRecommendation?: CampaignRecommendation | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialRecommendation?.name || "");
  const [message, setMessage] = useState(initialRecommendation?.message || "");
  const [programId, setProgramId] = useState(initialRecommendation?.programId || programs[0]?.id || "");
  const [triggerType, setTriggerType] = useState(
    isFree && initialRecommendation?.triggerType !== "IMMEDIATE"
      ? "IMMEDIATE"
      : initialRecommendation?.triggerType || "IMMEDIATE"
  );
  const [targetSegment, setTargetSegment] = useState(initialRecommendation?.targetSegment || "ALL");
  const [showTemplates, setShowTemplates] = useState(!initialRecommendation);

  function applyTemplate(tpl: CampaignTemplate) {
    setName(tpl.name);
    setMessage(tpl.message);
    // FREE plan : seulement IMMEDIATE autorisÃ© pour le push manuel
    if (isFree && tpl.triggerType !== "IMMEDIATE") {
      setTriggerType("IMMEDIATE");
    } else {
      setTriggerType(tpl.triggerType);
    }
    setTargetSegment(tpl.targetSegment);
    setShowTemplates(false);
  }
  const [notifTitle, setNotifTitle] = useState(initialRecommendation?.notifTitle || ""); // optionnel, override du titre
  const [notifLogo, setNotifLogo] = useState<string>(
    initialRecommendation?.triggerConfig?.notifLogo || ""
  ); // optionnel, base64 data URL
  const [notifBgColor, setNotifBgColor] = useState<string>(
    initialRecommendation?.triggerConfig?.notifBgColor || ""
  );
  const [logoError, setLogoError] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [inactivityDays, setInactivityDays] = useState(
    initialRecommendation?.triggerConfig?.daysInactive || 30
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [spamWarning, setSpamWarning] = useState<SpamWarning | null>(null);
  const [spamWarningLoading, setSpamWarningLoading] = useState(false);

  const selectedProgram = programs.find((p) => p.id === programId);
  const programBgColor = getProgramBgColor(selectedProgram);
  const defaultBgColor = isHexColor(notificationDefaults.bgColor)
    ? notificationDefaults.bgColor
    : "";
  const inheritedBgColor = defaultBgColor || programBgColor;
  const previewBgColor = isHexColor(notifBgColor) ? notifBgColor : inheritedBgColor;
  const inheritedLogo = notificationDefaults.logo || selectedProgram?.cardDesign?.logoData || "";
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

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) {
      setNotifLogo("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLogoError("Le fichier doit Ãªtre une image");
      return;
    }
    if (file.size > 500 * 1024) {
      setLogoError("Image trop lourde (max 500 KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setNotifLogo(reader.result as string);
    reader.onerror = () => setLogoError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Le titre de la notif est obligatoire â€” refus cÃ´tÃ© UI avant l'appel API.
    const trimmedTitle = notifTitle.trim();
    if (!trimmedTitle) {
      setError("Le titre de la notification est obligatoire.");
      return;
    }
    if (notifBgColor && !isHexColor(notifBgColor)) {
      setError("La couleur de fond doit être au format hexadécimal, par exemple #ff5638.");
      return;
    }

    setSaving(true);
    setError("");

    let triggerConfig: Record<string, unknown> = {
      ...(initialRecommendation?.triggerConfig || {}),
    };
    if (triggerType === "SCHEDULED" && scheduledDate && scheduledTime) {
      triggerConfig = { ...triggerConfig, sendAt: `${scheduledDate}T${scheduledTime}:00Z` };
    } else if (triggerType === "INACTIVITY") {
      triggerConfig = { ...triggerConfig, daysInactive: inactivityDays };
    }

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programId,
        name,
        message,
        triggerType,
        triggerConfig: {
          ...triggerConfig,
          notifTitle: trimmedTitle,
          notifLogo: notifLogo || undefined,
          notifBgColor: notifBgColor || undefined,
        },
        targetSegment,
      }),
    });

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{isRecommendedMode ? "Envoi recommandé" : "Nouvelle campagne"}</CardTitle>
        {!isRecommendedMode && (
          <button
            type="button"
            onClick={() => setShowTemplates((v) => !v)}
            className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors"
            style={{
              borderColor: showTemplates
                ? "rgba(212,255,78,0.5)"
                : "rgb(var(--ovr) / 0.15)",
              color: showTemplates ? "#d4ff4e" : "rgb(var(--ovr) / 0.6)",
              background: showTemplates ? "rgba(212,255,78,0.08)" : "transparent",
            }}
          >
            <Sparkles className="h-3 w-3" />
            {showTemplates ? "Masquer les modÃ¨les" : "Choisir un modÃ¨le"}
          </button>
        )}
      </CardHeader>
      <CardContent>
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
          </div>
        )}

        <div className="dx-campaign-grid">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

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
              <label className="text-sm font-medium">Nom de la campagne</label>
              <Input
                placeholder="Happy Hour vendredi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400">
                Pour ton suivi interne (n&apos;est pas affichÃ© au client)
              </p>
            </div>

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
              <p className="text-xs text-gray-400">
                {isRecommendedMode
                  ? "Verrouillé pour conserver l'audience exacte."
                  : "Programme de rattachement. Les notifications reprennent les défauts des paramètres, sauf surcharge ci-dessous."}
              </p>
            </div>
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
            <p className="text-xs text-gray-400">
              C&apos;est le texte en gras affichÃ© sur l&apos;Ã©cran de verrouillage
              du tÃ©lÃ©phone du client.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Logo de la notification <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="flex items-center gap-3">
              {notifLogo ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={notifLogo}
                    alt="Logo"
                    className="h-14 w-14 rounded-lg object-contain border"
                    style={{ background: previewBgColor }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setNotifLogo("")}>
                    Retirer
                  </Button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  className="text-sm"
                />
              )}
            </div>
            {logoError && <p className="text-xs text-red-500">{logoError}</p>}
            <p className="text-xs text-gray-400">
              PNG / JPG / SVG / WebP, max 500 KB. Si laissÃ© vide, le logo par défaut des paramètres sera utilisé.
            </p>
            {!notifLogo && inheritedLogo && (
              <p className="text-xs text-gray-400">
                Cette campagne utilise actuellement le logo par défaut.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Fond de la notification <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={previewBgColor}
                onChange={(e) => setNotifBgColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                aria-label="Couleur de fond de la notification"
              />
              <Input
                value={notifBgColor || inheritedBgColor}
                onChange={(e) => setNotifBgColor(e.target.value)}
                maxLength={7}
                placeholder={inheritedBgColor}
                className="max-w-36"
              />
              {notifBgColor && (
                <Button type="button" variant="outline" size="sm" onClick={() => setNotifBgColor("")}>
                  Reprendre le fond par défaut
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Sans choix, le fond par défaut des paramètres est repris. Cette couleur ne s&apos;applique qu&apos;à cette campagne.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Votre message apparaÃ®tra sur l'Ã©cran de verrouillage de vos clients"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={140}
              required
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>ApparaÃ®t en notif push sur le wallet du client</span>
              <span className={message.length > 120 ? "text-orange-500" : ""}>
                {message.length}/140
              </span>
            </div>
          </div>

          {isRecommendedMode ? (
            <div className="campaign-delivery-locked">
              <span>Mode d&apos;envoi</span>
              <strong>Envoi immédiat aux {exactAudienceCount} clients sélectionnés, sans élargir au segment.</strong>
            </div>
          ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">DÃ©clencheur</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                disabled={isFree}
              >
                <option value="IMMEDIATE">Envoi immÃ©diat</option>
                {!isFree && <option value="SCHEDULED">Date/heure prÃ©cise</option>}
                {!isFree && <option value="INACTIVITY">Client inactif (win-back)</option>}
                {!isFree && <option value="POST_STAMP">AprÃ¨s tamponnage</option>}
                {!isFree && <option value="MILESTONE">Palier de tampons atteint</option>}
                {!isFree && <option value="BIRTHDAY">Anniversaire client</option>}
              </select>
              {isFree && (
                <p className="text-xs text-gray-400">Passez au plan Pro pour accÃ©der aux autres dÃ©clencheurs.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Segment ciblÃ©</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
              >
                <option value="ALL">Tous les clients</option>
                <option value="ACTIVE">Clients actifs (30 derniers jours)</option>
                <option value="DORMANT">Clients dormants (30+ jours)</option>
                <option value="NEW">Nouveaux (7 derniers jours)</option>
                <option value="VIP">VIP (10+ visites)</option>
              </select>
            </div>
          </div>
          )}

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
                    L&apos;envoi reste possible, mais il vaut mieux réduire l&apos;audience ou attendre.
                  </p>
                  {spamWarning?.preview?.length ? (
                    <p className="mt-1 text-xs">
                      Exemples :{" "}
                      {spamWarning.preview
                        .map((client) => `${client.name} (${client.recentCount} récentes)`)
                        .join(", ")}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          )}

          {/* Conditional fields */}
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

          {triggerType === "INACTIVITY" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Jours d&apos;inactivitÃ© avant envoi
              </label>
              <Input
                type="number"
                min={7}
                max={365}
                value={inactivityDays}
                onChange={(e) => setInactivityDays(parseInt(e.target.value))}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Envoi..."
                : isRecommendedMode
                  ? `Envoyer aux ${exactAudienceCount} clients ciblés`
                  : triggerType === "IMMEDIATE"
                    ? "Envoyer maintenant"
                    : "Programmer"}
            </Button>
          </div>
        </form>

          {/* Live preview (sticky on right) */}
          <div className="dx-campaign-preview">
            <NotificationPreview
              program={selectedProgram}
              message={message}
              title={notifTitle}
              customLogo={notifLogo}
              customBgColor={isHexColor(notifBgColor) ? notifBgColor : undefined}
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
