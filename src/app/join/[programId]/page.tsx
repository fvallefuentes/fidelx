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
  const [googleWalletUrl, setGoogleWalletUrl] = useState("");
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
    setGoogleWalletUrl(data.googleWalletUrl || "");
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
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.39c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 4zm-3.1-17.24c-2.22.22-4.03 2.46-3.79 4.5 2.04.16 4.09-2.16 3.79-4.5z"/>
                </svg>
                Ajouter à Apple Wallet
              </a>
            )}
            {googleWalletUrl && (
              <a
                href={googleWalletUrl}
                className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-gray-200 bg-white text-gray-800 py-3 px-4 font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Ajouter à Google Wallet
              </a>
            )}
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
