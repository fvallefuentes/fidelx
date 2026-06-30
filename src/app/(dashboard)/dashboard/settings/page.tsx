"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Building2, Globe, CreditCard, TrendingUp, Users, Trash2, LocateFixed, Mail, Bell } from "lucide-react";
import { PLAN_LABELS } from "@/lib/plan-labels";

interface UsageStat { current: number; max: number | null; }

interface MerchantSettings {
  name: string;
  email: string;
  phone: string;
  language: string;
  currency: string;
  weeklySummaryEmailEnabled: boolean;
  notificationDefaultLogo: string | null;
  notificationDefaultBgColor: string | null;
  plan: string;
  createdAt: string;
  stripeCurrentPeriodStart: string | null;
  stripeCurrentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  usage: {
    periodStart: string;
    programs:    UsageStat;
    activeCards: UsageStat;
    campaigns:   UsageStat;
    stamps:      UsageStat;
  };
  establishments: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude: number | null;
    longitude: number | null;
  }[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notificationLogoError, setNotificationLogoError] = useState("");

  // Establishment form
  const [estName, setEstName] = useState("");
  const [estAddress, setEstAddress] = useState("");
  const [estPhone, setEstPhone] = useState("");
  const [estLatitude, setEstLatitude] = useState("");
  const [estLongitude, setEstLongitude] = useState("");
  const [savingEst, setSavingEst] = useState(false);
  const [deletingEstId, setDeletingEstId] = useState<string | null>(null);
  const [locatingEst, setLocatingEst] = useState(false);
  const [editingEstId, setEditingEstId] = useState<string | null>(null);
  const [editLatitude, setEditLatitude] = useState("");
  const [editLongitude, setEditLongitude] = useState("");
  const [savingEditEst, setSavingEditEst] = useState(false);
  const [locatingEditEst, setLocatingEditEst] = useState(false);

  // Staff
  const [staffList, setStaffList] = useState<{id:string;name:string|null;email:string}[]>([]);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);

  useEffect(() => {
    fetch("/api/merchants/settings")
      .then((r) => r.json())
      .then(setSettings)
      .finally(() => setLoading(false));
    fetch("/api/merchants/staff")
      .then((r) => r.json())
      .then(setStaffList)
      .catch(() => {});
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveError("");

    const res = await fetch("/api/merchants/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settings.name,
        phone: settings.phone,
        language: settings.language,
        currency: settings.currency,
        weeklySummaryEmailEnabled: settings.weeklySummaryEmailEnabled,
        notificationDefaultLogo: settings.notificationDefaultLogo || "",
        notificationDefaultBgColor: settings.notificationDefaultBgColor || "",
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setSaveError(data?.error || "Erreur lors de l'enregistrement.");
      return;
    }
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
        latitude: estLatitude ? Number(estLatitude) : null,
        longitude: estLongitude ? Number(estLongitude) : null,
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
      setEstLatitude("");
      setEstLongitude("");
    }

    setSavingEst(false);
  }

  function fillCurrentLocation() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas disponible dans ce navigateur.");
      return;
    }

    setLocatingEst(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEstLatitude(position.coords.latitude.toFixed(6));
        setEstLongitude(position.coords.longitude.toFixed(6));
        setLocatingEst(false);
      },
      () => {
        alert("Impossible de récupérer votre position. Vous pouvez saisir les coordonnées manuellement.");
        setLocatingEst(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function startEditLocation(est: MerchantSettings["establishments"][number]) {
    setEditingEstId(est.id);
    setEditLatitude(est.latitude?.toString() ?? "");
    setEditLongitude(est.longitude?.toString() ?? "");
  }

  function fillCurrentEditLocation() {
    if (!navigator.geolocation) {
      alert("La geolocalisation n'est pas disponible dans ce navigateur.");
      return;
    }

    setLocatingEditEst(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEditLatitude(position.coords.latitude.toFixed(6));
        setEditLongitude(position.coords.longitude.toFixed(6));
        setLocatingEditEst(false);
      },
      () => {
        alert("Impossible de recuperer votre position. Vous pouvez saisir les coordonnees manuellement.");
        setLocatingEditEst(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function saveEstablishmentLocation(id: string) {
    setSavingEditEst(true);

    const res = await fetch(`/api/merchants/establishments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: editLatitude ? Number(editLatitude) : null,
        longitude: editLongitude ? Number(editLongitude) : null,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setSettings((s) =>
        s
          ? {
              ...s,
              establishments: s.establishments.map((est) =>
                est.id === id ? { ...est, ...updated } : est
              ),
            }
          : s
      );
      setEditingEstId(null);
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Erreur lors de la mise a jour de la position");
    }

    setSavingEditEst(false);
  }

  async function handleDeleteEstablishment(id: string, name: string) {
    if (
      !confirm(
        `Supprimer l'établissement "${name}" ? Les programmes et scans liés seront conservés, mais détachés de cet établissement.`
      )
    ) {
      return;
    }

    setDeletingEstId(id);

    const res = await fetch(`/api/merchants/establishments/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setSettings((s) =>
        s
          ? {
              ...s,
              establishments: s.establishments.filter((est) => est.id !== id),
            }
          : s
      );
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Erreur lors de la suppression de l'établissement");
    }

    setDeletingEstId(null);
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setSavingStaff(true);
    const res = await fetch("/api/merchants/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: staffName, email: staffEmail, password: staffPassword }),
    });
    if (res.ok) {
      const s = await res.json();
      setStaffList(l => [...l, s]);
      setStaffName(""); setStaffEmail(""); setStaffPassword("");
    }
    setSavingStaff(false);
  }

  function handleNotificationLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNotificationLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotificationLogoError("Le fichier doit être une image");
      return;
    }
    if (file.size > 500 * 1024) {
      setNotificationLogoError("Image trop lourde (max 500 KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSettings((s) =>
        s ? { ...s, notificationDefaultLogo: reader.result as string } : s
      );
    };
    reader.onerror = () => setNotificationLogoError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const planColors: Record<string, string> = {
    FREE:       "bg-gray-100 text-gray-800",
    ESSENTIAL:  "bg-blue-100 text-blue-800",
    GROWTH:     "bg-purple-100 text-purple-800",
    MULTI_SITE: "bg-orange-100 text-orange-800",
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
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                  checked={settings?.weeklySummaryEmailEnabled ?? true}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, weeklySummaryEmailEnabled: e.target.checked } : s
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    Recevoir le recap hebdomadaire par email
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Chaque lundi matin, Fidlify peut envoyer les chiffres clefs,
                    les opportunites et les prochaines actions de l&apos;assistant campagnes.
                  </span>
                </span>
              </label>
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

        {/* Notification defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications Wallet
            </CardTitle>
            <CardDescription>
              Définissez l&apos;apparence utilisée par défaut dans vos campagnes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {saveError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo par défaut</label>
                <div className="flex flex-wrap items-center gap-3">
                  {settings?.notificationDefaultLogo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.notificationDefaultLogo}
                      alt="Logo notification"
                      className="h-14 w-14 rounded-lg border object-contain p-1"
                      style={{
                        background:
                          settings.notificationDefaultBgColor || "#1a1a2e",
                      }}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleNotificationLogoChange}
                    className="text-sm"
                  />
                  {settings?.notificationDefaultLogo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSettings((s) =>
                          s ? { ...s, notificationDefaultLogo: null } : s
                        )
                      }
                    >
                      Retirer
                    </Button>
                  )}
                </div>
                {notificationLogoError && (
                  <p className="text-xs text-red-500">{notificationLogoError}</p>
                )}
                <p className="text-xs text-gray-400">
                  PNG / JPG / SVG / WebP, max 500 KB. Utilisé automatiquement par les nouvelles campagnes.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fond par défaut</label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    value={settings?.notificationDefaultBgColor || "#1a1a2e"}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, notificationDefaultBgColor: e.target.value } : s
                      )
                    }
                    className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                    aria-label="Couleur de fond par défaut des notifications"
                  />
                  <Input
                    value={settings?.notificationDefaultBgColor || ""}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, notificationDefaultBgColor: e.target.value } : s
                      )
                    }
                    placeholder="#1a1a2e"
                    maxLength={7}
                    className="max-w-36"
                  />
                  {settings?.notificationDefaultBgColor && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSettings((s) =>
                          s ? { ...s, notificationDefaultBgColor: null } : s
                        )
                      }
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Chaque campagne reprend ce fond, sauf si vous choisissez une couleur spécifique dans la campagne.
                </p>
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
                  "Enregistrer l'apparence"
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
            {/* Plan + dates */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Plan actuel :</span>
              <Badge className={planColors[settings?.plan || "FREE"]}>
                {PLAN_LABELS[settings?.plan || "FREE"] ?? settings?.plan}
              </Badge>
            </div>

            {settings?.plan !== "FREE" && settings?.stripeCurrentPeriodStart && (
              <div className="grid grid-cols-2 gap-3 rounded-lg p-3 text-sm" style={{ background: "rgba(212,255,78,0.06)", border: "1px solid rgba(212,255,78,0.15)" }}>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "rgb(var(--ovr) / 0.4)" }}>Début de période</p>
                  <p className="font-medium" style={{ color: "var(--accent)" }}>
                    {new Date(settings.stripeCurrentPeriodStart).toLocaleDateString("fr-CH")}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "rgb(var(--ovr) / 0.4)" }}>Prochain renouvellement</p>
                  <p className="font-medium" style={{ color: "var(--accent)" }}>
                    {settings.stripeCurrentPeriodEnd
                      ? new Date(settings.stripeCurrentPeriodEnd).toLocaleDateString("fr-CH")
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            {settings?.plan === "FREE" && settings?.usage && (
              <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(212,255,78,0.06)", border: "1px solid rgba(212,255,78,0.15)" }}>
                <p className="text-xs mb-0.5" style={{ color: "rgb(var(--ovr) / 0.4)" }}>Période depuis</p>
                <p className="font-medium" style={{ color: "var(--accent)" }}>
                  {new Date(settings.usage.periodStart).toLocaleDateString("fr-CH")}
                </p>
              </div>
            )}

            {/* Usage stats */}
            {settings?.usage && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                  <TrendingUp className="h-4 w-4" /> Utilisation
                </p>
                {[
                  { label: "Programmes",          ...settings.usage.programs },
                  { label: "Clients actifs",       ...settings.usage.activeCards },
                  { label: "Campagnes (période)",  ...settings.usage.campaigns },
                  { label: "Scans (période)",      ...settings.usage.stamps },
                ].map(({ label, current, max }) => {
                  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
                  const danger = max !== null && current >= max;
                  const warn   = max !== null && !danger && pct >= 80;
                  const barColor = danger ? "#ff4e4e" : warn ? "#f59e0b" : "#d4ff4e";
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: "rgb(var(--ovr) / 0.5)" }}>
                        <span>{label}</span>
                        <span style={{ color: danger ? "#ff4e4e" : warn ? "#f59e0b" : "rgb(var(--ovr) / 0.7)", fontWeight: danger ? 600 : 400 }}>
                          {current}{max !== null ? ` / ${max}` : " / illimité"}
                        </span>
                      </div>
                      {max !== null && (
                        <div className="h-1.5 rounded-full" style={{ background: "rgb(var(--ovr) / 0.1)" }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}60` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {settings?.plan === "FREE" && (
              <a href="/register?plan=essential" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Passer à Essentiel — 39 CHF/mois →
              </a>
            )}

            {/* Bouton vers Stripe Customer Portal — annuler, changer de plan,
                mettre à jour la CB, voir les factures. L'annulation est
                "à la fin de période" par défaut → le merchant conserve son
                plan jusqu'à la date de renouvellement déjà payée. */}
            {settings?.plan !== "FREE" && settings?.stripeCustomerId && (
              <div className="pt-2">
                <a
                  href="/api/billing-portal"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  Gérer mon abonnement (annuler, CB, factures)
                </a>
                <p className="mt-2 text-xs text-gray-400">
                  Si tu annules en cours de période, tu conserves ton plan
                  jusqu&apos;à la prochaine date de renouvellement.
                </p>
              </div>
            )}
            {settings?.plan !== "FREE" && !settings?.stripeCustomerId && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Abonnement active manuellement</p>
                <p className="mt-1">
                  Ce compte n&apos;est pas lie a Stripe. La carte bancaire, les factures
                  et l&apos;annulation ne sont donc pas disponibles depuis le portail Stripe.
                  Contacte le support Fidlify pour modifier ou annuler cet abonnement.
                </p>
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
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{est.name}</p>
                      <p className="text-sm text-gray-500">{est.address}</p>
                      {est.latitude !== null && est.longitude !== null ? (
                        <p className="text-xs text-gray-400">
                          Position Wallet : {est.latitude.toFixed(5)}, {est.longitude.toFixed(5)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Position Wallet non definie</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEditLocation(est)}
                        title="Modifier la position Wallet"
                      >
                        <LocateFixed className="h-4 w-4" />
                        <span className="sr-only">Modifier la position</span>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEstablishment(est.id, est.name)}
                        disabled={deletingEstId === est.id}
                        title="Supprimer l'établissement"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Supprimer</span>
                      </Button>
                    </div>
                    </div>
                    {editingEstId === est.id && (
                      <div className="mt-3 grid gap-2 border-t pt-3 md:grid-cols-[1fr_1fr_auto]">
                        <Input
                          type="number"
                          step="any"
                          min={-90}
                          max={90}
                          placeholder="Latitude Wallet"
                          value={editLatitude}
                          onChange={(e) => setEditLatitude(e.target.value)}
                        />
                        <Input
                          type="number"
                          step="any"
                          min={-180}
                          max={180}
                          placeholder="Longitude Wallet"
                          value={editLongitude}
                          onChange={(e) => setEditLongitude(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2 md:flex-nowrap">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={fillCurrentEditLocation}
                            disabled={locatingEditEst}
                          >
                            <LocateFixed className="mr-2 h-4 w-4" />
                            {locatingEditEst ? "Localisation..." : "Ma position"}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => saveEstablishmentLocation(est.id)}
                            disabled={savingEditEst}
                          >
                            {savingEditEst ? "Enregistrement..." : "Enregistrer"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingEstId(null)}
                            disabled={savingEditEst}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
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
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  placeholder="Latitude Wallet"
                  value={estLatitude}
                  onChange={(e) => setEstLatitude(e.target.value)}
                />
                <Input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  placeholder="Longitude Wallet"
                  value={estLongitude}
                  onChange={(e) => setEstLongitude(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillCurrentLocation}
                  disabled={locatingEst}
                >
                  <LocateFixed className="mr-2 h-4 w-4" />
                  {locatingEst ? "Localisation..." : "Utiliser ma position"}
                </Button>
                <Button type="submit" variant="outline" disabled={savingEst}>
                  {savingEst ? "Ajout..." : "Ajouter l'établissement"}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Ces coordonnées permettent aux cartes Apple Wallet et Google Wallet
                d&apos;apparaître près de votre commerce quand le téléphone le juge pertinent.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Staff */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Équipe / Staff
            </CardTitle>
            <CardDescription>
              Ajoutez des employés avec accès scanner uniquement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffList.length > 0 && (
              <div className="space-y-2">
                {staffList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{s.name || "—"}</p>
                      <p className="text-sm text-gray-500">{s.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Ajouter un employé</p>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Prénom / Nom"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="outline" disabled={savingStaff}>
                {savingStaff ? "Ajout..." : "Ajouter l'employé"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
