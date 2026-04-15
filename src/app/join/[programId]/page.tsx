"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, CreditCard, Check } from "lucide-react";

interface ProgramInfo {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  cardDesign: { bgColor?: string; textColor?: string; description?: string };
  merchant: { name: string };
  establishment?: { name: string; address?: string };
}

export default function JoinPage() {
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [walletUrl, setWalletUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/programs/${programId}/public`)
      .then((res) => res.json())
      .then(setProgram)
      .catch(() => setError("Programme introuvable"))
      .finally(() => setLoading(false));
  }, [programId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !phone) {
      setError("Veuillez fournir un email ou un numéro de téléphone");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/programs/${programId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email: email || undefined, phone: phone || undefined }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'inscription");
      setSubmitting(false);
      return;
    }

    setWalletUrl(data.walletUrl || "");
    setSuccess(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Programme introuvable</h1>
          <p className="text-gray-500 mt-2">Ce programme n&apos;existe pas ou n&apos;est plus actif.</p>
        </div>
      </div>
    );
  }

  const bgColor = program.cardDesign?.bgColor || "#1a1a2e";
  const textColor = program.cardDesign?.textColor || "#ffffff";

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Carte créée !</h1>
            <p className="text-gray-500 mt-2">
              Votre carte de fidélité {program.name} est prête
            </p>
          </div>

          {/* Card preview */}
          <div
            className="rounded-2xl p-5 text-left shadow-lg"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs opacity-70">{program.merchant.name}</p>
                <p className="text-lg font-bold">{program.name}</p>
              </div>
              <Star className="h-6 w-6 opacity-70" />
            </div>
            <div className="mt-4 flex justify-between items-end">
              <div>
                <p className="text-xs opacity-70">Client</p>
                <p className="font-medium">{firstName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70">
                  {program.type === "STAMPS" ? "Tampons" : "Points"}
                </p>
                <p className="text-2xl font-bold">
                  0/{(program.config as { maxStamps?: number }).maxStamps || "∞"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {walletUrl && (
              <a
                href={walletUrl}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-black text-white py-3 px-4 font-medium hover:bg-gray-800 transition-colors"
              >
                <CreditCard className="h-5 w-5" />
                Ajouter à Apple Wallet
              </a>
            )}
            <p className="text-xs text-gray-400">
              La carte sera aussi disponible dans Google Wallet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Card preview */}
        <div
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-70">{program.merchant.name}</p>
              <p className="text-lg font-bold">{program.name}</p>
            </div>
            <Star className="h-6 w-6 opacity-70" />
          </div>
          {program.establishment && (
            <p className="text-xs opacity-60 mt-2">
              {program.establishment.name}
              {program.establishment.address && ` — ${program.establishment.address}`}
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Rejoignez le programme !
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Recevez votre carte de fidélité sur votre téléphone
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div>
              <Input
                placeholder="Votre prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="tel"
                placeholder="Téléphone (optionnel)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Inscription..." : "Obtenir ma carte"}
            </Button>
            <p className="text-[10px] text-center text-gray-400">
              En vous inscrivant, vous acceptez la politique de confidentialité.
              Vos données sont hébergées en Suisse.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
