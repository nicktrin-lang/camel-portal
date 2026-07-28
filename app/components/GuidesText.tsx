"use client";

import Link from "next/link";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageContext";

// Guides CHROME text — follows the site language switcher (the post title and
// body stay in the language they were written). Client components so switching
// the language updates them without a reload.

const TITLE: Record<Locale, string> = {
  en: "Guides", es: "Guías", fr: "Guides", it: "Guide", pt: "Guias", de: "Ratgeber",
};

const SUBTITLE: Record<Locale, string> = {
  en: "Grow your car hire business.",
  es: "Haz crecer tu negocio de alquiler de coches.",
  fr: "Développez votre activité de location de voitures.",
  it: "Fai crescere la tua attività di noleggio auto.",
  pt: "Faça crescer o seu negócio de aluguer de carros.",
  de: "Bauen Sie Ihr Autovermietungsgeschäft aus.",
};

export function GuidesHero() {
  const { locale } = useLanguage();
  return (
    <>
      <h1 className="mb-4 text-4xl font-black leading-tight text-white md:text-5xl">
        {TITLE[locale]}
      </h1>
      <p className="max-w-2xl text-lg font-semibold leading-relaxed text-white/90">
        {SUBTITLE[locale]}
      </p>
    </>
  );
}

const CTA_EYEBROW: Record<Locale, string> = {
  en: "Grow your car hire business",
  es: "Haz crecer tu negocio de alquiler",
  fr: "Développez votre activité",
  it: "Fai crescere la tua attività",
  pt: "Faça crescer o seu negócio",
  de: "Bauen Sie Ihr Geschäft aus",
};
const CTA_HEADING: Record<Locale, string> = {
  en: "Become a Camel Global partner",
  es: "Hazte socio de Camel Global",
  fr: "Devenez partenaire Camel Global",
  it: "Diventa partner di Camel Global",
  pt: "Torne-se parceiro da Camel Global",
  de: "Werden Sie Camel Global-Partner",
};
const CTA_BTN: Record<Locale, string> = {
  en: "Join Now", es: "Únete ahora", fr: "Rejoignez-nous", it: "Iscriviti ora", pt: "Junte-se agora", de: "Jetzt beitreten",
};

// Partner-signup CTA — the portal funnel is the homepage.
export function GuidesCta() {
  const { locale } = useLanguage();
  return (
    <div className="bg-black px-8 py-10 text-center">
      <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
        {CTA_EYEBROW[locale]}
      </p>
      <h2 className="mb-6 text-2xl font-black text-white md:text-3xl">{CTA_HEADING[locale]}</h2>
      <Link
        href="/"
        className="inline-block w-full max-w-md bg-[#ff7a00] px-8 py-6 text-xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:w-auto sm:px-16"
      >
        {CTA_BTN[locale]}
      </Link>
    </div>
  );
}
