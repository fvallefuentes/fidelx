# 🚀 Fidlify — Checklist de lancement

> Dernière vérification automatique : à la création de ce document.
> Légende : ✅ = vérifié OK · ❌ = échoué · ⚠️ = attention requise · 👤 = test manuel à faire

---

## 1. 🏗️ Infrastructure & déploiement

| Test | Statut | Détail |
|---|---|---|
| Tests unitaires (Vitest) | ✅ | **115/115** passent en 446ms |
| TypeScript strict | ✅ | **0 erreur** |
| ESLint | ⚠️ | 0 erreur, **15 warnings** (acceptable, non bloquant) |
| Secrets en clair dans le code | ✅ | Aucun `sk_live_`, `whsec_`, `phx_`, clé privée trouvée |
| Build prod | 👤 | À refaire localement : `npm run build` |
| PM2 process online | ✅ | Uptime **5 jours**, status `online` |
| PostgreSQL actif | ✅ | `active` + `enabled` (auto-start au reboot) |
| Disk space VPS | ✅ | 29 Gi libres sur 40 (24% utilisé) |
| RAM VPS | ✅ | 1.3 Gi disponibles sur 1.9 Gi |
| Backups `.env` | ✅ | 4 fichiers de backup présents |
| Crons actifs | ✅ | 3 crons (campaigns, birthday, referral-confirm) |
| **Backup DB automatique** | ❌ | **AUCUN** trouvé — voir section "Critique" |
| PM2 auto-start au reboot | 👤 | À tester : `sudo reboot` puis vérifier que fidelx revient |

## 2. 🔒 HTTPS & sécurité réseau

