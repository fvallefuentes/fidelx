"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Sparkles,
  Stamp,
  Camera,
} from "lucide-react";
import {
  ONBOARDING_TEMPLATES,
  type OnboardingTemplate,
} from "@/lib/onboarding-templates";

type Step = 1 | 2 | 3 | 4;

type ProgramDraft = {
  template?: OnboardingTemplate;
  name: string;
  maxStamps: number;
  rewardName: string;
  bgColor: string;
  textColor: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<ProgramDraft>({
    name: "",
    maxStamps: 10,
    rewardName: "",
    bgColor: "#1a1a2e",
    textColor: "#ffffff",
  });
  const [creating, setCreating] = useState(false);
  const [createdProgramId, setCreatedProgramId] = useState<string>("");
  const [error, setError] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  // Vérifier au mount que l'onboarding est nécessaire
  useEffect(() => {
    fetch("/api/merchants/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsOnboarding) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  // Step 1 : sélection template + customisation
  function selectTemplate(tpl: OnboardingTemplate) {
    setDraft({
      template: tpl,
      name: tpl.programName,
      maxStamps: tpl.config.maxStamps,
      rewardName: tpl.reward.name,
      bgColor: tpl.cardDesign.bgColor,
      textColor: tpl.cardDesign.textColor,
    });
    setStep(2);
  }

  // Step 2 → 3 : créer le programme
  async function createProgram() {
    if (!draft.template) {
      setError("Sélectionnez un modèle avant de continuer");
      return;
    }
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          type: draft.template.type,
          config: { maxStamps: draft.maxStamps },
          cardDesign: {
            bgColor: draft.bgColor,
            textColor: draft.textColor,
          },
          rewards: [
            {
              name: draft.rewardName,
              description: draft.template.reward.description,
              threshold: draft.maxStamps,
              rewardType: draft.template.reward.rewardType,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        setCreating(false);
        return;
      }
      setCreatedProgramId(data.id);
      setStep(3);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setCreating(false);
    }
  }

  // Step 4 → finish
  async function finishOnboarding() {
    setFinalizing(true);
    try {
      await fetch("/api/merchants/onboarding/complete", { method: "POST" });
      router.push("/dashboard");
    } catch {
      setFinalizing(false);
      setError("Erreur lors de la finalisation");
    }
  }

  return (
    <div className="onb-shell">
      <div className="onb-header">
        <div className="onb-brand">
          <span className="onb-brand-mark">F</span>
          <span>FIDLIFY</span>
        </div>
        <div className="onb-greet">
          Bonjour <strong>{session?.user?.name ?? ""}</strong> 👋
        </div>
      </div>

      <div className="onb-stepper">
        {[1, 2, 3, 4].map((n) => {
          const labels = ["Programme", "Carte", "QR code", "Test"];
          return (
            <div
              key={n}
              className={`onb-step${step === n ? " current" : ""}${step > n ? " done" : ""}`}
            >
              <div className="onb-step-num">{step > n ? <Check size={14} /> : n}</div>
              <span className="onb-step-label">{labels[n - 1]}</span>
            </div>
          );
        })}
      </div>

      <div className="onb-content">
        {step === 1 && (
          <Step1
            onSelect={selectTemplate}
            onSkipToCustom={async () => {
              // Marquer l'onboarding comme terminé AVANT de rediriger.
              // Sinon le layout (dashboard)/layout.tsx voit needsOnboarding=true
              // et bounce direct vers /dashboard/onboarding → boucle infinie.
              try {
                await fetch("/api/merchants/onboarding/complete", {
                  method: "POST",
                });
              } catch {
                /* non bloquant — pire cas on bounce, mais le merchant
                   peut retenter ou créer un programme classique */
              }
              router.push("/dashboard/programs?new=1");
            }}
          />
        )}

        {step === 2 && (
          <Step2
            draft={draft}
            setDraft={setDraft}
            error={error}
            creating={creating}
            onBack={() => setStep(1)}
            onContinue={createProgram}
          />
        )}

        {step === 3 && createdProgramId && (
          <Step3
            programId={createdProgramId}
            programName={draft.name}
            onContinue={() => setStep(4)}
          />
        )}

        {step === 4 && createdProgramId && (
          <Step4
            programId={createdProgramId}
            onFinish={finishOnboarding}
            finalizing={finalizing}
          />
        )}
      </div>
    </div>
  );
}

/* ───────── STEP 1 : Templates ───────── */
function Step1({
  onSelect,
  onSkipToCustom,
}: {
  onSelect: (t: OnboardingTemplate) => void;
  onSkipToCustom: () => void;
}) {
  return (
    <div className="onb-card">
      <div className="onb-card-head">
        <div className="onb-eyebrow">
          <Sparkles size={12} />
          ÉTAPE 1 SUR 4
        </div>
        <h1 className="onb-title">Choisissez un modèle de programme</h1>
        <p className="onb-sub">
          Sélectionnez le type de commerce le plus proche du vôtre. Vous pourrez
          tout personnaliser à l&apos;étape suivante.
        </p>
      </div>

      <div className="onb-templates">
        {ONBOARDING_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className="onb-template-card"
            onClick={() => onSelect(tpl)}
          >
            <span className="onb-template-emoji">{tpl.emoji}</span>
            <div className="onb-template-info">
              <div className="onb-template-title">{tpl.title}</div>
              <div className="onb-template-subtitle">{tpl.subtitle}</div>
            </div>
            <ChevronRight size={16} className="onb-template-arrow" />
          </button>
        ))}
      </div>

      <div className="onb-actions">
        <button
          type="button"
          onClick={onSkipToCustom}
          className="onb-link"
        >
          Je préfère partir d&apos;une carte vierge →
        </button>
      </div>
    </div>
  );
}

/* ───────── STEP 2 : Personnalisation + preview ───────── */
function Step2({
  draft,
  setDraft,
  error,
  creating,
  onBack,
  onContinue,
}: {
  draft: ProgramDraft;
  setDraft: (d: ProgramDraft) => void;
  error: string;
  creating: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="onb-card">
      <div className="onb-card-head">
        <div className="onb-eyebrow">
          <Sparkles size={12} />
          ÉTAPE 2 SUR 4
        </div>
        <h1 className="onb-title">Personnalisez votre carte</h1>
        <p className="onb-sub">
          Adaptez le nom du programme, la récompense et les couleurs. Vous
          verrez l&apos;aperçu en temps réel.
        </p>
      </div>

      <div className="onb-step2-grid">
        <div className="onb-form">
          <label className="onb-field">
            <span>Nom du programme</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ex: Carte café fidélité"
            />
          </label>

          <label className="onb-field">
            <span>Nombre de tampons pour la récompense</span>
            <div className="onb-stepper-inline">
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    maxStamps: Math.max(3, draft.maxStamps - 1),
                  })
                }
              >
                −
              </button>
              <span className="onb-step-value">{draft.maxStamps}</span>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    maxStamps: Math.min(20, draft.maxStamps + 1),
                  })
                }
              >
                +
              </button>
            </div>
          </label>

          <label className="onb-field">
            <span>Récompense au {draft.maxStamps}ᵉ tampon</span>
            <input
              type="text"
              value={draft.rewardName}
              onChange={(e) =>
                setDraft({ ...draft, rewardName: e.target.value })
              }
              placeholder="Ex: 1 café offert"
            />
          </label>

          <div className="onb-field">
            <span>Couleur de fond</span>
            <div className="onb-color-row">
              {[
                "#1a1a2e",
                "#3e2723",
                "#212121",
                "#283593",
                "#8d6e63",
                "#d4ff4e",
                "#ec407a",
                "#ffffff",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      bgColor: c,
                      textColor: isDark(c) ? "#ffffff" : "#1a1a1a",
                    })
                  }
                  className={`onb-color-dot${draft.bgColor === c ? " active" : ""}`}
                  style={{ background: c }}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <div className="onb-error">{error}</div>}
        </div>

        <CardPreview draft={draft} />
      </div>

      <div className="onb-actions">
        <button type="button" onClick={onBack} className="onb-btn-ghost">
          <ArrowLeft size={14} /> Retour
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={creating || !draft.name || !draft.rewardName}
          className="onb-btn-primary"
        >
          {creating ? "Création…" : "Créer mon programme"}
          {!creating && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  );
}

