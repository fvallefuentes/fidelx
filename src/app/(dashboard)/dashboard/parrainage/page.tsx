"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Copy,
  Share2,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  MousePointerClick,
  Calendar,
} from "lucide-react";

type Attribution = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "REVOKED";
  refereePlan: string | null;
  attributedAt: string;
  confirmedAt: string | null;
  refereeMaskedName: string;
};

type Stats = {
  code: string;
  url: string;
  clicks: number;
  signups: number;
  conversions: number;
  monthsEarnedTotal: number;
  monthsRemainingCap: number;
  attributions: Attribution[];
};

export default function ParrainagePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/referral")
      .then((r) => r.json())
      .then((d) => {
        if (d?.code) setStats(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = useCallback(() => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [stats]);

  const handleShare = useCallback(async () => {
    if (!stats) return;
    const shareText = `Salut, j'utilise Fidlify pour mes cartes fidélité — pas de paperasse, pass directement dans Apple/Google Wallet. Via mon lien tu as 1 mois gratuit : ${stats.url}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fidlify — carte fidélité digitale",
          text: shareText,
          url: stats.url,
        });
      } catch {
        // user cancelled
      }
    } else {
      // Fallback : ouvrir WhatsApp Web
      window.open(
        `https://wa.me/?text=${encodeURIComponent(shareText)}`,
        "_blank"
      );
    }
  }, [stats]);

  const handleShareEmail = useCallback(() => {
    if (!stats) return;
    const subject = "Découvre Fidlify — 1 mois offert sur tes cartes fidélité";
    const body = `Salut,\n\nJ'utilise Fidlify pour mes cartes de fidélité — pas de paperasse, le pass est directement dans Apple Wallet et Google Wallet. Mes clients adorent.\n\nVia mon lien parrainage, tu as 1 mois Essential offert :\n${stats.url}\n\nÀ bientôt`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Parrainage</h1>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Le parrainage n&apos;est pas disponible pour ce compte.
          </CardContent>
        </Card>
      </div>
    );
  }

  const capReached = stats.monthsRemainingCap === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="h-6 w-6 text-purple-600" />
          Parrainage
        </h1>
        <p className="text-gray-500">
          Parraine un confrère commerçant — vous recevez chacun 1 mois gratuit du plan choisi par ton filleul.
        </p>
      </div>

      {/* Lien parrainage */}
      <Card>
        <CardHeader>
          <CardTitle>Ton lien de parrainage</CardTitle>
          <CardDescription>
            Partage ce lien — il fonctionne pendant 30 jours après le clic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm break-all">
              {stats.url}
            </div>
            <Button onClick={handleCopy} variant="outline" className="shrink-0">
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleShare} variant="default">
              <Share2 className="h-4 w-4 mr-2" />
              Partager
            </Button>
            <Button onClick={handleShareEmail} variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<MousePointerClick className="h-5 w-5 text-blue-600" />}
          label="Clics sur ton lien"
          value={stats.clicks}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-600" />}
          label="Inscriptions"
          value={stats.signups}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          label="Filleuls actifs"
          value={stats.conversions}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-orange-600" />}
          label="Mois offerts cumulés"
          value={stats.monthsEarnedTotal}
          suffix={` / 12`}
          highlight={capReached}
        />
      </div>

      {capReached && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4 text-sm text-orange-800">
            🎉 Tu as atteint le plafond de 12 mois cumulés. Tes prochains filleuls seront crédités mais ton compteur perso reste à 12.
          </CardContent>
        </Card>
      )}

      {/* Liste des filleuls */}
      <Card>
        <CardHeader>
          <CardTitle>Tes filleuls</CardTitle>
          <CardDescription>
            Le crédit est appliqué 14 jours après la 1ère facture payée (sécurité anti-fraude).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.attributions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Aucun filleul pour le moment. Partage ton lien pour commencer.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.attributions.map((a) => (
                <AttributionRow key={a.id} a={a} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comment ça marche */}
      <Card>
        <CardHeader>
          <CardTitle>Comment ça marche</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
            <li>
              Tu partages ton lien à un confrère commerçant (WhatsApp, email, en personne).
            </li>
            <li>
              Il s&apos;inscrit sur Fidlify et choisit un plan (Essential, Growth ou Multi-sites).
            </li>
            <li>
              Quand il paie sa 1ère facture, on attend 14 jours (sécurité contre les remboursements).
            </li>
            <li>
              Vous recevez chacun automatiquement <strong>1 mois gratuit</strong> du plan qu&apos;il a choisi, appliqué à votre prochaine facture.
            </li>
            <li>
              Tu peux cumuler jusqu&apos;à <strong>12 mois</strong> de réduction sur ton abonnement.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-orange-300 bg-orange-50" : undefined}>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {value}
          {suffix && <span className="text-base text-gray-500 font-normal">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function AttributionRow({ a }: { a: Attribution }) {
  const date = new Date(a.attributedAt).toLocaleDateString("fr-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let statusBadge: React.ReactNode;
  switch (a.status) {
    case "CONFIRMED":
      statusBadge = (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Confirmé
        </Badge>
      );
      break;
    case "REVOKED":
      statusBadge = (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" />
          Révoqué
        </Badge>
      );
      break;
    default:
      statusBadge = (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          <Clock className="h-3 w-3 mr-1" />
          En attente
        </Badge>
      );
  }

  return (
    <div className="py-3 flex items-center justify-between">
      <div>
        <div className="font-medium text-gray-900">{a.refereeMaskedName}</div>
        <div className="text-xs text-gray-500">
          Inscrit le {date}
          {a.refereePlan && (
            <span className="ml-2">· Plan {a.refereePlan.toLowerCase()}</span>
          )}
        </div>
      </div>
      {statusBadge}
    </div>
  );
}
