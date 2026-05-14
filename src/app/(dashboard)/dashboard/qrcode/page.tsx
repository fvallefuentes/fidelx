"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";

interface Program {
  id: string;
  name: string;
}

interface Step {
  title: string;
  desc: string;
}

export default function QRCodePage() {
  const t = useTranslations("Dashboard.qrcode");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const steps = t.raw("steps") as Step[];

  useEffect(() => {
    fetch("/api/programs")
      .then((res) => res.json())
      .then((data: Program[]) => {
        setPrograms(data);
        if (data.length > 0) setSelectedProgram(data[0].id);
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
    </div>
  );
}
