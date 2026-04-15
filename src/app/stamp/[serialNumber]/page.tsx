"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle, Star, PartyPopper } from "lucide-react";

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
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  const [amountSpent, setAmountSpent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StampResult | null>(null);
  const [error, setError] = useState("");

  async function handleStamp() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/transactions/stamp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serialNumber,
        amountSpent: amountSpent ? parseFloat(amountSpent) : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors du tamponnage");
      setLoading(false);
      return;
    }

    setResult(data);
    setLoading(false);
  }

  // Auto-stamp on load (commerçant scanne le QR du client)
  useEffect(() => {
    handleStamp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-500">Tamponnage en cours...</p>
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
            <h2 className="mt-4 text-lg font-bold">Erreur</h2>
            <p className="mt-2 text-gray-500">{error}</p>
            <Button className="mt-4 w-full" onClick={() => window.history.back()}>
              Retour
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
                <h2 className="mt-4 text-xl font-bold">Récompense débloquée !</h2>
                <p className="mt-2 text-lg text-blue-600 font-semibold">
                  {result.rewardUnlocked.name}
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="mt-4 text-xl font-bold">Tamponné !</h2>
              </>
            )}

            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Client</p>
              <p className="text-lg font-semibold">{result.client.firstName}</p>
              <div className="mt-3 flex justify-around">
                {result.card.currentStamps !== undefined && (
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.card.currentStamps}
                    </p>
                    <p className="text-xs text-gray-500">Tampons</p>
                  </div>
                )}
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {result.card.totalVisits}
                  </p>
                  <p className="text-xs text-gray-500">Visites</p>
                </div>
              </div>
            </div>

            <Button className="mt-4 w-full" onClick={() => window.close()}>
              Fermer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
