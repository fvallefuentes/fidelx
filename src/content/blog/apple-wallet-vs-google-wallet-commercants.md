---
title: "Apple Wallet ou Google Wallet : que choisir pour son commerce ?"
description: "Comparatif détaillé Apple Wallet vs Google Wallet pour les cartes de fidélité commerçants : design, notifications, API, parts de marché Suisse."
date: "2026-06-01"
author: "Fidlify"
tags: ["apple-wallet", "google-wallet", "comparatif", "fidélité"]
---

Si vous envisagez une carte de fidélité digitale pour votre commerce, vous vous demandez peut-être : **Apple Wallet ou Google Wallet ?** La réponse simple : **les deux, en même temps**. Voici pourquoi, et comment chacun fonctionne en pratique.

## Pourquoi pas choisir un seul ?

En Suisse, la répartition smartphones est environ :

- **iOS (iPhone)** : ~55%
- **Android** : ~45%

Si vous choisissez **uniquement Apple Wallet**, vous perdez **45% de vos clients** potentiels.
Si vous choisissez **uniquement Google Wallet**, vous perdez **55%**.

Une bonne plateforme de fidélité moderne — comme Fidlify — détecte automatiquement le téléphone du client et lui propose le **bon format**, transparent pour vous. C'est pour cela qu'on parle de "carte de fidélité digitale" sans préciser l'OS : c'est la plateforme qui gère.

## Comment chaque Wallet fonctionne

### Apple Wallet (`.pkpass`)

- Format : fichier ZIP signé numériquement (certificat Apple Developer requis)
- Stockage : le pass est téléchargé sur le téléphone du client (~50 Ko)
- Distribution : lien direct vers le fichier, scan QR, ou email
- Mise à jour : **push instantané** via les serveurs Apple (APNs)
- Personnalisation : très riche — strip image custom, multiples champs, photo de fond, couleurs précises

### Google Wallet (`LoyaltyObject`)

- Format : objet JSON stocké chez Google
- Distribution : URL signée `pay.google.com/gp/v/save/...` que le client clique
- Mise à jour : **API REST** (avec délai de propagation 1-3 min)
- Personnalisation : moins riche — logo cadré en cercle, une couleur de fond, champs structurés

## Différences visuelles concrètes

### Apple Wallet — design maîtrisé

Le commerçant contrôle **précisément** le rendu :

- 3 couleurs (fond, texte, labels) custom
- Image de fond ou strip image dessinée dynamiquement (pastilles de tampons en image, pas en texte)
- Logo et icon affichés selon les guidelines Apple

Résultat : un pass qui **ressemble vraiment à votre commerce**, presque comme une carte de visite.

### Google Wallet — design plus uniforme

Google impose son **Material Design** :

- Le logo merchant est cadré en **cercle** (un logo rectangulaire comme une bannière sera coupé sur les côtés)
- Une seule couleur de fond
- La hiérarchie des champs suit le standard Google

Vous pouvez personnaliser mais moins finement. Le rendu sera toujours **cohérent visuellement avec les autres pass Google** dans le Wallet du client.

## Notifications push

C'est probablement **le critère qui compte le plus** pour vous, commerçant.

### Apple Wallet

- ✅ Push **instantané** via APNs (Apple Push Notification service)
- ✅ Affichage sur l'écran de verrouillage
- ✅ Possibilité de pousser des messages contextuels (date, position GPS, beacon)
- ✅ Gratuit, illimité

### Google Wallet

- ✅ Push via l'API `addMessage` de Google
- ⏱️ Délai 1-3 minutes (moins instantané qu'Apple)
- ✅ Affichage sur l'écran de verrouillage Android
- ✅ Gratuit, illimité

**Pour des cas d'usage type "joyeux anniversaire" ou "promo cette semaine"**, les 2 minutes de délai Google ne sont pas un problème. Pour des notifications **ultra contextuelles** (le client est devant votre boutique, vous voulez le ping en temps réel), Apple est meilleur — mais ce cas d'usage est marginal pour la plupart des commerces.

## Setup côté commerçant : quel effort ?

Si vous voulez **vous-même** intégrer les API Apple Wallet + Google Wallet dans votre commerce, sachez que c'est :

### Apple Wallet
- Compte Apple Developer **payant** (~99 CHF/an)
- Génération de certificats (.p12), Pass Type ID, Team ID
- Web service à héberger pour les updates
- ~2-3 jours de développement pour un dev senior

### Google Wallet
- Compte Google Cloud + service account
- Création d'un Issuer (gratuit, mais review manuelle Google ~3-7 jours)
- Quelques classes/objects JSON à signer en JWT
- ~1-2 jours de dev

**Total si vous le faites seul** : 5-10 jours-dev (5 000 à 15 000 CHF en coût agence).

**Total avec une plateforme comme Fidlify** : 10 minutes de config dashboard, 0 ligne de code.

## Parts de marché et tendances

Sur les **2 dernières années en Suisse** (2024-2026) :

- Apple Wallet : +20% d'adoption merchant
- Google Wallet : +35% (rattrapage rapide)
- Apps de fidélité dédiées : **-40%** (les gens en ont marre de télécharger des apps)

La tendance claire : **Wallet > app dédiée**. Les clients préfèrent un pass dans un Wallet déjà installé que de télécharger une 50e app pour gagner 1 café gratuit.

## Verdict

**N'opposez pas Apple Wallet et Google Wallet — utilisez les deux**. Une bonne plateforme de fidélité le gère pour vous. Concentrez-vous sur ce qui compte vraiment :

1. La **récompense** est-elle attractive ?
2. Le **seuil** (nb de tampons) est-il atteignable ?
3. Les **notifications** sont-elles utiles ou spam ?
4. La carte est-elle facile à obtenir (un seul scan QR) ?

Le canal (Apple ou Google) doit être **transparent** pour vous et pour le client.

[Démarrer gratuitement chez Fidlify](https://www.fidlify.com/register) — Apple Wallet et Google Wallet inclus par défaut, zéro setup.
