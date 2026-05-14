"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, PartyPopper } from "lucide-react";
import { useTranslations } from "next-intl";

interface StampResult {
  success: boolean;
  card: {
    currentStamps: number;
    currentPoints: number;
    cashbackBalance: number;
    totalVisits: number;
  };
  client: { firstName: string };
  rewardUnlocked: { name: string } | null;
}

export default function StampPage() {
  const t = useTranslations("Public.stamp");
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<StampResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function stampCard() {
      const res = await fetch("/api/transactions/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNumber }),
      });

      const data = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setError(data.error || t("errorFallback"));
      } else {
        setResult(data);
      }
      setLoading(false);
    }

    stampCard().catch(() => {
      if (!cancelled) {
        setError(t("errorFallback"));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [serialNumber, t]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold">{t("errorTitle")}</h2>
            <p className="mt-2 text-gray-500">{error}</p>
            <Button className="mt-4 w-full" onClick={() => window.history.back()}>
              {t("back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            {result.rewardUnlocked ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                  <PartyPopper className="h-8 w-8 text-yellow-600" />
                </div>
                <h2 className="mt-4 text-xl font-bold">
                  {t("rewardUnlocked")}
                </h2>
                <p className="mt-2 text-lg text-blue-600 font-semibold">
                  {result.rewardUnlocked.name}
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="mt-4 text-xl font-bold">{t("stamped")}</h2>
              </>
            )}

            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">{t("client")}</p>
              <p className="text-lg font-semibold">{result.client.firstName}</p>
              <div className="mt-3 flex justify-around">
                {result.card.currentStamps !== undefined && (
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.card.currentStamps}
                    </p>
                    <p className="text-xs text-gray-500">{t("stamps")}</p>
                  </div>
                )}
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {result.card.totalVisits}
                  </p>
                  <p className="text-xs text-gray-500">{t("visits")}</p>
                </div>
              </div>
            </div>

            <Button className="mt-4 w-full" onClick={() => window.close()}>
              {t("close")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
