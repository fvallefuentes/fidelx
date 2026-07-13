# Fidlify — notes projet

Fichier source : `Fidlify Landing.dc.html` (template HTML + classe logique `Component` dans le même fichier).
Ces fichiers sont une **référence de design** : à recréer dans le framework cible (React/Vue…), pas à copier tel quel.

---

## 1. Intégration backend — formulaire « Démarrer mon programme de fidélité » (pour l'associé backend)

La landing (section `#editeur`) se termine par un flow :
carte personnalisée → « Carte finalisée » → aperçu téléphone (Apple/Google Wallet) → CTA « Démarrer mon programme de fidélité » → formulaire d'inscription.

**Hook front :** méthode `submitSignup()` dans la classe logique. Aujourd'hui elle fait un `console.log('[fidlify] signup payload', payload)` — remplacer par l'appel API.

**Payload envoyé :**
```json
{
  "business": "<nom du commerce>",
  "contact": { "name": "", "email": "", "phone": "" },
  "cardConfig": {
    "niche": "cafe|boulangerie|coiffeur|restaurant|institut|boutique",
    "shape": "check|star|sparkle|heart|diamond|crown|cup|scissors",
    "spacing": "serre|normal|large",
    "bg": "none|color|image",
    "color": "#hex (si bg=color)",
    "cardTheme": "midnight|lime|creme|moka|foret|terracotta|poudre|ardoise",
    "customColors": { "base|text|stamp|glyph|ring|label": "#hex (overrides « Affiner les couleurs », objet vide si aucun)" },
    "imageUrl": "url stock (si bg=image)",
    "customImageDataUrl": "base64 (si l'utilisateur a importé sa photo — à uploader vers notre storage)",
    "title": "<nom du programme>",
    "goal": 10
  }
}
```

**À brancher côté backend :**
- `POST /api/v1/signups` (suggestion) : crée le compte commerçant + y transfère la config de carte telle quelle.
- Image custom : arrive en dataURL base64 → uploader vers le storage, stocker l'URL.
- Génération du pass réel : Apple Wallet (PassKit, `.pkpass`) + Google Wallet API, à partir de `cardConfig`.
- E-mail de bienvenue avec lien d'ajout au Wallet.

---

## 2. Système de personnalisation (où modifier quoi)

**Héro carrousel :** carrousel **autonome et purement démonstratif** — il n'affecte jamais l'éditeur. État propre `heroIdx` (+ `heroPaused`), avancé par `componentDidMount` → `setInterval` **3200 ms**. Chaque carte montre le preset complet du type de commerce : photo, thème suggéré et **tampon métier** (`nicheShapes` : café→tasse, boulangerie→croissant, coiffeur→ciseaux, restaurant→fourchette, institut→fleur, boutique→étoile). La carte arrière montre le type suivant. Les puces sous les cartes sautent à un type et mettent le défilement en pause (`heroPaused:true`).

**Ordre des réglages :** Nom du commerce → Thèmes prêts à l'emploi → Forme du tampon → Espacement → Fond derrière les tampons → Affiner les couleurs (accordéon) → Finaliser.

**Affiner les couleurs :** accordéon `colorsOpen` ; chaque rôle (Fond, Texte, Tampon, Coche, Cercle vide, Labels) est un `<input type=color>` qui écrit dans `state.custom` (overrides par-dessus le thème : `T = { ...cardThemes[cardTheme], ...custom }`). « Revenir au thème » vide `custom`. Choisir un thème vide aussi `custom`.

**Image + thème :** le mode image ne remplace plus le thème — la photo remplit la bande des tampons, toutes les couleurs (fond, texte, tampons) restent celles du thème (+ ombre portée sur les tampons pour la lisibilité).

Tout est dans la classe logique du `.dc.html` :

- **`stockImages`** — banque d'images du mode « Image » (tirage aléatoire, jamais listée dans l'UI). URLs Unsplash provisoires → remplacer par nos assets hébergés en prod. Chaque entrée : `{ u: url, base: '#hex' }` (`base` = couleur de fond du pass assortie à la photo).
- **`cardThemes`** — « Thèmes prêts à l'emploi » (mêmes rôles que l'éditeur interne) : `base` (fond), `text` (texte), `stamp` (tampon), `glyph` (coche du tampon), `ring` (cercle vide), `label`/`faint` (labels). Ajouter un thème = ajouter une entrée ici, la pastille apparaît automatiquement.
- **`nicheThemes`** — thème suggéré appliqué quand on clique un type de commerce (`cafe:'moka'`, etc.).
- **`niches`** — presets par commerce : titre du programme, récompense, index d'image (`img` → `stockImages`).
- **`shapeDefs`** — formes de tampon (paths SVG 24×24, `stroke:true` pour un tracé, `circlesFill` pour des cercles pleins — ex. la fleur). 12 formes dont croissant, pain, fourchette, fleur (cibles métier). Ajouter une forme = une entrée ici + sa clé dans `shapeKeys` (renderVals).

---

## 3. Animations — étapes & comment les modifier

Toutes les durées sont en un seul endroit chacune :

**a) Flow « Carte finalisée » (édition → téléphone)** — état `mode: 'edit' | 'shrink' | 'phone'` :
1. Clic sur « Carte finalisée » → `finalize()` passe `mode:'shrink'`.
2. La colonne de réglages se replie : `controlsColStyle` dans `renderVals()` (transition `flex-basis / max-width / opacity / transform`, **650 ms**, `cubic-bezier(.4,0,.2,1)`). La carte se recentre et grossit légèrement : `editCardWrapStyle` (`scale(1.05)`).
3. Après **680 ms** (le `setTimeout` dans `finalize()` — garder ≥ la durée de transition), `mode:'phone'` : le téléphone apparaît.
4. Entrée du téléphone : keyframe **`phonein`** (dans le `<style>` du `<helmet>`) — translateY + scale, **0,7 s**. Rejouée à chaque switch Apple ↔ Google (le bloc est remonté).
5. « ← Modifier ma carte » → `backToEdit()` remet `mode:'edit'`.

**b) Autres animations (keyframes dans le `<helmet>`)** :
- `floatcard` / `floatcard2` — flottement des deux cartes du héro (6 s / 7 s, boucle).
- `fadeup` — apparition du CTA et du formulaire sous le téléphone.
- `popin` — pastille ✓ de l'écran de succès (0,45 s).
- Bascule clair/sombre : variables CSS sur `#fyroot[data-fy]`, transition 0,25 s ; choix persisté dans `localStorage['fidlify-theme']`.
- Changements de couleurs de la carte : `transition: background .35s` (dans `cardStyle` / `stripStyle`).

**c) Interactions notables** :
- Pastille bleue « Démarrer » dans l'iPhone et bouton « Ajouter à Google Wallet » → ouvrent le formulaire (`openForm()`), comme le grand CTA lime.
- Upload photo : `onUpload()` (FileReader → dataURL). Shuffle : `shuffleImage()`.

---

## 4. Marque (rappels)

- Un seul vert visible : lime `#D9FF3C` en aplat (boutons, tampons, surlignage marqueur des titres) — jamais en couleur de texte sur fond clair. Eyebrows en olive `--accent-ink` (`#56750a` clair / lime en sombre).
- Surlignage des mots-clés des titres : adaptatif via `--hl-bg` / `--hl-ink` — mode clair = bande marqueur lime + texte encre ; mode sombre = texte lime sans bande.
- Typo : Space Grotesk (titres), Instrument Sans (corps), Space Mono (labels).
- La carte Wallet reste un objet sombre/coloré dans les deux thèmes de site.
