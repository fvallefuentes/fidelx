/**
 * Normalisation des identifiants client (email, téléphone) pour la dedup.
 *
 * Stratégie : on stocke ET on cherche les identifiants normalisés. Cela
 * évite que "Marie@X.com" et "marie@x.com" créent deux clients distincts.
 *
 * Pour les comptes commerçants (User), on applique aussi la normalisation
 * à l'inscription (déjà fait avec `.trim().toLowerCase()`).
 */

/**
 * Normalise un email :
 * - trim + lowercase
 * - Gmail/Googlemail : retire les points du local-part et tout ce qui suit `+`
 *   ("marie.test+promo@gmail.com" → "marietest@gmail.com")
 *
 * Pour les autres providers, on garde la structure car de nombreux services
 * (Apple iCloud, ProtonMail, Outlook…) traitent `+aliases` comme des inbox
 * distincts.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return trimmed; // laissera la validation côté DB

  const [local, domain] = trimmed.split("@");
  const isGmail = domain === "gmail.com" || domain === "googlemail.com";

  if (!isGmail) return `${local}@${domain}`;

  // Gmail : strip dots + tout après `+`
  const localNoPlus = local.split("+")[0];
  const localNoDots = localNoPlus.replace(/\./g, "");
  return `${localNoDots}@gmail.com`;
}

/**
 * Normalise un numéro de téléphone (orientation suisse, fallback international) :
 * - retire tout sauf chiffres et `+`
 * - 0791234567        → +41791234567       (Swiss national → E.164)
 * - 0041791234567     → +41791234567
 * - 41791234567       → +41791234567
 * - +41 79 123 45 67  → +41791234567
 * - autres formats internationaux : préservés en E.164 si possible
 *
 * Si le numéro est invalide ou trop court, retourne null.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Garder seulement chiffres et `+` initial
  let digits = trimmed.replace(/[^\d+]/g, "");
  const hadPlus = digits.startsWith("+");
  digits = digits.replace(/\+/g, "");

  if (!digits) return null;

  // Convention suisse :
  if (digits.startsWith("00")) {
    digits = digits.slice(2); // 0041... → 41...
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = "41" + digits.slice(1); // 079... → 4179...
  }

  // Format final E.164 avec `+`
  const result = `+${digits}`;

  // Sanity check : E.164 = entre 8 et 15 chiffres (ITU-T E.164)
  if (digits.length < 8 || digits.length > 15) {
    // Si l'utilisateur avait mis un `+` explicitement, on garde quand même
    return hadPlus ? result : null;
  }

  return result;
}
