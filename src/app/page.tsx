import Link from "next/link";
import {
  Star,
  QrCode,
  Bell,
  CreditCard,
  Smartphone,
  BarChart3,
  Users,
  MapPin,
  MessageSquare,
  Award,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Star className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">FidelX</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Conçu pour les commerçants suisses
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            Fidélisez vos clients
            <br />
            <span className="text-blue-600">directement dans leur wallet</span>
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto">
            Carte de fidélité digitale + notifications push gratuites.
            Zéro app à télécharger, zéro SMS à payer.
            Vos clients ajoutent votre carte en 10 secondes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Commencer gratuitement
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="text-sm text-gray-400">
              Plan gratuit, sans carte bancaire
            </p>
          </div>
        </div>
      </section>

      {/* Mockup Card */}
      <section className="pb-20 px-4">
        <div className="max-w-sm mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs opacity-60">Boulangerie du Lac</p>
                <p className="text-lg font-bold mt-1">Carte Fidélité</p>
              </div>
              <Star className="h-6 w-6 opacity-40" />
            </div>
            <div className="mt-6 flex gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full ${i < 7 ? "bg-blue-400" : "bg-gray-700"}`}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-between items-end">
              <div>
                <p className="text-xs opacity-60">Client</p>
                <p className="font-medium">Marie L.</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-60">Tampons</p>
                <p className="text-2xl font-bold">7/10</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-700 text-center">
              <p className="text-xs opacity-50">
                Encore 3 tampons = 1 croissant offert !
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Comment ça marche
          </h2>
          <p className="mt-3 text-center text-gray-500 max-w-xl mx-auto">
            En 3 étapes, vos clients ont votre carte de fidélité sur leur téléphone
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: QrCode,
                step: "1",
                title: "Le client scanne",
                desc: "Affichez votre QR code en caisse. Le client le scanne avec son appareil photo — pas d'app nécessaire.",
              },
              {
                icon: Smartphone,
                step: "2",
                title: "Formulaire en 10 secondes",
                desc: "Prénom + email ou téléphone. C'est tout. La carte est générée et ajoutée au wallet (Apple ou Google).",
              },
              {
                icon: Bell,
                step: "3",
                title: "Notifications automatiques",
                desc: "À chaque tampon ajouté, une notification apparaît. Taux de lecture 80-90%, sans SMS ni email.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white mb-4">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Tout ce dont vous avez besoin
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CreditCard,
                title: "Tampons, points ou cashback",
                desc: "Choisissez le système qui convient à votre commerce. Personnalisez les récompenses.",
              },
              {
                icon: Bell,
                title: "Notifications push gratuites",
                desc: "Annoncez vos offres directement sur l'écran de vos clients. Zéro coût supplémentaire.",
              },
              {
                icon: MapPin,
                title: "Notifications géolocalisées",
                desc: "Votre client passe à 500m ? Il reçoit une notification. Géré nativement par le wallet.",
              },
              {
                icon: BarChart3,
                title: "Analytics avancés",
                desc: "Fréquence de visite, taux de retour, clients VIP. Tout dans un dashboard clair.",
              },
              {
                icon: Users,
                title: "Parrainage intégré",
                desc: "Vos clients invitent leurs amis via un lien. Les deux gagnent des tampons bonus.",
              },
              {
                icon: MessageSquare,
                title: "Boost avis Google",
                desc: "Récompensez les avis Google avec des tampons bonus. Boostez votre référencement local.",
              },
              {
                icon: Award,
                title: "Récompenses automatiques",
                desc: "Le 10ème café offert, 5 CHF de réduction à 100 points... tout se gère automatiquement.",
              },
              {
                icon: Smartphone,
                title: "Multi-établissements",
                desc: "Gérez plusieurs adresses depuis un seul dashboard. Chaque commerce a son QR code.",
              },
              {
                icon: Star,
                title: "Conforme LPD suisse",
                desc: "Données hébergées en Suisse. Conforme à la Loi sur la Protection des Données.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border p-5 hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-gray-50" id="pricing">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Tarifs simples et transparents
          </h2>
          <p className="mt-3 text-center text-gray-500">
            Commencez gratuitement, évoluez quand vous êtes prêt
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Free */}
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-lg font-semibold">Gratuit</h3>
              <p className="mt-1 text-sm text-gray-500">Pour tester</p>
              <p className="mt-4">
                <span className="text-4xl font-bold">0</span>
                <span className="text-gray-500 ml-1">CHF/mois</span>
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "1 programme de fidélité",
                  "50 clients max",
                  "Carte à tampons",
                  "QR code",
                  "Notifications de mise à jour",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 block w-full text-center rounded-lg border border-gray-300 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Commencer
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Populaire
              </div>
              <h3 className="text-lg font-semibold">Pro</h3>
              <p className="mt-1 text-sm text-gray-500">
                Pour les commerçants actifs
              </p>
              <p className="mt-4">
                <span className="text-4xl font-bold">29</span>
                <span className="text-gray-500 ml-1">CHF/mois</span>
              </p>
              <p className="text-xs text-gray-400">
                ou 249 CHF/an (économisez 2 mois)
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "Tout du plan Gratuit",
                  "1 000 clients",
                  "Tampons, points, cashback",
                  "Notifications push illimitées",
                  "Analytics de base",
                  "Sans branding FidelX",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 block w-full text-center rounded-lg bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Essai gratuit
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-lg font-semibold">Business</h3>
              <p className="mt-1 text-sm text-gray-500">Pour les ambitieux</p>
              <p className="mt-4">
                <span className="text-4xl font-bold">59</span>
                <span className="text-gray-500 ml-1">CHF/mois</span>
              </p>
              <p className="text-xs text-gray-400">ou 499 CHF/an</p>
              <ul className="mt-6 space-y-2">
                {[
                  "Tout du plan Pro",
                  "Clients illimités",
                  "Notifications géolocalisées",
                  "Parrainage intégré",
                  "Boost avis Google",
                  "Analytics avancés",
                  "Multi-établissements",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 block w-full text-center rounded-lg border border-gray-300 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Prêt à fidéliser vos clients ?
          </h2>
          <p className="mt-3 text-gray-500">
            Créez votre première carte de fidélité en 5 minutes. Gratuit, sans
            engagement.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Créer mon compte gratuit
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-blue-600" />
            <span className="font-bold">FidelX</span>
            <span className="text-sm text-gray-400 ml-2">
              Made in Switzerland
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">
              Conditions
            </a>
            <a href="#" className="hover:text-gray-900">
              Confidentialité
            </a>
            <a href="#" className="hover:text-gray-900">
              Contact
            </a>
          </div>
          <p className="text-sm text-gray-400">© 2026 FidelX. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
