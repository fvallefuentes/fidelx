# Tests — Fidlify

Suite de tests automatisés couvrant les libs, l'API et les flows utilisateur.

## Structure

```
tests/
├── unit/                  # vitest — fast, no DB needed
│   ├── normalize.test.ts          (16 tests)
│   ├── csv.test.ts                (15 tests)
│   ├── fingerprint.test.ts        (17 tests)
│   ├── utils.test.ts              (3 tests)
│   ├── templates.test.ts          (8 tests)
│   ├── seo.test.ts                (8 tests)
│   ├── legal.test.ts              (7 tests)
│   ├── onboarding-templates.test.ts (5 tests)
│   ├── campaign-templates.test.ts (7 tests)
│   └── plan-limits.test.ts        (9 tests)
├── e2e/                   # playwright — real browser, real server
│   ├── smoke.spec.ts                  (Routes publiques principales)
│   ├── landing.spec.ts                (SEO, FAQ, footer, robots, sitemap)
│   ├── legal-pages.spec.ts            (4 pages × 4 assertions)
│   ├── auth-flows.spec.ts             (Login, register, forgot, reset)
│   ├── api-anti-abuse.spec.ts         (Auth guards, anti-enumeration)
│   ├── sitemap-seo.spec.ts            (Meta tags, JSON-LD, headers sécurité)
│   ├── card-recovery.spec.ts          (404 sur card inexistante)
│   ├── dashboard-public-guards.spec.ts (Auth required pour /dashboard et /admin)
│   └── cookies-banner.spec.ts         (Bannière + modal préférences)
└── README.md
```

**Total** : ~95 tests unitaires + ~60 tests E2E = **~155 tests**

## Commands

```bash
# Tests unitaires (rapide, ~300ms)
npm run test:unit

# Tests unitaires en mode watch (TDD)
npm run test:watch

# Coverage report (HTML dans /coverage)
npm run test:coverage

# Tests E2E (lance npm run dev automatiquement)
npm run test:e2e

# E2E en mode UI interactif (très utile pour debug)
npm run test:e2e:ui

# E2E en mode debug step-by-step
npm run test:e2e:debug

# Tout faire (unit + e2e)
npm run test:all
```

## Configuration

### Tests unitaires (Vitest)

- Config : `vitest.config.ts`
- Pas de DB requise — les tests touchent uniquement aux libs pures (`src/lib/`).
- Alias `@/` mappé vers `src/`.
- Exécution en parallèle par défaut.

### Tests E2E (Playwright)

- Config : `playwright.config.ts`
- **`BASE_URL`** : par défaut `http://localhost:3000`. Pour tester sur staging :
  ```bash
  BASE_URL=https://staging.fidlify.com npm run test:e2e
  ```
- **Beta gate** : automatiquement désactivé pendant les tests via `BETA_ACCESS_PASSWORD=""`.
- Browser : Chromium uniquement (suffit pour notre périmètre). Pour tester
  Firefox/Safari, ajouter à `playwright.config.ts > projects`.
- Locale : `fr-CH`, timezone : `Europe/Zurich`.

## CI/CD

Workflow GitHub Actions `.github/workflows/test.yml` :

- Déclenché sur `push` vers `main` ou `pull_request`
- Exécute les **tests unitaires** automatiquement
- Les tests E2E sont opt-in via label PR `e2e` (ils sont plus lents et
  nécessitent un setup DB que pour l'instant on évite en CI)

## Bonnes pratiques

### Pour les tests unitaires
- Pas de mocking de DB — on teste uniquement les fonctions pures
- Si une fonction touche Prisma, soit on extrait la logique pure, soit
  on déplace le test en E2E
- Préférer plusieurs petits tests à un gros test polyvalent

### Pour les E2E
- Toujours nettoyer l'état (cookies, localStorage) si nécessaire
- Utiliser des sélecteurs robustes (`getByRole`, `getByLabel`) plutôt
  que des classes CSS qui peuvent changer
- Éviter `page.waitForTimeout()` — préférer `page.waitFor*` avec
  conditions
- Marquer comme `test.fixme()` les tests qui dépendent de données
  prod réelles non-déterministes

## Ajouter un nouveau test

### Unit test
1. Créer `tests/unit/mon-feature.test.ts`
2. `import { describe, it, expect } from "vitest"`
3. Run avec `npm run test:watch` pour TDD

### E2E test
1. Créer `tests/e2e/mon-flow.spec.ts`
2. `import { test, expect } from "@playwright/test"`
3. Run avec `npm run test:e2e:ui` pour debug visuel

## Limites actuelles connues

- ❌ Pas de tests sur les flows authentifiés complets (signup → email
  vérifié → dashboard). Raison : nécessite SMTP/mock email + base de
  données isolée. Voir TODO `tests/e2e/auth-authenticated.spec.ts`.
- ❌ Pas de tests sur le flow de scan en boutique avec vraie carte
  PENDING → ACTIVE. Raison : nécessite seed DB + session merchant.
- ❌ Pas de tests sur les webhooks Stripe. Raison : nécessite
  configuration Stripe sandbox.

Ces flows seront ajoutés quand on aura une stratégie de DB de test.
