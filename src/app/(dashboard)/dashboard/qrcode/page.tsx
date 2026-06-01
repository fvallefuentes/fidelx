"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Copy, Check, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";

interface Program {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Step {
  title: string;
  desc: string;
}

export default function QRCodePage() {
  const t = useTranslations("Dashboard.qrcode");
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merchantId = (session?.user as any)?.merchantId || (session?.user as any)?.id || "";
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Multi-programmes (1 QR = N cartes)
  const [allQrDataUrl, setAllQrDataUrl] = useState<string>("");
  const [copiedAll, setCopiedAll] = useState(false);
  const allCanvasRef = useRef<HTMLCanvasElement>(null);
  const steps = t.raw("steps") as Step[];

  const joinAllUrl = merchantId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join-all/${merchantId}`
    : "";

  useEffect(() => {
    if (!merchantId || programs.length < 2) return;
    const url = `${window.location.origin}/join-all/${merchantId}`;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: "#0a0d04", light: "#ffffff" },
    }).then(setAllQrDataUrl);
    if (allCanvasRef.current) {
      QRCode.toCanvas(allCanvasRef.current, url, {
        width: 300,
        margin: 2,
        color: { dark: "#0a0d04", light: "#ffffff" },
      });
    }
  }, [merchantId, programs.length]);

  function handleDownloadAll() {
    if (!allQrDataUrl) return;
    const link = document.createElement("a");
    link.download = `fidelify-qrcode-tous-programmes.png`;
    link.href = allQrDataUrl;
    link.click();
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(joinAllUrl);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  useEffect(() => {
    fetch("/api/programs")
      .then((res) => res.json())
      .then((data: Program[]) => {
        const activePrograms = data.filter((program) => program.isActive !== false);
        setPrograms(activePrograms);
        if (activePrograms.length > 0) setSelectedProgram(activePrograms[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedProgram) return;
    const url = `${window.location.origin}/join/${selectedProgram}`;

    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    }).then(setQrDataUrl);

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 300,
        margin: 2,
        color: { dark: "#1a1a2e", light: "#ffffff" },
      });
    }
  }, [selectedProgram]);

  const joinUrl = selectedProgram
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${selectedProgram}`
    : "";

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `fidelx-qrcode-${selectedProgram}.png`;
    link.href = qrDataUrl;
    link.click();
  }

  function handleCopy() {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-gray-500">{t("subtitle")}</p>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="text-gray-500 mt-1">{t("emptyDescription")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("cardTitle")}</CardTitle>
              <CardDescription>{t("cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {programs.length > 1 && (
                <select
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex justify-center">
                <canvas ref={canvasRef} className="rounded-xl" />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  {t("download")}
                </Button>
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? t("copied") : t("copy")}
                </Button>
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 break-all">{joinUrl}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("howItWorks")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((item, index) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR multi-programmes — affiché seulement si 2+ programmes */}
      {programs.length >= 2 && merchantId && (
        <Card className="border-2 border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-600" />
              QR multi-programmes
            </CardTitle>
            <CardDescription>
              Un seul QR qui propose à vos clients de rejoindre <strong>tous vos programmes
              en une seule fois</strong>. Ils cochent les cartes qu&apos;ils veulent.
              Parfait pour la caisse ou la vitrine.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <canvas ref={allCanvasRef} className="rounded-xl" />
              <div className="flex gap-2 w-full">
                <Button onClick={handleDownloadAll} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
                <Button variant="outline" onClick={handleCopyAll} className="flex-1">
                  {copiedAll ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copiedAll ? "Copié" : "Copier"}
                </Button>
              </div>
              <div className="w-full rounded-lg bg-white p-2.5">
                <p className="text-xs text-gray-500 break-all font-mono">{joinAllUrl}</p>
              </div>
            </div>
            <div className="text-sm text-gray-700 space-y-2.5">
              <p className="font-medium">Comment ça marche</p>
              <ul className="list-disc list-inside space-y-1.5 text-gray-600 text-sm">
                <li>Le client scanne ce QR</li>
                <li>Il voit la liste de tous vos programmes</li>
                <li>Il décoche ceux qu&apos;il ne veut pas (tout coché par défaut)</li>
                <li>Il remplit son prénom + email/téléphone</li>
                <li>Il reçoit autant de cartes Wallet que de programmes cochés</li>
              </ul>
              <p className="text-xs text-gray-500 pt-2">
                💡 Pratique pour un café qui a une carte café, une carte croissant, une
                carte sandwich — le client peut tout récupérer en un scan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
