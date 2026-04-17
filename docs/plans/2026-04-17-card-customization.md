# Card Customization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à un restaurateur d'uploader son logo, choisir un template et un bandeau, personnaliser les textes au verso, et voir une preview live iPhone/Android — avec injection réelle dans les pass Apple/Google Wallet.

**Architecture:** Backend-first. Ajout de champs Prisma pour référencer des blobs Netlify, API d'upload avec traitement `sharp` (auto-trim + resize), puis intégration dans `apple.ts`/`google.ts` existants. UI en deux temps : page d'édition unique d'abord (MVP), wizard multi-étapes ensuite.

**Tech Stack:** Next.js 16 App Router, Prisma 7, `sharp` pour traitement image, `@netlify/blobs` pour stockage, `shadcn/ui` pour composants, `react-easy-crop` pour UI recadrage manuel.

**Design doc de référence :** `docs/plans/2026-04-17-card-customization-design.md`

---

## Phase 1 — Backend foundation

### Task 1 : Migration Prisma

**Files:**
- Modify: `prisma/schema.prisma` (ajouter 5 champs sur `LoyaltyProgram`)
- Create: `prisma/migrations/<timestamp>_add_card_customization_fields/migration.sql`

**Step 1: Éditer le schéma**

Ajouter dans le modèle `LoyaltyProgram` :

```prisma
templateId      String?   @default("classique")
logoBlobKey     String?
stripBlobKey    String?
iconBlobKey     String?
backFields      Json?
```

**Step 2: Générer la migration**

Run: `npx prisma migrate dev --name add_card_customization_fields`
Expected: migration créée + DB mise à jour + Prisma Client regénéré.

**Step 3: Vérifier**

Run: `npx prisma studio` et vérifier les nouvelles colonnes sur `LoyaltyProgram`.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add card customization fields to LoyaltyProgram"
```

---

### Task 2 : Installer dépendances

**Files:**
- Modify: `package.json`

**Step 1: Installer**

Run: `npm install sharp @netlify/blobs react-easy-crop`

**Step 2: Vérifier**

Run: `npm run build` pour s'assurer qu'aucune incompatibilité.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add sharp, @netlify/blobs, react-easy-crop deps"
```

---

### Task 3 : Module de templates statiques

**Files:**
- Create: `src/lib/wallet/templates.ts`
- Test: `src/lib/wallet/__tests__/templates.test.ts`

**Step 1: Écrire le test**

```typescript
import { templates, getTemplate } from "../templates";

describe("templates", () => {
  it("exposes 5 templates", () => {
    expect(templates).toHaveLength(5);
  });
  it("each template has id/name/colors", () => {
    for (const t of templates) {
      expect(t.id).toMatch(/^[a-z]+$/);
      expect(t.name).toBeTruthy();
      expect(t.bgColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.textColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.labelColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it("getTemplate returns classique for unknown id", () => {
    expect(getTemplate("unknown")?.id).toBe("classique");
  });
});
```

**Step 2: Faire échouer**

Run: `npm test templates.test.ts`
Expected: FAIL (module inexistant).

**Step 3: Implémenter**

```typescript
export type Template = {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
  labelColor: string;
};

export const templates: Template[] = [
  { id: "classique", name: "Classique", bgColor: "#1a1a2e", textColor: "#ffffff", labelColor: "#cfcfcf" },
  { id: "moderne",   name: "Moderne",   bgColor: "#ffffff", textColor: "#111111", labelColor: "#666666" },
  { id: "gourmet",   name: "Gourmet",   bgColor: "#4a1e1e", textColor: "#f5d98e", labelColor: "#d4a953" },
  { id: "pastel",    name: "Pastel",    bgColor: "#f7c6d9", textColor: "#2e2e2e", labelColor: "#8a5a7a" },
  { id: "vintage",   name: "Vintage",   bgColor: "#2c3e2d", textColor: "#f5e6c8", labelColor: "#c9b68a" },
];

export function getTemplate(id?: string | null): Template {
  return templates.find((t) => t.id === id) || templates[0];
}
```