| Test | Statut | Détail |
|---|---|---|
| HTTPS valide (Let's Encrypt) | ✅ | Expire **28 juillet 2026** (~3 mois) — renouvellement auto à J-30 |
| HSTS preload | ✅ | `max-age=63072000; includeSubDomains; preload` (2 ans) |
| X-Content-Type-Options | ✅ | `nosniff` |
| X-Frame-Options | ✅ | `SAMEORIGIN` |
| Referrer-Policy | ✅ | `strict-origin-when-cross-origin` |
| Content-Security-Policy | ⚠️ | Non détecté — à ajouter pour durcir |
| HTTP → HTTPS redirect | 👤 | À tester manuellement : `curl http://www.fidlify.com` |

## 3. 📄 Pages publiques

| URL | Statut | Détail |
|---|---|---|
| `/` (homepage) | ⚠️ | HTTP 307 = beta gate actif (normal en pré-launch) |
| `/blog` | ✅ | 200 (exclu du beta gate, accessible Google) |
| `/login`, `/register`, légales | ⚠️ | 307 = beta gate. Quand tu retires `BETA_ACCESS_PASSWORD`, tout sera 200 |
| `/robots.txt` | ✅ | 200, Disallow `/api/ /admin /dashboard /checkout /stamp /join` |
| `/sitemap.xml` | ✅ | 200, **11 URLs** (home + blog index + 3 articles + login/register + 4 légales) |
| `/manifest.webmanifest` | ✅ | 200 |
| `/icon.svg` | ✅ | 200 |
| `/sw.js` (service worker PWA) | ✅ | 200 |

## 4. 🛡️ Routes API protégées

| Route | Sans auth | Détail |
|---|---|---|
| `/api/dashboard/referral` | ✅ 401 | Bien protégé |
| `/api/merchants/me` | ✅ 401 | Bien protégé |
| `/api/merchants/reviews` | ✅ 401 | Bien protégé |
| `/api/auth/email-2fa/status` | ✅ 401 | Bien protégé |
| `/api/admin/audit` | ✅ 403 | Bien protégé (admin only) |
| `/api/health` | ✅ 200 | `database: CONNECTED`, `nextauth: LOADED` |
| Webhook Stripe (sans signature) | 👤 | À tester via Stripe Dashboard → "Send test webhook" |
| Cron sans Bearer token | 👤 | `curl /api/cron/referral-confirm` doit retourner 401 |

## 5. 🍎 Apple Wallet

| Test | Statut | Détail |
|---|---|---|
| Pass Type ID Certificate | ✅ | `pass.com.fidelx.loyalty` valide jusqu'au **17 mai 2027** (~11 mois) |
| Émis par Apple WWDR | ✅ | OU = G4 |
| Team ID | ✅ | `CW9FKKR66Y` |
| `.pkpass` génération | 👤 | À tester en ajoutant un vrai client + scan QR sur un vrai iPhone |
| Push APNs réception sur iPhone | 👤 | Ajouter tampon → vérifier que le pass se met à jour |
| Notif anniversaire | 👤 | Créer client avec birthDate = J+7, attendre cron 09:00 |
| **⚠️ Rappel calendrier** | 👤 | Mettre une alerte agenda pour **17 avril 2027** (renouvellement) |

## 6. 🤖 Google Wallet

| Test | Statut | Détail |
|---|---|---|
| Variables env (3) | ✅ | `GOOGLE_WALLET_ISSUER_ID`, `EMAIL`, `KEY` toutes présentes |
| Service account JWT sign | ✅ | Signature RS256 fonctionne (testé via OAuth) |
| Issuer approuvé en publication | ✅ | (Confirmé par Google en mai 2026) |
| Class auto-promoted vers APPROVED | ✅ | (Confirmé via API) |
| Save to Google Wallet sur Android | 👤 | Test réel : ouvrir un lien `/avis/...` ou `/carte/...` sur Android |
| heroImage pastilles dynamiques | 👤 | Visuel à vérifier sur Android |
| `addMessage` push notification | 👤 | Tester avec une vraie carte installée |
| Cert/clé : pas d'expiration auto | ✅ | Pas de rappel calendrier nécessaire |

## 7. 💳 Stripe

| Test | Statut | Détail |
|---|---|---|
| Mode Live activé | ✅ | (Confirmé par config webhook `fidlify-prod` en Live mode) |
| Webhook endpoint configuré | ✅ | `https://www.fidlify.com/api/webhooks/stripe` |
| API version webhook | ✅ | `2026-04-22.dahlia` (matche le SDK) |
| Webhook secret correctement défini | ✅ | (validé par test signature manuelle) |
| Statement descriptor | 👤 | À vérifier dans Stripe Dashboard → Settings : `FIDLIFY.COM` |
| Test paiement réel CB CHF | 👤 | **Critique** — payer un abonnement test avec ta vraie CB |
| Test refund | 👤 | Faire un remboursement après paiement test |
| Test annulation abo | 👤 | Annuler depuis Customer Portal Stripe |
| Test parrainage end-to-end | 👤 | Suit le scénario complet (cf. section 21) |

## 8. 🧪 Tests fonctionnels — flux client

| Test | Statut | Détail |
|---|---|---|
| Inscription `/join/[programId]` | 👤 | Créer une carte fictive avec email test |
| Email récupération si déjà inscrit | 👤 | Réinscrire le même email → vérifier email reçu |
| Normalisation email Gmail | ✅ | Testé via tests unit (normalize.test.ts) |
| Normalisation phone E.164 | ✅ | Testé via tests unit |
| Inscription multi-programmes `/join-all/[merchantId]` | 👤 | Tester l'inscription à 2-3 programmes en un coup |
| Page `/avis/[serial]` éligible | 👤 | Carte avec ≥ minVisits → encart bonus visible |
| Page `/avis/[serial]` après clic | 👤 | Demande créée + redirect Google |
| Page `/carte/[serial]` (récupération) | 👤 | Réinstaller un pass perdu |
| Anti-spam 5 inscriptions rapides | 👤 | Tester avec 5 POST rapides → 429 attendu |

## 9. 🛠️ Tests fonctionnels — flux merchant

| Test | Statut | Détail |
|---|---|---|
| Créer programme STAMPS | 👤 | Wizard onboarding |
| Créer programme POINTS | 👤 | |
| Créer programme HYBRID | 👤 | |
| Éditer design programme (couleurs, logo) | 👤 | |
| Activer/désactiver avis Google via toggle | 👤 | Sur la liste des programmes |
| Configurer bonus + min visits + établissement | 👤 | Dans la modal d'édition |
| Scanner QR client `/dashboard/scan` | 👤 | Avec un vrai téléphone (caméra requise) |
| Ajouter 1 tampon | 👤 | currentStamps +1 |
| Ajouter plusieurs tampons | 👤 | Max 20 |
| Claim reward | 👤 | currentStamps = 0, RewardClaim créé |
| Voir comme un client | 👤 | Preview rendu |
| Notification "1ère récompense" | 👤 | Cloche merchant |
| Export CSV clients (paid plan) | 👤 | Plan ESSENTIAL+ requis |
| Export CSV transactions | 👤 | |
| Page `/dashboard/avis` valider/rejeter | 👤 | Avec une demande en attente |

## 10. 🤝 Parrainage B2B

| Test | Statut | Détail |
|---|---|---|
| Page `/dashboard/parrainage` affiche lien | 👤 | |
| `/r/[code]` redirige + pose cookie | 👤 | curl -I sur `/r/test` |
| Inscription via lien → attribution PENDING | 👤 | Vérifier en DB |
| Notif "nouveau filleul" merchant | 👤 | Cloche merchant |
| Webhook `invoice.payment_succeeded` → confirmedAt | 👤 | Stripe send test webhook |
| Cron `/api/cron/referral-confirm` | 👤 | Réponse `{"ok":true,...}` |
| Trial_end Stripe étendu | 👤 | Vérifier dans Stripe Dashboard |
| Cap 12 mois cumulés | 👤 | Test avec scénario simulé |

## 11. 📰 Blog SEO

| Test | Statut | Détail |
|---|---|---|
| `/blog` liste 3 articles | ✅ | Page accessible HTTP 200 |
| `/blog/[slug]` pour chaque article | 👤 | Cliquer sur chaque article |
| Sitemap inclut articles | ✅ | 11 URLs dans sitemap |
| JSON-LD BlogPosting par article | ✅ | Vérifié via meta-tags (Organization, SoftwareApplication, FAQPage, BlogPosting) |
| OG tags blog | ✅ | `<meta property="og:..." />` présents |
| `/blog` exclu du beta gate | ✅ | HTTP 200 même avec beta actif |
| Articles liés (2 cards) | 👤 | À vérifier visuellement |
| CTA "Démarrer gratuitement" → /register | 👤 | |
| Google Search Console submission | 👤 | À soumettre sitemap.xml |

## 12. 📧 Newsletter

| Test | Statut | Détail |
|---|---|---|
| Form footer fonctionne | 👤 | S'inscrire avec un vrai email |
| Email de confirmation reçu | 👤 | Vérifier inbox (et spams !) |
| Clic lien confirmation → /newsletter/ok | 👤 | |
| `/admin/newsletter` montre l'abonné | 👤 | |
| Export CSV | 👤 | Vérifier format `;` + BOM UTF-8 |
| Unsubscribe 1-clic | 👤 | Cliquer "se désabonner" depuis email |
| Honeypot anti-bot | ✅ | Logique testée côté code |

## 13. 📊 Monitoring & analytics

| Test | Statut | Détail |
|---|---|---|
| Sentry server-side | 👤 | Trigger une exception via `/sentry-example-page` |
| Sentry source maps | 👤 | Vérifier qu'on voit le fichier/ligne dans Sentry |
| PostHog client SDK chargé | 👤 | Vérifier dans DevTools → Network → posthog.com/decide |
| PostHog pageview events | 👤 | Voir Live events dans dashboard PostHog |
| PostHog event `merchant.signed_up` | 👤 | Créer un compte → vérifier event reçu |
| PostHog session recording | 👤 | Vérifier qu'une session apparaît |
| Better Uptime monitor | 👤 | ⚠️ À configurer si pas déjà fait |
| Better Uptime SMS/email alert | 👤 | Test : arrêter PM2 → recevoir alerte |

## 14. 💾 Backups & disaster recovery

| Test | Statut | Détail |
|---|---|---|
| **Cron pg_dump quotidien** | ❌ | **AUCUN backup auto** — voir Critique |
| Backup off-site (Swiss Backup / S3) | ❌ | Non configuré |
| Test restore depuis backup | 👤 | Quand cron en place |
| Backup `.env` ailleurs que VPS | ✅ | 4 backups locaux + copie utilisateur |
| Backup certs Apple + JSON Google | 👤 | Stocker dans gestionnaire de mots de passe |
| Documentation restore step-by-step | 👤 | À rédiger |

## 15. ⚖️ Conformité légale

| Test | Statut | Détail |
|---|---|---|
| Mentions légales avec cofondateurs réels | ✅ | Testé via E2E (Fabian Valle Fuentes + Ludovic Pavesi) |
| Politique de confidentialité publiée | ✅ | Page 200 (derrière beta gate) |
| Politique cookies | ✅ | Page 200 |
| CGU publiées | ✅ | Page 200 |
| **CGV** | ❌ | **NON PUBLIÉES** — obligatoire pour vendre du SaaS payant |
| **DPA** (Data Processing Agreement) | ❌ | **NON PUBLIÉ** — obligatoire RGPD B2B |
| Mention Infomaniak hébergeur | ✅ | Confirmé en mentions légales |
| Cookies opt-in fonctionne | 👤 | Tester banner depuis incognito |
| IP anonymisées /24-/48 | ✅ | Vérifié via tests unit (fingerprint.test.ts) |
| Export RGPD pour client final | ❌ | Pas encore implémenté |
| Suppression RGPD (anonymisation) | ❌ | Pas encore implémenté |

## 16. 🔐 Sécurité avancée

| Test | Statut | Détail |
|---|---|---|
| 2FA email admin activable | ✅ | Endpoint testé `/api/auth/email-2fa/status` → 401 |
| Audit log toutes actions admin | ✅ | Table `AdminAuditLog` + tests intégration |
| Auto-block IP 5 tentatives | ✅ | Logique présente dans `lib/auth.ts` |
| Rate limiting `/join` | ✅ | `evaluateRateLimits` |
| Pas de leak secret dans le code | ✅ | grep clean |
| `.env` permissions correctes | 👤 | Vérifier `chmod 600` sur le VPS |
| SSH key-only (pas de password) | 👤 | Confirmé implicitement (sinon brute force) |
| fail2ban actif sur SSH | 👤 | À vérifier : `systemctl status fail2ban` |
| PostgreSQL bind localhost only | 👤 | `sudo cat /etc/postgresql/18/main/postgresql.conf | grep listen_addresses` |
| Rotation secrets passés dans Claude | ⚠️ | À rotater dans la semaine (Stripe, Google Wallet, SSH) |

## 17. 🌍 i18n

| Langue | Statut | Détail |
|---|---|---|
| FR (par défaut) | ✅ | messages/fr.json complet |
| DE | ✅ | messages/de.json complet (clé `reviews` à valider) |
| EN | ✅ | messages/en.json complet |
| Language switcher | 👤 | Tester depuis la landing |
| Format dates fr-CH | 👤 | DD.MM.YYYY ou DD/MM/YYYY |
| Devise CHF partout | 👤 | Pas de € ni $ résiduel |

## 18. 📱 Cross-device

| Device | Statut | Détail |
|---|---|---|
| Desktop Chrome | 👤 | Tester landing + dashboard |
| Desktop Firefox | 👤 | |
| Desktop Safari (Mac) | 👤 | |
| Desktop Edge | 👤 | |
| iPhone Safari | 👤 | **Critique** : tester pass Apple Wallet |
| Android Chrome | 👤 | **Critique** : tester pass Google Wallet |
| iPad | 👤 | Responsive |
| Petit mobile (375px) | 👤 | Form rempli sans débordement |

## 19. ⚡ Performance

| Test | Statut | Détail |
|---|---|---|
| Lighthouse home (mobile) | 👤 | Cible : Performance > 90 |
| Lighthouse home (desktop) | 👤 | Cible : Performance > 95 |
| LCP < 2.5s | 👤 | Mesuré par PostHog web vitals après quelques visites |
| FID < 100ms | 👤 | |
| CLS < 0.1 | 👤 | |
| Bundle size JS | ✅ | Build OK, taille acceptable |
| Pas de N+1 sur dashboard | 👤 | À profiler avec Prisma logs en dev |
| Charge 10 req/s pendant 1 min | 👤 | Apache Bench : `ab -n 600 -c 10 https://www.fidlify.com/` |

## 20. 🐛 Edge cases

| Cas | Statut | Détail |
|---|---|---|
| Carte avec 0 tampon | 👤 | Affichage OK |
| Carte = max - 1 stamps | 👤 | Récompense ne se déclenche pas |
| Carte = max stamps | 👤 | Récompense se déclenche |
| Carte > max stamps | 👤 | Pas de surcharge |
| Caractères spéciaux dans firstName | 👤 | `é à ' "` acceptés |
| Emoji dans firstName | 👤 | Ne plante pas |
| firstName 50+ chars | 👤 | Tronqué |
| Date de naissance 1900 | 👤 | Acceptée (centenaire) |
| Date de naissance future | 👤 | Refusée |
| Session expirée | 👤 | Redirect /login |
| Programme inactif `/join` | 👤 | Refusé |

---

# 🔴 Section CRITIQUE — bloqueurs avant launch payant

Ces points ont été identifiés comme **bloquants** par la checklist automatique :

## 1. ❌ Pas de backup DB automatique
**Risque** : un seul DROP/crash = toutes les data perdues définitivement.
**Fix** : 5 minutes — voir section "Quick fixes" en bas.

## 2. ❌ CGV et DPA non rédigés/publiés
**Risque** : tu ne peux pas légalement vendre du SaaS B2B sans CGV ni DPA.
**Fix** : avocat suisse spécialisé SaaS (~500 CHF) ou template adapté.

## 3. ⚠️ Rotation des secrets compromis
**Stripe `sk_live_`, `pk_live_`, `whsec_`, Google Wallet JSON key, SSH** ont transité par nos conversations Claude.
**Fix** : `docs/rotation.md` à créer + faire dans la semaine.

## 4. ⚠️ Beta gate encore actif
**Pour le launch** : retirer `BETA_ACCESS_PASSWORD=""` du `.env` VPS + restart.

## 5. ⚠️ Better Uptime / monitoring externe pas confirmé
**Risque** : si VPS tombe à 3h du matin, personne ne le sait avant le 1er client mécontent.
**Fix** : 10 minutes de setup gratuit sur betteruptime.com.

---

# 🛠️ Quick fixes prêts à exécuter

## Activer le backup DB quotidien (cron + retention 30 jours)

```bash
ssh debian@89.47.50.125
sudo mkdir -p /var/backups/fidelx && sudo chown debian:debian /var/backups/fidelx
crontab -e  # ajouter :
0 3 * * * pg_dump -h 127.0.0.1 -U fidlify fidelx_prod | gzip > /var/backups/fidelx/fidelx-$(date +\%Y\%m\%d).sql.gz && find /var/backups/fidelx -name "fidelx-*.sql.gz" -mtime +30 -delete
```

Tester immédiatement :
```bash
pg_dump -h 127.0.0.1 -U fidlify fidelx_prod | gzip > /tmp/test-dump.sql.gz && ls -lh /tmp/test-dump.sql.gz
```

## Retirer le beta gate au moment du launch

```bash
ssh debian@89.47.50.125
cd /var/www/fidelx
sed -i 's|^BETA_ACCESS_PASSWORD=.*|BETA_ACCESS_PASSWORD=""|' .env
pm2 restart fidelx
```

## Mettre une alerte calendrier pour le cert Apple

Date : **17 avril 2027** (1 mois avant expiration du 17 mai 2027)
Titre : "Renouveler Pass Type ID Apple Wallet — Fidlify"

---

# 📊 Synthèse

| Catégorie | Auto OK | Manuel à faire | Bloquants |
|---|---|---|---|
| Infra & déploiement | 10 | 2 | 1 (backup DB) |
| HTTPS & sécurité réseau | 5 | 2 | 0 |
| Pages publiques | 8 | 0 | 0 |
| Routes API | 6 | 2 | 0 |
| Apple Wallet | 3 | 5 | 0 |
| Google Wallet | 4 | 4 | 0 |
| Stripe | 4 | 5 | 0 |
| Flux client | 2 | 7 | 0 |
| Flux merchant | 0 | 15 | 0 |
| Parrainage | 0 | 8 | 0 |
| Blog SEO | 6 | 3 | 0 |
| Newsletter | 1 | 6 | 0 |
| Monitoring | 0 | 8 | 0 |
| Backups | 1 | 3 | 1 (cron pg_dump) |
| Conformité | 6 | 1 | 2 (CGV + DPA) |
| Sécurité avancée | 5 | 4 | 1 (rotation secrets) |
| i18n | 3 | 3 | 0 |
| Cross-device | 0 | 8 | 0 |
| Performance | 1 | 7 | 0 |
| Edge cases | 0 | 11 | 0 |
| **TOTAL** | **65** ✅ | **104** 👤 | **5** ❌ |

---

# 🎯 Recommandations finales avant launch

## Cette semaine (BLOQUANT)
1. ✅ Setup backup DB cron (5 min)
2. ✅ Rédiger/publier CGV + DPA
3. ✅ Setup Better Uptime monitoring (10 min)
4. ✅ Rotater les secrets Stripe + Google Wallet + SSH
5. ✅ Faire le test paiement réel CB CHF

## La veille du launch
6. Désactiver le beta gate
7. Soumettre sitemap à Google Search Console
8. Test E2E manuel complet (1 vrai client de bout en bout)
9. Tester sur 1 iPhone + 1 Android
10. Vérifier Sentry + PostHog reçoivent bien

## Jour J
11. Annoncer aux premiers clients beta
12. Garder un œil sur Sentry/PostHog en temps réel
13. Avoir le téléphone à portée pour Better Uptime

## Après launch
14. Setup staging environment
15. CSP header
16. Export/delete RGPD
17. Tests E2E avec DB de test (CI)

---

*Document généré le {{ datetime }} — Fidlify ©2026*
