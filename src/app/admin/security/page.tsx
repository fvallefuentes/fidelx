"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  Mail,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type Status = { enabled: boolean; email: string };

export default function AdminSecurityPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  // Enable flow
  const [showEnable, setShowEnable] = useState(false);
  const [enablePwd, setEnablePwd] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState("");

  // Disable flow
  const [showDisable, setShowDisable] = useState(false);
  const [disablePwd, setDisablePwd] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState("");

  useEffect(() => {
    fetch("/api/auth/email-2fa/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setEnableError("");
    setEnabling(true);
    try {
      const res = await fetch("/api/auth/email-2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: enablePwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnableError(data.error ?? "Erreur");
      } else {
        setStatus((s) => (s ? { ...s, enabled: true } : null));
        setShowEnable(false);
        setEnablePwd("");
      }
    } finally {
      setEnabling(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setDisableError("");
    setDisabling(true);
    try {
      const res = await fetch("/api/auth/email-2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDisableError(data.error ?? "Erreur");
      } else {
        setStatus((s) => (s ? { ...s, enabled: false } : null));
        setShowDisable(false);
        setDisablePwd("");
      }
    } finally {
      setDisabling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Sécurité 2FA
        </h1>
        <p className="text-gray-500">
          Réservé aux comptes administrateurs Fidlify. Active la 2FA par email
          pour exiger un code à 6 chiffres reçu par email à chaque connexion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            2FA par email
          </CardTitle>
          <CardDescription>
            À chaque connexion, un code à 6 chiffres sera envoyé sur l&apos;email
            <strong> {status?.email}</strong>. Le code expire après 10 minutes et
            n&apos;est utilisable qu&apos;une seule fois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.enabled ? (
            <>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Activée
                </Badge>
                <span className="text-sm text-gray-600">
                  Un code email est exigé à chaque login
                </span>
              </div>

              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Important :</strong> assure-toi d&apos;avoir un accès permanent à
                  cet email. Si tu le perds, contacte le support Fidlify pour
                  réinitialiser ton 2FA (vérification manuelle requise).
                </div>
              </div>

              {!showDisable ? (
                <Button
                  variant="outline"
                  onClick={() => setShowDisable(true)}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Désactiver la 2FA
                </Button>
              ) : (
                <form onSubmit={disable} className="space-y-3 border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700">
                    Confirme avec ton mot de passe pour désactiver
                  </label>
                  <Input
                    type="password"
                    value={disablePwd}
                    onChange={(e) => setDisablePwd(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  {disableError && (
                    <div className="text-sm text-red-600">{disableError}</div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={disabling || !disablePwd}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {disabling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Confirmer la désactivation
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDisable(false);
                        setDisablePwd("");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge className="bg-gray-100 text-gray-700">Désactivée</Badge>
              </div>
              <p className="text-sm text-gray-600">
                Activer la 2FA par email réduit drastiquement le risque qu&apos;un
                attaquant accède à ce compte admin même si ton mot de passe est
                compromis.
              </p>

              {!showEnable ? (
                <Button onClick={() => setShowEnable(true)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Activer la 2FA par email
                </Button>
              ) : (
                <form onSubmit={enable} className="space-y-3 border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700">
                    Confirme avec ton mot de passe pour activer
                  </label>
                  <Input
                    type="password"
                    value={enablePwd}
                    onChange={(e) => setEnablePwd(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  {enableError && (
                    <div className="text-sm text-red-600">{enableError}</div>
                  )}
                  <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Aucun code à scanner. À ta prochaine connexion, un code
                      sera envoyé sur <strong>{status?.email}</strong>.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={enabling || !enablePwd}>
                      {enabling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Activer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEnable(false);
                        setEnablePwd("");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
