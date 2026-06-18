"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";

interface CampaignImpact {
  returnedClients: number;
  generatedVisits: number;
  generatedValue: number;
  rewardsUnlocked: number;
  conversionRate: number;
  windowDays: number;
}

interface Campaign {
  id: string;
  name: string;
  sentCount: number;
  sentAt: string | null;
  createdAt: string;
  impact?: CampaignImpact;
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
  targetSegment: string;
  targetCardIds?: string[];
  audience?: Array<{
    cardId: string;
    clientName: string;
    reason: string;
    totalVisits: number;
  }>;
  suppressedByCooldown?: number;
}

interface CampaignAutomation {
  id: string;
  title: string;
  reason: string;
  programName: string;
  message: string;
  active: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
  lastSentCount: number;
  lastAudienceCount: number;
  lastSkipReason: string | null;
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

export default function AssistantPage() {
  const [recommendations, setRecommendations] = useState<CampaignRecommendation[]>([]);
  const [automations, setAutomations] = useState<CampaignAutomation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function loadData() {
    const [recs, autos, sentCampaigns] = await Promise.all([
      fetch("/api/campaigns/recommendations").then((r) => r.json()),
      fetch("/api/campaigns/automations").then((r) => r.json()),
      fetch("/api/campaigns").then((r) => r.json()),
    ]);
    setRecommendations(Array.isArray(recs) ? recs : []);
    setAutomations(Array.isArray(autos) ? autos : []);
    setCampaigns(Array.isArray(sentCampaigns) ? sentCampaigns : []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        const impact = campaign.impact;
        acc.sent += campaign.sentCount || 0;
        if (impact) {
          acc.returned += impact.returnedClients;
          acc.visits += impact.generatedVisits;
          acc.rewards += impact.rewardsUnlocked;
        }
        return acc;
      },
      { sent: 0, returned: 0, visits: 0, rewards: 0 }
    );
  }, [campaigns]);

  async function automateRecommendation(rec: CampaignRecommendation) {
    setWorkingId(rec.id);
    const res = await fetch("/api/campaigns/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recommendationId: rec.id,
        title: rec.title,
        reason: rec.reason,
        programId: rec.programId,
        programName: rec.programName,
        name: rec.name,
        notifTitle: rec.notifTitle,
        message: rec.message,
        targetSegment: rec.targetSegment,
      }),
    });
    setWorkingId(null);
    if (!res.ok && res.status !== 409) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Impossible d'automatiser cette recommandation");
      return;
    }
    await loadData();
  }

  async function toggleAutomation(automation: CampaignAutomation) {
    setWorkingId(automation.id);
    const res = await fetch("/api/campaigns/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: automation.id, active: !automation.active }),
    });
    setWorkingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Impossible de modifier cette automatisation");
      return;
    }
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-lime-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="assistant-page">
      <section className="assistant-hero">
        <div>
          <span className="assistant-eyebrow">
            <Bot size={14} />
            Assistant marketing automatique
          </span>
          <h1>Fidlify détecte quoi envoyer, à qui, et mesure les retours.</h1>
          <p>
            Un espace dédié pour transformer les recommandations en actions récurrentes,
            sans mélanger avec les campagnes manuelles.
          </p>
        </div>
        <div className="assistant-hero-kpis">
          <Metric icon={Send} label="Messages envoyés" value={totals.sent} />
          <Metric icon={TrendingUp} label="Clients revenus" value={totals.returned} />
          <Metric icon={CheckCircle2} label="Visites attribuées" value={totals.visits} />
        </div>
      </section>

      <section className="assistant-grid assistant-grid-main">
        <Card>
          <CardHeader>
            <div className="assistant-section-head">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-lime-500" />
                  Actions recommandées maintenant
                </CardTitle>
                <p>Opportunités prêtes à envoyer ou à automatiser.</p>
              </div>
              <Badge variant="secondary">{recommendations.length} suggestion(s)</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <EmptyAssistantState text="Aucune action urgente détectée pour l'instant." />
            ) : (
              <div className="assistant-reco-list">
                {recommendations.map((rec) => {
                  const audienceCount = rec.targetCardIds?.length || rec.potentialCount;
                  return (
                    <article key={rec.id} className="assistant-reco-card">
                      <div className="assistant-reco-top">
                        <div>
                          <h3>{rec.title}</h3>
                          <p>{rec.programName}</p>
                        </div>
                        <Badge variant="default">{audienceCount} ciblé(s)</Badge>
                      </div>
                      <p className="assistant-reco-reason">{rec.reason}</p>
                      <div className="assistant-message-preview">
                        <strong>{rec.notifTitle}</strong>
                        <span>{rec.message}</span>
                      </div>
                      {rec.audience && rec.audience.length > 0 && (
                        <div className="assistant-mini-audience">
                          {rec.audience.slice(0, 4).map((person) => (
                            <span key={person.cardId}>
                              {person.clientName || "Client"} · {person.reason}
                            </span>
                          ))}
                        </div>
                      )}
                      {rec.suppressedByCooldown ? (
                        <p className="assistant-muted">
                          {rec.suppressedByCooldown} client(s) exclus par anti-spam.
                        </p>
                      ) : null}
                      <div className="assistant-actions">
                        <Button
                          type="button"
                          onClick={() => automateRecommendation(rec)}
                          disabled={workingId === rec.id || audienceCount === 0}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Automatiser chaque semaine
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            window.location.href = "/dashboard/campaigns";
                          }}
                        >
                          Campagne manuelle
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="assistant-section-head">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-lime-500" />
                  Automatisations actives
                </CardTitle>
                <p>Règles récurrentes avec seuil minimum et anti-spam.</p>
              </div>
              <Badge variant="secondary">
                {automations.filter((a) => a.active).length} active(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {automations.length === 0 ? (
              <EmptyAssistantState text="Aucune automatisation active. Automatisez une recommandation pour commencer." />
            ) : (
              <div className="assistant-automation-list">
                {automations.map((automation) => (
                  <article key={automation.id} className="assistant-automation-card">
                    <div className="assistant-automation-top">
                      <div>
                        <h3>{automation.title}</h3>
                        <p>{automation.programName}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAutomation(automation)}
                        disabled={workingId === automation.id}
                      >
                        {automation.active ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Reprendre
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="assistant-rule-stats">
                      <span>
                        <Clock size={13} />
                        Prochain: {formatDateTime(automation.nextRunAt)}
                      </span>
                      <span>
                        <Send size={13} />
                        Dernier: {automation.lastSentCount} envoyé(s)
                      </span>
                      <span>
                        <Target size={13} />
                        Min. {automation.minAudience} clients
                      </span>
                    </div>
                    {automation.lastSkipReason && (
                      <p className="assistant-warning">{automation.lastSkipReason}</p>
                    )}
                    {automation.history.length > 0 && (
                      <div className="assistant-history">
                        {automation.history.slice(0, 3).map((run) => (
                          <div key={run.id}>
                            <span>{formatDateTime(run.sentAt)}</span>
                            <strong>{run.sentCount} envoyé(s)</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="assistant-grid assistant-grid-results">
        <MetricCard
          title="Impact mesuré"
          body="Les retours sont attribués quand un client revient dans les 7 jours après une campagne."
          metrics={[
            ["Clients revenus", totals.returned],
            ["Visites attribuées", totals.visits],
            ["Récompenses débloquées", totals.rewards],
          ]}
        />
        <MetricCard
          title="Cadre anti-spam"
          body="Les règles automatiques réévaluent l'audience avant chaque envoi."
          metrics={[
            ["Cooldown client", "7 jours"],
            ["Fréquence", "hebdo"],
            ["Seuil", "2 clients"],
          ]}
        />
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Send;
  label: string;
  value: number;
}) {
  return (
    <div className="assistant-metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({
  title,
  body,
  metrics,
}: {
  title: string;
  body: string;
  metrics: Array<[string, string | number]>;
}) {
  return (
    <Card>
      <CardContent className="assistant-result-card">
        <div>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
        <div className="assistant-result-metrics">
          {metrics.map(([label, value]) => (
            <span key={label}>
              <strong>{value}</strong>
              {label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyAssistantState({ text }: { text: string }) {
  return (
    <div className="assistant-empty">
      <Sparkles size={22} />
      <p>{text}</p>
    </div>
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
