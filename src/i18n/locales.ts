export const locales = ["fr", "de", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "fr";
export const localeCookieName = "NEXT_LOCALE";

const languageAliases: Record<string, AppLocale> = {
  fr: "fr",
  de: "de",
  en: "en",
  it: "de",
};

export function isLocale(value: string | undefined | null): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function getLocaleFromAcceptLanguage(value: string | null): AppLocale {
  if (!value) return defaultLocale;

  const languages = value
    .split(",")
    .map((part) => {
      const [tag, qValue] = part.trim().split(";q=");
      const quality = qValue ? Number(qValue) : 1;
      return { tag: tag.toLowerCase(), quality: Number.isFinite(quality) ? quality : 1 };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of languages) {
    const language = tag.split("-")[0];
    const locale = languageAliases[language];
    if (locale) return locale;
  }

  return defaultLocale;
}
