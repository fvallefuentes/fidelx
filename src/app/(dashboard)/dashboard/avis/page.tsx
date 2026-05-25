"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check, X, Loader2, ExternalLink, Info } from "lucide-react";

type PendingReview = {
  id: string;
  clientName: string;
  programName: string;
  bonusLabel: string;
  serialNumber: string;
  sentAt: string;
};

export default function AvisPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/merchants/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "confirm" | "reject") {
    setProcessing(id);
    try {
      await fetch(`/api/merchants/reviews/${id}/${action}`, { method: "POST" });
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500" />
          Avis Google
        </h1>
        <p className="text-gray-500">
          Validez les demandes de bonus de vos clients après avoir vérifié leur
          avis sur votre fiche Google.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4 text-sm text-blue-800 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Comment ça marche :</strong> quand un client clique « Laisser
            un avis », sa demande apparaît ici. Vérifiez que l&apos;avis est bien
            publié sur votre fiche Google, puis cliquez <strong>Valider</strong> —
            le bonus est crédité automatiquement sur sa carte. Si vous ne trouvez
            pas l&apos;avis, cliquez <strong>Rejeter</strong>.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Demandes en attente {reviews.length > 0 && `(${reviews.length})`}
          </CardTitle>
          <CardDescription>
            Triées de la plus récente à la plus ancienne.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Aucune demande d&apos;avis en attente pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="py-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div>
                    <div className="font-medium text-gray-900">{r.clientName}</div>
                    <div className="text-xs text-gray-500">
                      {r.programName} · bonus {r.bonusLabel} ·{" "}
                      {new Date(r.sentAt).toLocaleDateString("fr-CH", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://business.google.com/reviews"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline px-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Voir mes avis Google
                    </a>
                    <Button
                      size="sm"
                      onClick={() => act(r.id, "confirm")}
                      disabled={processing === r.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Valider
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => act(r.id, "reject")}
                      disabled={processing === r.id}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