**Step 4: Vérifier les tests passent**

Run: `npm test templates.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/wallet/templates.ts src/lib/wallet/__tests__/
git commit -m "feat: add 5 card templates with colors"
```

---

### Task 4 : Pipeline de traitement image (sharp)

**Files:**
- Create: `src/lib/wallet/image-processing.ts`
- Test: `src/lib/wallet/__tests__/image-processing.test.ts`
- Create: `src/lib/wallet/__tests__/fixtures/logo-with-whitespace.png` (fixture de test)

**Step 1: Écrire le test**

```typescript
import { processLogo, processStrip, processIcon } from "../image-processing";
import fs from "fs";
import path from "path";

const fixturePath = path.join(__dirname, "fixtures/logo-with-whitespace.png");

describe("processLogo", () => {
  it("trims whitespace and resizes to 160x50 max", async () => {
    const input = fs.readFileSync(fixturePath);
    const out = await processLogo(input);
    const sharp = (await import("sharp")).default;
    const meta = await sharp(out).metadata();
    expect(meta.width).toBeLessThanOrEqual(160);
    expect(meta.height).toBeLessThanOrEqual(50);
    expect(meta.format).toBe("png");
  });
  it("rejects non-image input", async () => {
    await expect(processLogo(Buffer.from("not an image"))).rejects.toThrow();
  });
});

describe("processIcon", () => {
  it("crops square to 29x29", async () => {
    const input = fs.readFileSync(fixturePath);
    const out = await processIcon(input);
    const sharp = (await import("sharp")).default;
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(29);
    expect(meta.height).toBe(29);
  });
});

describe("processStrip", () => {
  it("resizes to 375x98 cover", async () => {
    const input = fs.readFileSync(fixturePath);
    const out = await processStrip(input);
    const sharp = (await import("sharp")).default;
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(375);
    expect(meta.height).toBe(98);
  });
});
```

**Step 2: Créer la fixture**

Run: `node -e "require('sharp')({create:{width:500,height:500,channels:4,background:{r:255,g:255,b:255,alpha:1}}}).composite([{input:Buffer.from('<svg><circle cx=\"250\" cy=\"250\" r=\"100\" fill=\"red\"/></svg>')}]).png().toFile('src/lib/wallet/__tests__/fixtures/logo-with-whitespace.png')"`

**Step 3: Faire échouer les tests**

Run: `npm test image-processing.test.ts`
Expected: FAIL.

**Step 4: Implémenter**

```typescript
import sharp from "sharp";

export async function processLogo(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .trim()
    .resize(160, 50, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

export async function processIcon(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .trim()
    .resize(29, 29, { fit: "cover" })
    .png()
    .toBuffer();
}

export async function processStrip(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(375, 98, { fit: "cover" })
    .png()
    .toBuffer();
}

export async function validateImageBuffer(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata();
    return ["png", "jpeg", "webp"].includes(meta.format || "");
  } catch {
    return false;
  }
}
```

**Step 5: Tests passent**

Run: `npm test image-processing.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/wallet/image-processing.ts src/lib/wallet/__tests__/
git commit -m "feat: add sharp-based image processing pipeline"
```

---

### Task 5 : Wrapper Netlify Blobs

**Files:**
- Create: `src/lib/blob-store.ts`
- Test: `src/lib/__tests__/blob-store.test.ts`

**Step 1: Écrire le test (avec mock)**