/* ───────── STEP 3 : QR code + impression ───────── */
function Step3({
  programId,
  programName,
  onContinue,
}: {
  programId: string;
  programName: string;
  onContinue: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloaded, setDownloaded] = useState(false);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join/${programId}`;
  }, [programId]);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, joinUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#0a0d04", light: "#ffffff" },
    }).catch(() => {});
  }, [joinUrl]);

  async function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `fidlify-qr-${programId}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    setDownloaded(true);
  }

  async function handlePrintPoster() {
    // Imprime une affiche A4 avec le QR + un message d'invitation
    const win = window.open("", "_blank", "noopener");
    if (!win) return;
    const dataUrl = canvasRef.current?.toDataURL("image/png") || "";
    win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Affiche Fidlify — ${programName}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system,BlinkMacSystemFont,sans-serif; text-align:center; padding:0; margin:0; }
  .wrap { max-width:160mm; margin:20mm auto 0; }
  h1 { font-size:32pt; margin:0 0 4mm; font-weight:700; letter-spacing:-0.02em; }
  h2 { font-size:18pt; margin:0 0 16mm; color:#555; font-weight:500; }
  .qr { display:inline-block; padding:8mm; background:#fff; border:1px solid #000; border-radius:6mm; }
  .qr img { width:90mm; height:90mm; display:block; }
  .steps { margin-top:14mm; font-size:11pt; color:#333; text-align:left; max-width:120mm; margin-left:auto; margin-right:auto; }
  .step { display:flex; gap:6mm; margin:6mm 0; align-items:center; }
  .step-n { width:10mm; height:10mm; border-radius:50%; background:#000; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; }
  .foot { margin-top:20mm; font-size:9pt; color:#999; }
</style></head><body>
<div class="wrap">
  <h1>${programName}</h1>
  <h2>Carte de fidélité digitale — sans application</h2>
  <div class="qr"><img src="${dataUrl}" alt="QR code" /></div>
  <div class="steps">
    <div class="step"><div class="step-n">1</div><div>Ouvrez l'appareil photo de votre smartphone</div></div>
    <div class="step"><div class="step-n">2</div><div>Scannez ce QR code</div></div>
    <div class="step"><div class="step-n">3</div><div>Votre carte s'ajoute dans Apple Wallet ou Google Wallet</div></div>
  </div>
  <div class="foot">Propulsé par fidlify.com</div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`);
    win.document.close();
  }

  return (
    <div className="onb-card">
      <div className="onb-card-head">
        <div className="onb-eyebrow">
          <Sparkles size={12} />
          ÉTAPE 3 SUR 4
        </div>
        <h1 className="onb-title">Téléchargez votre QR code</h1>
        <p className="onb-sub">
          Affichez ce QR code en boutique (caisse, table, vitrine). Vos clients
          le scanneront pour obtenir leur carte de fidélité.
        </p>
      </div>

      <div className="onb-qr-zone">
        <div className="onb-qr-frame">
          <canvas ref={canvasRef} />
        </div>
        <div className="onb-qr-info">
          <p className="onb-qr-url">{joinUrl}</p>
          <div className="onb-qr-actions">
            <button
              type="button"
              onClick={handleDownload}
              className="onb-btn-ghost"
            >
              <Download size={14} /> Télécharger PNG
            </button>
            <button
              type="button"
              onClick={handlePrintPoster}
              className="onb-btn-ghost"
            >
              <Download size={14} /> Affiche A4 à imprimer
            </button>
          </div>
        </div>
      </div>

      <div className="onb-actions">
        <button
          type="button"
          onClick={onContinue}
          className="onb-btn-primary"
        >
          {downloaded ? "J'ai téléchargé mon QR" : "Continuer sans télécharger"}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ───────── STEP 4 : Test scan ───────── */
function Step4({
  programId,
  onFinish,
  finalizing,
}: {
  programId: string;
  onFinish: () => void;
  finalizing: boolean;
}) {
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${programId}`
      : "";

  return (
    <div className="onb-card">
      <div className="onb-card-head">
        <div className="onb-eyebrow">
          <Sparkles size={12} />
          ÉTAPE 4 SUR 4
        </div>
        <h1 className="onb-title">Testez avec votre propre carte</h1>
        <p className="onb-sub">
          Prenez votre smartphone et scannez le QR ci-dessous. Cela créera votre
          carte de test que vous pourrez ajouter à votre Wallet pour voir
          exactement ce que vos clients verront.
        </p>
      </div>

      <div className="onb-test-grid">
        <div className="onb-test-step">
          <div className="onb-test-n">1</div>
          <div>
            <h3>Ouvrez l&apos;appareil photo de votre smartphone</h3>
            <p>iPhone ou Android — pas besoin d&apos;app spéciale.</p>
          </div>
        </div>
        <div className="onb-test-step">
          <div className="onb-test-n">2</div>
          <div>
            <h3>Scannez le QR code ci-dessous</h3>
            <p>
              Suivez les instructions sur votre téléphone, remplissez le
              formulaire avec votre prénom et email.
            </p>
            <div className="onb-test-link">
              <Camera size={14} />
              <a href={joinUrl} target="_blank" rel="noreferrer">
                Ouvrir le lien directement
              </a>
              <ExternalLink size={12} />
            </div>
          </div>
        </div>
        <div className="onb-test-step">
          <div className="onb-test-n">3</div>
          <div>
            <h3>Ajoutez la carte à votre Wallet</h3>
            <p>
              Apple Wallet ou Google Wallet selon votre téléphone. La carte
              apparaît instantanément.
            </p>
          </div>
        </div>
      </div>

      <div className="onb-actions">
        <button
          type="button"
          onClick={onFinish}
          disabled={finalizing}
          className="onb-btn-primary onb-btn-big"
        >
          <Stamp size={16} />
          {finalizing ? "Finalisation…" : "C'est fait, accéder à mon tableau de bord"}
        </button>
      </div>
    </div>
  );
}

/* ───────── Card Preview (Step 2) ───────── */
function CardPreview({ draft }: { draft: ProgramDraft }) {
  const total = Math.min(20, Math.max(3, draft.maxStamps));
  const rows = total <= 5 ? 1 : 2;
  const perRow = Math.ceil(total / rows);
  return (
    <div className="onb-preview">
      <div
        className="onb-preview-card"
        style={{ background: draft.bgColor, color: draft.textColor }}
      >
        <div className="onb-preview-head">
          <span className="onb-preview-brand">FIDLIFY · WALLET</span>
          <span className="onb-preview-icon" />
        </div>
        <div className="onb-preview-name">{draft.name || "Nom du programme"}</div>
        <div
          className="onb-preview-stamps"
          style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="onb-preview-stamp"
              style={{
                borderColor: isDark(draft.bgColor)
                  ? "rgb(var(--ovr) / 0.3)"
                  : "rgba(0,0,0,0.2)",
              }}
            />
          ))}
        </div>
        <div className="onb-preview-foot">
          <div className="onb-preview-reward">
            <strong>0</strong>/{draft.maxStamps} ·{" "}
            {draft.rewardName || "Récompense"}
          </div>
        </div>
      </div>
      <span className="onb-preview-label">APERÇU</span>
    </div>
  );
}

function isDark(hex: string): boolean {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return true;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
