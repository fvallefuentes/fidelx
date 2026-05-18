"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Download,
} from "lucide-react";

type Status = { enabled: boolean; backupCodesRemaining: number };
type SetupData = { secret: string; otpauthUrl: string; qrCodeDataUrl: string };

export default function SecurityPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup state
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [setupError, setSetupError] = useState("");

  // Activation success
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  // Disable flow
  const [showDisable, setShowDisable] = useState(false);
  const [disablePwd, setDisablePwd] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState("");

  useEffect(() => {
    fetch("/api/auth/totp/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function startSetup() {
    setSetupError("");
    const res = await fetch("/api/auth/totp/setup", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setSetupError(data.error ?? "Erreur");
      return;
    }
    setSetup(data);
  }

  async function verifyAndEnable(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setSetupError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setup.secret, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSetupError(data.error ?? "Code invalide");
      } else {
        setBackupCodes(data.backupCodes);
        setStatus({ enabled: true, backupCodesRemaining: data.backupCodes.length });
        setSetup(null);
        setCode("");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setDisableError("");
    setDisabling(true);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDisableError(data.error ?? "Erreur");
      } else {
        setStatus({ enabled: false, backupCodesRemaining: 0 });
        setShowDisable(false);
        setDisablePwd("");
      }
    } finally {
      setDisabling(false);
    }
  }

  function copySecret() {
    if (!setup) return;
    navigator.clipboard.writeText(setup.secret).then(() => {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    });
  }

  function copyBackupCodes() {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    });
  }

  function downloadBackupCodes() {
    if (!backupCodes) return;
    const content = `Codes de récupération Fidlify
Générés le ${new Date().toLocaleString("fr-CH")}

⚠️ IMPORTANT
- Chaque code est utilisable UNE seule fois
- Stockez-les dans un endroit sûr (gestionnaire de mots de passe, coffre)
- Régénérez-les si vous perdez ce fichier

${backupCodes.map((c, i) => `${(i + 1).toString().padStart(2, "0")}. ${c}`).join("\n")}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fidlify-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
          Sécurité
        </h1>
        <p className="text-gray-500">
          Renforcez la sécurité de votre compte avec l&apos;authentification à deux facteurs.
        </p>
      </div>

      {/* Affichage des backup codes (post-activation) */}
      {backupCodes && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <ShieldCheck className="h-5 w-5" />
              2FA activée — Sauvegardez vos codes de récupération
            </CardTitle>
            <CardDescription className="text-green-800">
              Ces codes vous permettront de vous connecter si vous perdez votre téléphone.
              <strong> Chaque code est utilisable UNE seule fois.</strong>
              <br />
              Ils ne seront <strong>plus jamais affichés</strong> — sauvegardez-les maintenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-white p-4 rounded border border-green-200">
              {backupCodes.map((c, i) => (
                <div key={i} className="text-gray-800">
                  <span className="text-gray-400 mr-2">{(i + 1).toString().padStart(2, "0")}.</span>
                  {c}
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={copyBackupCodes} variant="outline" size="sm">
                {codesCopied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                {codesCopied ? "Copiés" : "Copier"}
              </Button>
              <Button onClick={downloadBackupCodes} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button onClick={() => setBackupCodes(null)} variant="default" size="sm" className="ml-auto">
                J&apos;ai sauvegardé mes codes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup flow */}
      {setup && !backupCodes && (
        <Card>
          <CardHeader>
            <CardTitle>Configurer le 2FA</CardTitle>
            <CardDescription>
              Scannez le QR code avec votre app TOTP (Google Authenticator, 1Password, Authy, etc.) puis entrez le code à 6 chiffres.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.qrCodeDataUrl}
                alt="QR code TOTP"
                className="border border-gray-200 rounded"
              />
              <div className="flex-1 space-y-3">
                <div className="text-sm text-gray-600">
                  <p className="mb-1 font-medium">Vous ne pouvez pas scanner ?</p>
                  <p>Entrez ce code manuellement dans votre app :</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                    {setup.secret}
                  </code>
                  <Button onClick={copySecret} variant="outline" size="sm">
                    {secretCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <form onSubmit={verifyAndEnable} className="space-y-3 border-t border-gray-200 pt-4">
              <label className="text-sm font-medium text-gray-700">
                Code à 6 chiffres affiché par votre app
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                className="text-lg font-mono tracking-widest"
              />
              {setupError && (
                <div className="text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {setupError}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={verifying || code.length !== 6}>
                  {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Activer le 2FA
                </Button>
                <Button type="button" variant="outline" onClick={() => { setSetup(null); setCode(""); }}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* État principal */}
      {!setup && !backupCodes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Authentification à deux facteurs (2FA)
            </CardTitle>
            <CardDescription>
              Une fois activé, vous devrez entrer un code à 6 chiffres généré par votre téléphone à chaque connexion.
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
                    {status.backupCodesRemaining} code{status.backupCodesRemaining > 1 ? "s" : ""} de récupération restant{status.backupCodesRemaining > 1 ? "s" : ""}
                  </span>
                </div>
                {status.backupCodesRemaining <= 3 && (
                  <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Il vous reste peu de codes de récupération. Désactivez puis réactivez le 2FA pour en générer de nouveaux.
                    </div>
                  </div>
                )}

                {!showDisable ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowDisable(true)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Désactiver le 2FA
                  </Button>
                ) : (
                  <form onSubmit={disable} className="space-y-3 border-t border-gray-200 pt-4">
                    <label className="text-sm font-medium text-gray-700">
                      Confirmez avec votre mot de passe pour désactiver le 2FA
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
                      <Button type="button" variant="outline" onClick={() => { setShowDisable(false); setDisablePwd(""); }}>
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
                  Activer le 2FA réduit drastiquement le risque qu&apos;un attaquant accède à votre compte même si votre mot de passe est compromis.
                </p>
                <Button onClick={startSetup}>
                  <Shield className="h-4 w-4 mr-2" />
                  Activer le 2FA
                </Button>
                {setupError && (
                  <div className="text-sm text-red-600">{setupError}</div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
