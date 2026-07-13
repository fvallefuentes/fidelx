# Handoff — Landing page Fidlify

Paquet complet pour implémenter la landing sur le site final. **Commencer par ouvrir `Fidlify Landing (standalone preview).html` dans un navigateur** : c'est la référence visuelle et comportementale exacte, sans rien installer.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `Fidlify Landing (standalone preview).html` | Aperçu auto-suffisant (offline). LA référence à reproduire. |
| `Fidlify Landing.dc.html` | Source du design : template HTML + classe logique JS (état React) dans le même fichier. Source de vérité pour copy, styles, comportements. |
| `NOTES-TECHNIQUES.md` | **À lire en entier** : intégration backend (payload signup), système de personnalisation, toutes les animations avec durées et où les modifier. |
| `support.js` | Runtime du prototype. Référence de comportement uniquement — **ne pas porter en production**. |
| `assets/fidlify-mark.svg` | Logo Fidlify (nav, footer, cartes Wallet). |

## Comment reprendre le travail

Ces fichiers sont une **référence de design haute-fidélité**, pas du code de production. Recréer la page dans le framework du site final (React/Vite conseillé si rien n'existe) :

1. Recréer les tokens CSS (section ci-dessous) sur une racine avec `data-theme="light|dark"`.
2. Reproduire les sections dans l'ordre du fichier source : Nav sticky → Héro (carrousel) → Éditeur de carte → Adoption 30 s → Accessibilité → Fonctionnalités → Témoignages → CTA finale → Footer.
3. Porter la classe logique (`class Component` en bas du `.dc.html`) en composant React : tout l'état, les presets (`niches`, `cardThemes`, `nicheThemes`, `nicheShapes`, `stockImages`, `shapeDefs`) et les handlers s'y trouvent, commentés.
4. Brancher `submitSignup()` sur l'API (payload documenté dans NOTES-TECHNIQUES.md).

## Tokens de design

### Marque (identique clair/sombre)
- Lime : `#D9FF3C` — uniquement en aplat (boutons, tampons, badges) ou surlignage marqueur. Jamais en texte sur fond clair.
- Lime foncé (dégradés) : `#b6e02e` · Encre : `#0E1116`
- Surlignage titres : `--hl-bg` / `--hl-ink` → clair = bande lime `linear-gradient(transparent 58%, #D9FF3C 58%, #D9FF3C 94%, transparent 94%)` + texte `#0E1116` ; sombre = pas de bande, texte `#D9FF3C`.

### Mode clair (défaut)
`--bg:#f4f5ee` `--bg2:#eef0e3` `--bg3:#eaede0` `--stage:#e9ecdd` `--card:#fff` `--chip:#f7f8f0` `--line:rgba(14,17,22,.09)` `--line2:rgba(14,17,22,.15)` `--ink:#0E1116` `--ink2:#23281d` `--muted:#5d6355` `--muted2:#6b7160` `--faint:#7d8374` `--ghost:#989e8d` `--accent-ink:#56750a` `--accent-soft:#e9f6c9` `--accent-border:rgba(120,160,20,.45)` `--cardshadow:0 1px 2px rgba(24,30,10,.04),0 14px 36px rgba(24,30,10,.07)`

### Mode sombre
`--bg:#0b0d10` `--bg2:#0d1014` `--bg3:#08090b` `--stage:#08090b` `--card:rgba(255,255,255,.02)` `--card2:#14171d` `--chip:rgba(255,255,255,.04)` `--line:rgba(255,255,255,.07)` `--line2:rgba(255,255,255,.14)` `--ink:#fff` `--muted:#b3b7bf` `--faint:#8c9099` `--ghost:#5b6068` `--accent-ink:#D9FF3C` `--accent-soft:rgba(217,255,60,.1)` `--accent-border:rgba(217,255,60,.3)` `--cardshadow:none`

Bascule via l'icône dans la nav, persistée dans `localStorage['fidlify-theme']` (défaut : clair). Transition 0,25 s sur fonds/bordures.

### Typographie (Google Fonts)
- **Space Grotesk** 600/700 — titres, chiffres. `letter-spacing:-0.03em`. H1 62px · H2 42–54px.
- **Instrument Sans** 400/500/600 — corps. 14,5–19px.
- **Space Mono** 700 — eyebrows/labels, MAJUSCULES, `letter-spacing` 0.1–0.22em, 10,5–11,5px.

### Divers
Rayons : boutons 10–12px · cartes 18–24px · pass Wallet 24px. Ombre bouton lime : `0 8px 30px rgba(217,255,60,.3)`. Les cartes Wallet restent des objets sombres/colorés dans les deux thèmes de site.

## Les 3 blocs interactifs (résumé — détails dans NOTES-TECHNIQUES.md)

1. **Héro carrousel** — autonome, purement démonstratif (ne touche jamais l'éditeur). Défile tous les 3,2 s entre 6 types de commerce (photo + thème + tampon métier) ; puces cliquables = saut + pause 12 s puis reprise ; carte arrière = type suivant.
2. **Éditeur de carte** (`#editeur`) — réglages : Nom du commerce → Thèmes prêts à l'emploi (8) → Forme du tampon (12) → Espacement → Fond (aucun/couleur/image aléatoire + upload) → Affiner les couleurs (accordéon, 6 rôles, overrides par-dessus le thème). Aperçu du pass en temps réel. L'image s'ajoute au thème, ne le remplace pas.
3. **Finalisation** — « Carte finalisée » replie les réglages (650 ms), puis la carte apparaît dans un iPhone (écran d'ajout Apple Wallet) ou un Android (Google Wallet) avec switch ; CTA « Démarrer mon programme de fidélité » → formulaire → succès. Payload envoyé à `submitSignup()`.

## À remplacer en production
- **Images stock** : URLs Unsplash provisoires dans `stockImages` → héberger nos propres visuels.
- **QR code** : décoratif (`qrNode()`) → générateur réel par commerçant.
- **Formulaire** : `submitSignup()` fait un `console.log` → `POST /api/v1/signups` (spec dans NOTES-TECHNIQUES.md).
- **Pass réels** : Apple PassKit (`.pkpass`) + Google Wallet API à partir de `cardConfig`.