```typescript
jest.mock("@netlify/blobs", () => {
  const store = new Map<string, Buffer>();
  return {
    getStore: () => ({
      set: jest.fn(async (key: string, data: Buffer) => { store.set(key, data); }),
      get: jest.fn(async (key: string) => store.get(key) || null),
      delete: jest.fn(async (key: string) => { store.delete(key); }),
    }),
  };
});

import { putBlob, getBlob, deleteBlob } from "../blob-store";

test("put/get/delete cycle", async () => {
  const key = "test/logo.png";
  const data = Buffer.from("fake png");
  await putBlob(key, data);
  expect(await getBlob(key)).toEqual(data);
  await deleteBlob(key);
  expect(await getBlob(key)).toBeNull();
});
```

**Step 2: Faire échouer**

Run: `npm test blob-store.test.ts`
Expected: FAIL.

**Step 3: Implémenter**

```typescript
import { getStore } from "@netlify/blobs";

const STORE_NAME = "card-assets";

function store() {
  return getStore(STORE_NAME);
}

export async function putBlob(key: string, data: Buffer): Promise<void> {
  await store().set(key, data);
}

export async function getBlob(key: string): Promise<Buffer | null> {
  const data = await store().get(key, { type: "buffer" });
  return data ? Buffer.from(data as ArrayBuffer) : null;
}

export async function deleteBlob(key: string): Promise<void> {
  await store().delete(key);
}

export function keyForProgram(programId: string, asset: "logo" | "strip" | "icon"): string {
  return `program-${programId}/${asset}.png`;
}
```

**Step 4: Tests passent**

Run: `npm test blob-store.test.ts`

**Step 5: Commit**

```bash
git add src/lib/blob-store.ts src/lib/__tests__/
git commit -m "feat: add Netlify Blobs wrapper for card assets"
```

---

### Task 6 : API route upload

**Files:**
- Create: `src/app/api/programs/[programId]/upload-image/route.ts`
- Test: `src/app/api/programs/[programId]/upload-image/__tests__/route.test.ts`

**Step 1: Test d'intégration**

```typescript
// Vérifie : auth requise, ownership, type fichier, taille, pipeline appelé, blob key stocké en DB.
// (Squelette — à détailler dans la session d'implémentation selon le setup jest existant)
```

**Step 2: Implémenter**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processLogo, processStrip, processIcon, validateImageBuffer } from "@/lib/wallet/image-processing";
import { putBlob, keyForProgram } from "@/lib/blob-store";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { programId } = await params;
  const program = await prisma.loyaltyProgram.findUnique({ where: { id: programId } });
  if (!program || program.merchantId !== session.user.id) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = form.get("type") as "logo" | "strip" | "icon" | null;
  if (!file || !type) return NextResponse.json({ error: "file + type requis" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fichier > 5MB" }, { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  if (!(await validateImageBuffer(input))) {
    return NextResponse.json({ error: "Format d'image invalide" }, { status: 400 });
  }

  let processed: Buffer;
  let updateField: "logoBlobKey" | "stripBlobKey" | "iconBlobKey";
  switch (type) {
    case "logo":  processed = await processLogo(input);  updateField = "logoBlobKey"; break;
    case "strip": processed = await processStrip(input); updateField = "stripBlobKey"; break;
    case "icon":  processed = await processIcon(input);  updateField = "iconBlobKey"; break;
  }

  const key = keyForProgram(programId, type);
  await putBlob(key, processed);

  const updateData: Record<string, string> = { [updateField]: key };
  // Auto-génération icône depuis logo
  if (type === "logo") {
    const iconBuf = await processIcon(input);
    const iconKey = keyForProgram(programId, "icon");
    await putBlob(iconKey, iconBuf);
    updateData.iconBlobKey = iconKey;
  }
  await prisma.loyaltyProgram.update({ where: { id: programId }, data: updateData });

  return NextResponse.json({ ok: true, key });
}
```

**Step 3: Commit**

```bash
git add src/app/api/programs/[programId]/upload-image/
git commit -m "feat: add image upload API for card assets"
```

---

### Task 7 : API route proxy blob

**Files:**
- Create: `src/app/api/blob/[...path]/route.ts`

**Step 1: Implémenter**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBlob } from "@/lib/blob-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
  const data = await getBlob(key);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/blob/
git commit -m "feat: add public proxy to serve blob assets"
```

