# Design — Personnalisation des cartes de fidélité (merchant-side)

**Date** : 2026-04-17
**Branche** : `proto_ludo`
**Statut** : design validé, plan d'implémentation à suivre

## Contexte

Aujourd'hui, un restaurateur peut configurer les couleurs de sa carte de fidélité (bg, text) depuis le dashboard, mais le **logo** rendu dans le pass Apple Wallet est hardcodé (logo FidelX global). Objectif : permettre au merchant de rendre sa carte visuellement distincte (logo propre + bandeau thématique + couleurs + textes au verso), via une UX simple et guidée.

## Contraintes

Apple Wallet et Google Wallet imposent un **layout fixe**. Pas de positionnement libre d'éléments, pas de police custom. La liberté offerte au merchant se limite à :
- Les **images** (logo, bandeau "strip", icône)
- Les **couleurs** (bg, texte, labels)
- Les **textes** (nom, description, champs au verso)

## Section 1 — Architecture & stockage

- Nouvelle page : `/dashboard/programs/[id]/customize` pour l'édition.
- Intégration dans le flow de création de programme existant (wizard multi-étapes).
- **Stockage images** : Netlify Blobs, clés `program-{id}/logo.png`, `program-{id}/strip.png`, `program-{id}/icon.png`.
- **DB** : nouveaux champs sur `LoyaltyProgram` :
  - `templateId: String?` (ref vers template statique)
  - `logoBlobKey: String?`
  - `stripBlobKey: String?`
  - `iconBlobKey: String?`
  - `backFields: Json?` (array de `{label, value, isCustom}`)
- **Traitement images** : lib `sharp` server-side, auto-trim + resize aux dimensions cibles.
- **API routes** :
  - `POST /api/programs/[id]/upload-image` (type: logo|strip|icon) — traite + stocke
  - `GET /api/blob/[...path]` — proxy public pour servir les blobs
  - `PATCH /api/programs/[id]` — update template / couleurs / textes verso
- **Templates** : fichier statique `src/lib/wallet/templates.ts` (pas en DB).

## Section 2 — Flux utilisateur

### 1ère création : wizard 4 étapes

1. **Choisir un template** — grille de 5 vignettes (mini-preview).
2. **Upload du logo** — drag & drop ou sélecteur de fichier, traitement auto (< 2s), preview + boutons "Parfait" / "Recadrer manuellement". Icône 29×29 auto-générée silencieusement.
3. **Choisir un bandeau** — grille de 8 bandeaux + option "Aucun bandeau".
4. **Textes verso & preview** — 3 champs préremplis optionnels (Contact, Horaires, Site web) + jusqu'à 3 slots libres + mockup iPhone live (toggle Android).

Navigation "Précédent / Suivant" + barre de progression. Les étapes 3 et 4 skippables.

### Édition ensuite : page unique

URL : `/dashboard/programs/[id]/customize`. Layout 2 colonnes : sections repliables à gauche (Template / Logo / Bandeau / Verso / Couleurs avancées), mockup iPhone sticky à droite avec toggle iOS/Android. Preview live instantané.

## Section 3 — Templates & bandeaux

### Templates (5)

| Template | bgColor | textColor | labelColor | Vibe |
|---|---|---|---|---|
| Classique | `#1a1a2e` | `#ffffff` | `#cfcfcf` | Sobre, passe-partout |
| Moderne | `#ffffff` | `#111111` | `#666666` | Minimaliste, blanc |
| Gourmet | `#4a1e1e` | `#f5d98e` | `#d4a953` | Bordeaux/or, chic |
| Pastel | `#f7c6d9` | `#2e2e2e` | `#8a5a7a` | Rose doux |
| Vintage | `#2c3e2d` | `#f5e6c8` | `#c9b68a` | Vert forêt/beige |

### Bandeaux (8) — `/public/strip-library/*.png` (375×98)

`cafe`, `boulangerie`, `bar`, `restaurant`, `patisserie`, `fast-food`, `pizzeria`, `generique`. MVP avec placeholders gradient, itérer avec vraies illustrations ensuite.

## Section 4 — Points d'attention techniques

### Migration Prisma

Nouveaux champs sur `LoyaltyProgram` (voir Section 1). `prisma migrate dev`.

### Intégration wallet existant

`src/lib/wallet/apple.ts` et `google.ts` : remplacer les chemins fichiers hardcodés par un fetch Netlify Blobs via `program.logoBlobKey` / `stripBlobKey` / `iconBlobKey`. Fallback assets par défaut si vide.

### Sécurité upload

- Taille max : 5 MB
- Types : `image/png`, `image/jpeg`, `image/webp` (validation magic bytes)
- Authz : vérifier que `programId` appartient bien à l'user connecté

### Performance

- Pipeline `sharp` : ~500ms max
- Preview optimiste via `URL.createObjectURL()` pendant upload
- Cache blobs : `Cache-Control: public, max-age=86400`

### Tests

- Unit : pipeline `sharp` (trim, resize, validation dims)
- E2E Playwright : wizard complet
- Manuel : test Apple Wallet réel (dépend des certs Fabian)

### Faisable sans certs Apple

Fallback mock déjà présent dans `apple.ts` — on peut développer et tester toute l'UI sans certs regénérés.

## Décisions prises

- **Templates-first UX** (pas de mode libre total) — Apple/Google imposent le layout de toute façon.
- **Upload logo seul** par le merchant, bandeaux choisis dans bibliothèque prédéfinie.
- **Auto-trim basique via `sharp`** avec UI de crop manuel en secours.
- **Preview = mockup iPhone par défaut**, toggle vers mockup Android.
- **Wizard à la création + page unique à l'édition**.
- **Icône auto-dérivée du logo** (pas d'upload séparé).
- **Champs verso : fixes recommandés + 3 slots libres**.
