"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardPreview } from "@/components/card-preview/CardPreview";
import { LogoUploader } from "@/components/card-preview/LogoUploader";
import { templates } from "@/lib/wallet/templates";
import { STRIP_LIBRARY } from "@/lib/wallet/strip-library";

type BackField = { label: string; value: string };

type Program = {
  id: string;
  name: string;
  templateId: string | null;
  logoBlobKey: string | null;
  stripBlobKey: string | null;
  iconBlobKey: string | null;
  backFields: BackField[] | null;
  merchant?: { name: string | null; email: string } | null;
};

const MAX_BACK_FIELDS = 6;
const BACK_FIELD_SUGGESTIONS = ["Contact", "Horaires", "Site web"];
const WIZARD_STEPS = 4;

function isBackFieldArray(x: unknown): x is BackField[] {
  return (
    Array.isArray(x) &&
    x.every(
      (f) =>
        f &&
        typeof f === "object" &&
        typeof (f as BackField).label === "string" &&
        typeof (f as BackField).value === "string"
    )
  );
}

export default function CustomizeProgramPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <CustomizeProgramInner />
    </Suspense>
  );
}

function CustomizeProgramInner() {
  const params = useParams<{ id: string }>();
  const programId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const wizard = searchParams.get("wizard") === "true";

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState("classique");
  const [logoBlobKey, setLogoBlobKey] = useState<string | null>(null);
  const [logoVersion, setLogoVersion] = useState(Date.now());
  const [stripBlobKey, setStripBlobKey] = useState<string | null>(null);
  const [stripVersion, setStripVersion] = useState(Date.now());
  const [backFields, setBackFields] = useState<BackField[]>([]);

  const [step, setStep] = useState(1);

  const [openSections, setOpenSections] = useState({
    template: true,
    logo: true,
    strip: true,
    back: true,
  });

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/programs/${programId}`);
      if (cancelled) return;
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const raw: unknown = await res.json();
      if (!raw || typeof raw !== "object") {
        setLoading(false);
        return;
      }
      const r = raw as Record<string, unknown>;
      const prog: Program = {
        id: String(r.id ?? programId),
        name: typeof r.name === "string" ? r.name : "",
        templateId: typeof r.templateId === "string" ? r.templateId : null,
        logoBlobKey: typeof r.logoBlobKey === "string" ? r.logoBlobKey : null,
        stripBlobKey: typeof r.stripBlobKey === "string" ? r.stripBlobKey : null,
        iconBlobKey: typeof r.iconBlobKey === "string" ? r.iconBlobKey : null,
        backFields: isBackFieldArray(r.backFields) ? r.backFields : null,
        merchant:
          r.merchant && typeof r.merchant === "object"
            ? {
                name:
                  typeof (r.merchant as Record<string, unknown>).name === "string"
                    ? ((r.merchant as Record<string, unknown>).name as string)
                    : null,
                email:
                  typeof (r.merchant as Record<string, unknown>).email === "string"
                    ? ((r.merchant as Record<string, unknown>).email as string)
                    : "",
              }
            : null,
      };
      setProgram(prog);
      setTemplateId(prog.templateId ?? "classique");
      setLogoBlobKey(prog.logoBlobKey);
      setStripBlobKey(prog.stripBlobKey);
      setBackFields(prog.backFields ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [programId]);

  function flashSaved() {
    setSavedFlash("Enregistré");
    window.setTimeout(() => setSavedFlash(null), 1500);
  }

  async function patchProgram(payload: Record<string, unknown>) {
    if (!programId) return false;
    const res = await fetch(`/api/programs/${programId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) flashSaved();
    return res.ok;
  }

  async function handleTemplateSelect(id: string) {
    setTemplateId(id);
    await patchProgram({ templateId: id });
  }

  function handleLogoUploaded(key: string) {
    setLogoBlobKey(key);
    setLogoVersion(Date.now());
    flashSaved();
  }

  async function handleStripLibrarySelect(stripId: string) {
    if (!programId) return;
    const entry = STRIP_LIBRARY.find((s) => s.id === stripId);
    if (!entry) return;
    const res = await fetch(entry.path);
    if (!res.ok) {
      alert("Image introuvable.");
      return;
    }
    const blob = await res.blob();
    const file = new File([blob], `${stripId}.png`, { type: "image/png" });
    const form = new FormData();
    form.set("file", file);
    form.set("type", "strip");
    form.set("skipTrim", "true");
    const up = await fetch(`/api/programs/${programId}/upload-image`, {
      method: "POST",
      body: form,
    });
    if (!up.ok) {
      alert("Upload échoué.");
      return;
    }
    const data: unknown = await up.json();
    const key =
      data && typeof data === "object" && typeof (data as { blobKey?: unknown }).blobKey === "string"
        ? (data as { blobKey: string }).blobKey
        : `program-${programId}/strip.png`;
    setStripBlobKey(key);
    setStripVersion(Date.now());
    flashSaved();
  }

  async function handleStripClear() {
    const ok = await patchProgram({ stripBlobKey: null });
    if (ok) {
      setStripBlobKey(null);
      setStripVersion(Date.now());
    }
  }

  function updateBackField(index: number, patch: Partial<BackField>) {
    setBackFields((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addBackField() {
    setBackFields((prev) =>
      prev.length >= MAX_BACK_FIELDS ? prev : [...prev, { label: "", value: "" }]
    );
  }

  function removeBackField(index: number) {
    const next = backFields.filter((_, i) => i !== index);
    setBackFields(next);
    void patchProgram({ backFields: next });
  }

  async function saveBackFields() {
    const cleaned = backFields.filter(
      (f) => f.label.trim() !== "" || f.value.trim() !== ""
    );
    await patchProgram({ backFields: cleaned });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !program) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/programs"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Programme introuvable.
          </CardContent>
        </Card>
      </div>
    );
  }

  const logoUrl = logoBlobKey ? `/api/blob/${logoBlobKey}?v=${logoVersion}` : null;
  const stripUrl = stripBlobKey ? `/api/blob/${stripBlobKey}?v=${stripVersion}` : null;
  const merchantName = program.merchant?.name || program.merchant?.email || "Mon enseigne";

  const showTemplate = !wizard || step === 1;
  const showLogo = !wizard || step === 2;
  const showStrip = !wizard || step === 3;
  const showBack = !wizard || step === 4;

  const templateContent = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {templates.map((t) => {
        const selected = t.id === templateId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTemplateSelect(t.id)}
            className={`group rounded-xl border p-2 text-left transition ${
              selected
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div
              className="mb-2 flex h-16 items-end justify-between rounded-lg p-2"
              style={{ backgroundColor: t.bgColor, color: t.textColor }}
            >
              <span className="text-[10px] font-semibold">Aa</span>
              <span className="text-[10px]" style={{ color: t.labelColor }}>
                Label
              </span>
            </div>
            <p className="text-sm font-medium">{t.name}</p>
          </button>
        );
      })}
    </div>
  );

  const logoContent = (
    <LogoUploader
      programId={programId ?? ""}
      currentLogoUrl={logoUrl}
      onUploaded={handleLogoUploaded}
    />
  );

  const stripContent = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <button
        type="button"
        onClick={handleStripClear}
        className={`flex h-20 items-center justify-center rounded-lg border-2 border-dashed text-sm font-medium transition ${
          !stripBlobKey
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-gray-300 text-gray-500 hover:border-gray-400"
        }`}
      >
        Aucun
      </button>
      {STRIP_LIBRARY.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => handleStripLibrarySelect(entry.id)}
          className="overflow-hidden rounded-lg border border-gray-200 transition hover:border-gray-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.path}
            alt={entry.label}
            className="h-20 w-full object-cover"
          />
          <p className="px-2 py-1 text-xs font-medium text-gray-700">
            {entry.label}
          </p>
        </button>
      ))}
    </div>
  );

  const backContent = (
    <div className="space-y-3">
      {backFields.map((field, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <Input
              placeholder={BACK_FIELD_SUGGESTIONS[i] ?? "Intitulé"}
              value={field.label}
              onChange={(e) => updateBackField(i, { label: e.target.value })}
              onBlur={saveBackFields}
            />
            <Input
              placeholder="Valeur"
              value={field.value}
              onChange={(e) => updateBackField(i, { value: e.target.value })}
              onBlur={saveBackFields}
            />
          </div>
          <button
            type="button"
            onClick={() => removeBackField(i)}
            className="mt-2 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {backFields.length < MAX_BACK_FIELDS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBackField}
        >
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un champ
        </Button>
      )}
    </div>
  );

  function renderSection(
    key: keyof typeof openSections,
    title: string,
    content: React.ReactNode
  ) {
    if (wizard) {
      return (
        <Card>
          <div className="px-6 py-4">
            <span className="text-base font-semibold text-gray-900">{title}</span>
          </div>
          <CardContent className="pt-0">{content}</CardContent>
        </Card>
      );
    }
    return (
      <Section
        title={title}
        open={openSections[key]}
        onToggle={() =>
          setOpenSections((s) => ({ ...s, [key]: !s[key] }))
        }
      >
        {content}
      </Section>
    );
  }

  function handleNext() {
    if (step >= WIZARD_STEPS) {
      router.push("/dashboard/programs");
      return;
    }
    setStep((s) => Math.min(WIZARD_STEPS, s + 1));
  }

  function handlePrev() {
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/programs"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
          <p className="text-sm text-gray-500">Personnaliser la carte</p>
        </div>
        {savedFlash && (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            {savedFlash}
          </span>
        )}
      </div>

      {wizard && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>
              Étape {step} sur {WIZARD_STEPS}
            </span>
            <span>{Math.round((step / WIZARD_STEPS) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(step / WIZARD_STEPS) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <div className="space-y-4">
          {showTemplate &&
            renderSection("template", "Choisir un template", templateContent)}
          {showLogo && renderSection("logo", "Upload du logo", logoContent)}
          {showStrip &&
            renderSection("strip", "Choisir un bandeau", stripContent)}
          {showBack && renderSection("back", "Textes verso", backContent)}

          {wizard && (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={step === 1}
              >
                Précédent
              </Button>
              <Button type="button" onClick={handleNext}>
                {step === WIZARD_STEPS ? "Terminer" : "Suivant"}
              </Button>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <CardPreview
            templateId={templateId}
            logoUrl={logoUrl}
            stripUrl={stripUrl}
            programName={program.name}
            merchantName={merchantName}
            backFields={backFields.filter(
              (f) => f.label.trim() !== "" || f.value.trim() !== ""
            )}
            currentStamps={3}
            maxStamps={10}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-base font-semibold text-gray-900">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