---

### Task 8 : Intégrer blobs dans la génération Apple pass

**Files:**
- Modify: `src/lib/wallet/apple.ts` (fonction `generateSignedPass`)

**Step 1: Remplacer la lecture fichier par fetch blob**

Dans `generateSignedPass`, remplacer les blocs `fs.readFileSync(logoPath)` et `fs.readFileSync(iconPath)` par :

```typescript
import { getBlob, keyForProgram } from "@/lib/blob-store";

// ... dans generateSignedPass, après la création du pass :
const logoBlob = program.logoBlobKey ? await getBlob(program.logoBlobKey) : null;
if (logoBlob) {
  pass.addBuffer("logo.png", logoBlob);
  pass.addBuffer("logo@2x.png", logoBlob);
}

const iconBlob = program.iconBlobKey ? await getBlob(program.iconBlobKey) : null;
if (iconBlob) {
  pass.addBuffer("icon.png", iconBlob);
  pass.addBuffer("icon@2x.png", iconBlob);
}

const stripBlob = program.stripBlobKey ? await getBlob(program.stripBlobKey) : null;
if (stripBlob) {
  pass.addBuffer("strip.png", stripBlob);
  pass.addBuffer("strip@2x.png", stripBlob);
}
```

Fallback sur les fichiers existants dans `public/wallet-assets/` si pas de blob (code actuel).

**Step 2: Ajouter les backFields dynamiques**

Remplacer `pass.backFields.push(...)` par une boucle sur `program.backFields` (Json).

**Step 3: Propager `program` jusqu'à `generateSignedPass`**

La signature actuelle reçoit `passData: PassData`. Il faut passer aussi `program` pour accéder aux blob keys. Adapter.

**Step 4: Commit**

```bash
git add src/lib/wallet/apple.ts
git commit -m "feat: use uploaded blobs for Apple pass assets"
```

---

### Task 9 : Intégrer blobs dans Google Wallet

**Files:**
- Modify: `src/lib/wallet/google.ts`

Même principe que Task 8 pour Google Wallet. Le pass Google expose `logoUri` et `heroImage.sourceUri` — pointer vers `/api/blob/program-{id}/logo.png` (URL publique servie par Task 7).

**Commit:**
```bash
git commit -m "feat: use uploaded blobs for Google Wallet pass"
```

---

## Phase 2 — UI édition (page unique)

### Task 10 : Bibliothèque de bandeaux placeholders

**Files:**
- Create: `public/strip-library/cafe.png`, `boulangerie.png`, `bar.png`, `restaurant.png`, `patisserie.png`, `fast-food.png`, `pizzeria.png`, `generique.png`
- Create: `src/lib/wallet/strip-library.ts` (manifest)

**Step 1: Générer 8 gradients via sharp**

Script one-shot qui génère 8 PNGs 375×98 avec des gradients distincts.

**Step 2: Manifest**

```typescript
export const stripLibrary = [
  { id: "cafe", name: "Café", url: "/strip-library/cafe.png" },
  // ... 7 autres
];
```

**Step 3: Commit**

```bash
git add public/strip-library/ src/lib/wallet/strip-library.ts
git commit -m "feat: add 8 placeholder strip images"
```

---

### Task 11 : Composant `CardPreview` (mockup iPhone + toggle Android)

**Files:**
- Create: `src/components/card-preview/CardPreview.tsx`
- Create: `src/components/card-preview/iphone-frame.svg`
- Create: `src/components/card-preview/android-frame.svg`

**Step 1: Composant**

Reçoit `{ program, logoUrl, stripUrl, template, backFields }` et dessine la carte à l'intérieur d'un frame SVG iPhone (stock). Toggle state pour switcher vers Android.

Taille de la carte = proportions réelles d'un Wallet pass (335×210 environ).

**Step 2: Commit**

