import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import GuidesChrome from "@/app/components/GuidesChrome";
import {
  isGuideLang,
  getGuideLangs,
  listGuides,
  getGuideMarkets,
  countryForLang,
  langForCountry,
  countryName,
} from "@/lib/guides";
import { GuidesHero } from "@/app/components/GuidesText";
import GuidePostList from "@/app/components/GuidePostList";

export const dynamicParams = true;

export function generateStaticParams() {
  return getGuideLangs().map((lang) => ({ lang }));
}

const SITE = "https://portal.camel-global.com";

/** `/<lang>/guides` IS the country hub for that language's market — see GuideMarket in
 *  lib/guides.ts. Each language folder holds its own articles for one country, so the
 *  German guides live at /de/guides and canonicalise there, not into an English hub.
 *
 *  A `?country=` query is the OLD shape (one aggregated index, filtered). It now
 *  permanently redirects to the owning language path, so there is exactly one indexable
 *  URL per market and Google is never asked to pick between /fr/guides?country=DE and
 *  /de/guides for the same two German articles. */
function fmtDate(iso: string, lang: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isGuideLang(lang)) return {};
  const country = countryForLang(lang);
  if (!country) return {};
  const where = ` in ${countryName(country)}`;
  // All-English on purpose: a localised noun bolted onto an English sentence produced
  // mongrel titles like "Ratgeber for Partners in Portugal". The guide CONTENT is in the
  // market's language; this chrome string is not.
  const title = `Guides for Partners${where} — Camel Global`;
  const description = `Guides for car hire companies in ${countryName(country)}: how to become a Camel Global partner, win bookings, and get paid.`;
  // Self-canonical. This is the one indexable URL for this market.
  const canonical = `${SITE}/${lang}/guides`;
  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", locale: lang },
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

  // Legacy ?country= URLs collapse onto the owning market's path — 308, so the old shape
  // stops competing with the new one in the index.
  if (country) {
    const target = langForCountry(country) ?? lang;
    permanentRedirect(`/${target}/guides`);
  }

  const markets = getGuideMarkets();
  const selfCountry = countryForLang(lang);
  // A language folder with no posts is not a hub — 404 rather than serve an empty,
  // indexable page that dilutes the market hubs.
  if (!selfCountry) notFound();
  const posts = listGuides(lang);

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
            {markets.length === 0 ? (
              <p className="text-sm font-semibold text-black/50">No guides yet.</p>
            ) : (
              <ul className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
                {markets.map((c) => {
                  const active = c.lang === lang;
                  return (
                    <li key={c.lang}>
                      <Link
                        href={`/${c.lang}/guides`}
                        hrefLang={c.lang}
                        className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-sm font-black transition-colors md:border-0 md:border-l-4 md:px-3 ${
                          active
                            ? "border-[#ff7a00] bg-[#ff7a00] text-white md:bg-transparent md:text-black"
                            : "border-black/15 text-black/70 hover:bg-black/5 md:border-transparent md:hover:border-black/20"
                        }`}
                      >
                        <span>{countryName(c.country)}</span>
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
                  // Every post on this hub is in this market's language, so the extract
                  // links stay inside /<lang>/ — the card and the article it opens share
                  // one country path.
                  href: `/${lang}/guides/${g.slug}`,
                  title: g.headline || g.title, // article headline (matches the post page); SEO title stays on <title>
                  description: g.description,
                  dateLabel: g.date ? fmtDate(g.date, lang) : undefined,
                }))}
              />
            )}
          </div>
        </div>
      </section>
    </GuidesChrome>
  );
}
