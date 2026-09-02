import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuidesChrome from "@/app/components/GuidesChrome";
import {
  isGuideLang,
  getGuideLangs,
  getGuideCountries,
  guidesByCountry,
  listAllGuides,
  countryName,
  GUIDE_LANG_LABEL,
  PRIMARY_GUIDE_LANG,
} from "@/lib/guides";
import { GuidesHero } from "@/app/components/GuidesText";
import GuidePostList from "@/app/components/GuidePostList";

export const dynamicParams = true;

export function generateStaticParams() {
  return getGuideLangs().map((lang) => ({ lang }));
}

const SITE = "https://portal.camel-global.com";

/** The country filter in effect: a valid `?country=` code, or null meaning "show
 *  everything". `generateMetadata` and the page body MUST agree on this — the canonical
 *  is derived from it — so both go through this one function.
 *
 *  Note it returns null for a missing/unknown code rather than falling back to the first
 *  country. It used to default to `countries[0]`, which is France alphabetically, so the
 *  canonical hub /en/guides advertised 2 French posts while all 39 Spanish ones sat on
 *  ?country=ES canonicalising away to it. */
function selectedCountry(country?: string): string | null {
  if (!country) return null;
  const code = country.toUpperCase();
  return getGuideCountries().some((c) => c.code === code) ? code : null;
}

function fmtDate(iso: string, lang: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ country?: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isGuideLang(lang)) return {};
  const { country } = await searchParams;
  const code = selectedCountry(country);
  const label = GUIDE_LANG_LABEL[lang];
  const where = code ? ` in ${countryName(code)}` : "";
  const title = `${label} for Partners${where} — Camel Global`;
  const description = code
    ? `Guides for car hire companies in ${countryName(code)}: how to become a Camel Global partner, win bookings, and get paid.`
    : "Guides for car hire companies: how to become a Camel Global partner, win bookings, and get paid.";
  // The LANGUAGE segment on this index is cosmetic — every /<lang>/guides renders the same
  // aggregate, so all six consolidate to the primary lang. A COUNTRY filter is different:
  // it is a genuinely distinct set of posts, so it keeps its own canonical instead of
  // collapsing into the unfiltered hub and going unindexed.
  const canonical = `${SITE}/${PRIMARY_GUIDE_LANG}/guides${code ? `?country=${code}` : ""}`;
  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function GuidesIndex({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { lang } = await params;
  if (!isGuideLang(lang)) notFound();
  const { country } = await searchParams;

  const countries = getGuideCountries();
  const selected = selectedCountry(country);
  const posts = selected ? guidesByCountry(selected) : listAllGuides();
  const totalCount = countries.reduce((n, c) => n + c.count, 0);

  return (
    <GuidesChrome lang={lang}>
      {/* Hero — title + subtitle follow the site language switcher */}
      <section className="w-full bg-black px-6 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
            Camel Global Partners
          </p>
          <GuidesHero />
        </div>
      </section>

      <section className="w-full bg-white px-6 py-12 sm:py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
          {/* Country nav */}
          <aside className="shrink-0 md:w-56">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/40">Countries</p>
            {countries.length === 0 ? (
              <p className="text-sm font-semibold text-black/50">No guides yet.</p>
            ) : (
              <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
                <li>
                  <Link
                    href={`/${lang}/guides`}
                    className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-sm font-black transition-colors md:border-0 md:border-l-4 md:px-3 ${
                      !selected
                        ? "border-[#ff7a00] bg-[#ff7a00] text-white md:bg-transparent md:text-black"
                        : "border-black/15 text-black/70 hover:bg-black/5 md:border-transparent md:hover:border-black/20"
                    }`}
                  >
                    <span>All countries</span>
                    <span className={!selected ? "text-white md:text-[#ff7a00]" : "text-black/30"}>{totalCount}</span>
                  </Link>
                </li>
                {countries.map((c) => {
                  const active = c.code === selected;
                  return (
                    <li key={c.code}>
                      <Link
                        href={`/${lang}/guides?country=${c.code}`}
                        className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-sm font-black transition-colors md:border-0 md:border-l-4 md:px-3 ${
                          active
                            ? "border-[#ff7a00] bg-[#ff7a00] text-white md:bg-transparent md:text-black"
                            : "border-black/15 text-black/70 hover:bg-black/5 md:border-transparent md:hover:border-black/20"
                        }`}
                      >
                        <span>{countryName(c.code)}</span>
                        <span className={active ? "text-white md:text-[#ff7a00]" : "text-black/30"}>{c.count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Posts — paginated with a "Show more" control */}
          <div className="min-w-0 flex-1">
            {posts.length === 0 ? (
              <p className="text-lg font-semibold text-black/60">No guides yet — check back soon.</p>
            ) : (
              <GuidePostList
                posts={posts.map((g) => ({
                  href: `/${g.lang}/guides/${g.slug}`,
                  title: g.headline || g.title, // article headline (matches the post page); SEO title stays on <title>
                  description: g.description,
                  dateLabel: g.date ? fmtDate(g.date, g.lang) : undefined,
                }))}
              />
            )}
          </div>
        </div>
      </section>
    </GuidesChrome>
  );
}