```bash
git commit -m "feat: add CardPreview mockup component"
```

---

### Task 12 : Page édition `/dashboard/programs/[id]/customize`

**Files:**
- Create: `src/app/(dashboard)/dashboard/programs/[id]/customize/page.tsx`
- Create: `src/app/(dashboard)/dashboard/programs/[id]/customize/TemplateSection.tsx`
- Create: `src/app/(dashboard)/dashboard/programs/[id]/customize/LogoSection.tsx`
- Create: `src/app/(dashboard)/dashboard/programs/[id]/customize/StripSection.tsx`
- Create: `src/app/(dashboard)/dashboard/programs/[id]/customize/BackFieldsSection.tsx`

Layout 2 colonnes (grid). Gauche = sections repliables avec les 5 thèmes (template / logo / bandeau / verso / couleurs avancées). Droite = `<CardPreview />` sticky.

Chaque modif = state local + autosave debounced via `PATCH /api/programs/[id]`.

**Step 2: Ajouter un lien depuis la page `/dashboard/programs`** vers cette page pour chaque programme.

**Step 3: Commit**

```bash
git commit -m "feat: add customize page for existing programs"
```

---

### Task 13 : UI upload logo avec auto-crop preview + crop manuel

**Files:**
- Create: `src/components/card-preview/LogoUploader.tsx`

**Step 1: Flow**

- Zone drop/sélection
- Après upload → affiche aperçu du résultat trimé
- 2 boutons : "Parfait" (sauve) / "Recadrer manuellement" (ouvre modal `react-easy-crop`)
- Dans le modal : user drag/zoom la zone de crop → submit → re-POST au serveur avec skip trim

**Step 2: Adapter `POST /api/programs/[id]/upload-image`** pour accepter un paramètre `skipTrim=true` (dans ce cas on ne fait que resize, pas de `.trim()`).

**Step 3: Commit**

```bash
git commit -m "feat: add manual crop fallback for logo upload"
```

---

## Phase 3 — Wizard création

### Task 14 : Intégrer le wizard dans la création de programme existant

**Files:**
- Modify: `src/app/(dashboard)/dashboard/programs/page.tsx`

Ajouter un mode "création" multi-étapes après la création initiale du programme : redirige vers `/dashboard/programs/[id]/customize?wizard=true` qui affiche une version pas-à-pas.

**Step 1: Ajouter `?wizard=true` support dans la page customize**
- Barre de progression en haut
- Affichage d'une section à la fois
- Boutons "Précédent / Suivant / Skip"
- À la fin, redirige vers la page édition standard

**Step 2: Commit**

```bash
git commit -m "feat: add wizard mode for first-time program customization"
```

---

## Phase 4 — Déploiement & tests

### Task 15 : Mettre à jour les env vars Netlify

Les nouvelles features n'en ajoutent pas (Netlify Blobs est auto-configuré via le contexte Netlify). Vérifier `package.json` contient bien `@netlify/blobs` et `sharp`.

### Task 16 : E2E manuel

- Créer un programme
- Uploader un logo
- Choisir template + bandeau
- Remplir verso
- Télécharger un .pkpass et l'ouvrir sur iPhone (ou mock si pas de certs)
- Valider rendu visuel

### Task 17 : Déployer sur Netlify

```bash
git push
# Demander confirmation à Ludo avant deploy production Netlify
```

---

## Notes d'exécution

- **Commits fréquents** : 1 commit par task (minimum). Format conventional commits (`feat:`, `fix:`, `test:`).
- **Tests unitaires** : obligatoires pour Phase 1 (logique pure + traitement image). Pour UI, tests manuels + visuel suffisent.
- **Ordre** : Phase 1 bloque tout le reste. Phase 2 et 3 peuvent se chevaucher. Phase 4 = après.
- **Sécurité** : le problème du `certificates/signer.key` committé reste à traiter (hors scope de ce plan, géré côté Fabian).
