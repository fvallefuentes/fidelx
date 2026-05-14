import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  getLocaleFromAcceptLanguage,
  isLocale,
  localeCookieName,
} from "@/i18n/locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : getLocaleFromAcceptLanguage(headerStore.get("accept-language")) || defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
