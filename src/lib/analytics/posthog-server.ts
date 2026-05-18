/**
 * Posthog côté serveur.
 *
 * Utilisé pour les events qui n'arrivent pas en navigateur :
 *  - Webhooks Stripe (subscription created, paid, refunded)
 *  - Cron jobs (referral confirm, campaigns sent)
 *  - Mutations API critiques (program créé, plan changé, etc.)
 *
 * NextJS API routes sont serverless-ish — on flush manuellement après
 * chaque event pour ne rien perdre quand le process se termine.
 */
import { PostHog } from "posthog-node";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (_client) return _client;
  _client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    // Flush immédiatement (1 event = 1 flush) côté serveur — sinon les events
    // peuvent être perdus quand le runtime Next se termine.
    flushAt: 1,
    flushInterval: 0,
  });
  return _client;
}

/**
 * Capture un événement métier côté serveur.
 *
 * @param distinctId — userId Fidlify (= même ID que côté client pour stitch)
 *                     ou un ID anonyme (ex: serialNumber d'une carte) si
 *                     aucun user authentifié.
 * @param event — nom de l'événement (convention : "merchant.signed_up",
 *                "card.distributed", "plan.upgraded").
 * @param properties — propriétés libres (Json sérialisable).
 *
 * Fire-and-forget : ne throw jamais, ne bloque jamais le caller.
 */
export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = getClient();
  if (!client) return; // no-op silencieux si pas configuré
  try {
    client.capture({
      distinctId,
      event,
      properties: {
        $lib: "fidlify-server",
        ...properties,
      },
    });
    // Flush immédiat pour ne rien perdre
    await client.flush();
  } catch (err) {
    console.error("[posthog-server] trackServerEvent failed:", err);
  }
}

/**
 * Identify : met à jour les propriétés persistantes d'un user côté Posthog
 * (plan, role, langue, etc.). À appeler quand le user change de plan ou
 * d'attribut significatif.
 */
export async function identifyServerUser(
  userId: string,
  properties: Record<string, unknown>
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    client.identify({
      distinctId: userId,
      properties,
    });
    await client.flush();
  } catch (err) {
    console.error("[posthog-server] identifyServerUser failed:", err);
  }
}
