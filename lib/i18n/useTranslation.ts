"use client";

import { useLanguage } from "./LanguageContext";
import en from "./locales/en.json";
import es from "./locales/es.json";

const translations: Record<string, Record<string, string>> = { en, es };

/**
 * useTranslation()
 *
 * Usage:
 *   const { t } = useTranslation();
 *   <p>{t("dashboard.welcome")}</p>
 *
 * Keys use dot notation. If a key is missing in the target locale,
 * it falls back to English — nothing ever breaks with a missing key.
 */
export function useTranslation() {
  const { locale } = useLanguage();

  function t(key: string, vars?: Record<string, string | number>): string {
    const dict = translations[locale] ?? translations["en"];
    const fallback = translations["en"];

    let str: string = (dict[key] ?? fallback[key] ?? key);

    // Simple variable interpolation: t("x", { name: "Nick" }) with "Hello {{name}}"
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replaceAll(`{{${k}}}`, String(v));
      });
    }

    return str;
  }

  return { t, locale };
}