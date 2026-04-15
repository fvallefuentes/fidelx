"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Building2, Globe, CreditCard } from "lucide-react";

interface MerchantSettings {
  name: string;
  email: string;
  phone: string;
  language: string;
  currency: string;
  plan: string;
  establishments: {
    id: string;
    name: string;
    address: string;
    phone: string;
    googlePlaceId: string;
  }[];
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Establishment form
  const [estName, setEstName] = useState("");
  const [estAddress, setEstAddress] = useState("");
  const [estPhone, setEstPhone] = useState("");
  const [estGoogleId, setEstGoogleId] = useState("");
  const [savingEst, setSavingEst] = useState(false);

  useEffect(() => {
    fetch("/api/merchants/settings")
      .then((r) => r.json())
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);

    await fetch("/api/merchants/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settings.name,
        phone: settings.phone,
        language: settings.language,
        currency: settings.currency,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAddEstablishment(e: React.FormEvent) {
    e.preventDefault();
    setSavingEst(true);

    const res = await fetch("/api/merchants/establishments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: estName,
        address: estAddress,
        phone: estPhone,
        googlePlaceId: estGoogleId,
      }),
    });

    if (res.ok) {
      const est = await res.json();
      setSettings((s) =>
        s ? { ...s, establishments: [...s.establishments, est] } : s
      );
      setEstName("");
      setEstAddress("");
      setEstPhone("");
      setEstGoogleId("");
    }

    setSavingEst(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const planColors: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-800",
    PRO: "bg-blue-100 text-blue-800",
    BUSINESS: "bg-purple-100 text-purple-800",
    ENTERPRISE: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Gérez votre compte et vos établissements</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom du commerce</label>
                <Input
                  value={settings?.name || ""}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, name: e.target.value } : s))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={settings?.email || ""} disabled />
                <p className="text-xs text-gray-400">L&apos;email ne peut pas être modifié</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Téléphone</label>
                <Input
                  value={settings?.phone || ""}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, phone: e.target.value } : s))
                  }
                  placeholder="+41 79 123 45 67"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Langue</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={settings?.language || "fr"}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, language: e.target.value } : s))
                    }
                  >
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Devise</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={settings?.currency || "CHF"}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, currency: e.target.value } : s))
                    }
                  >
                    <option value="CHF">CHF</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saved ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Enregistré
                  </>
                ) : saving ? (
                  "Enregistrement..."
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Plan actuel :</span>
              <Badge className={planColors[settings?.plan || "FREE"]}>
                {settings?.plan || "FREE"}
              </Badge>
            </div>

            {settings?.plan === "FREE" && (
              <div className="rounded-lg bg-blue-50 p-4 space-y-3">
                <p className="text-sm font-medium text-blue-900">
                  Passez au Pro pour débloquer :
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>- Jusqu&apos;à 1 000 clients</li>
                  <li>- Tous les systèmes de fidélité</li>
                  <li>- Notifications push illimitées</li>
                  <li>- Analytics de base</li>
                  <li>- Sans branding FidelX</li>
                </ul>
                <Button size="sm">Passer au Pro — 29 CHF/mois</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Establishments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Établissements
            </CardTitle>
            <CardDescription>
              Ajoutez vos points de vente pour la géolocalisation wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings?.establishments && settings.establishments.length > 0 && (
              <div className="space-y-2">
                {settings.establishments.map((est) => (
                  <div
                    key={est.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{est.name}</p>
                      <p className="text-sm text-gray-500">{est.address}</p>
                    </div>
                    {est.googlePlaceId && (
                      <Badge variant="outline">Google connecté</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddEstablishment} className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Ajouter un établissement</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Nom de l'établissement"
                  value={estName}
                  onChange={(e) => setEstName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Adresse"
                  value={estAddress}
                  onChange={(e) => setEstAddress(e.target.value)}
                />
                <Input
                  placeholder="Téléphone"
                  value={estPhone}
                  onChange={(e) => setEstPhone(e.target.value)}
                />
                <Input
                  placeholder="Google Place ID (optionnel)"
                  value={estGoogleId}
                  onChange={(e) => setEstGoogleId(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" disabled={savingEst}>
                {savingEst ? "Ajout..." : "Ajouter l'établissement"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
