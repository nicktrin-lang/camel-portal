import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuidesChrome from "@/app/components/GuidesChrome";
import { getGuide, relatedGuides, getAllGuideParams, isGuideLang } from "@/lib/guides";
import GuideCountryNav from "@/app/components/GuideCountryNav";
import { GuidesCta } from "@/app/components/GuidesText";

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllGuideParams();
}

const SITE = "https://portal.camel-global.com";

function fmtDate(iso: string, lang: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const guide = getGuide(lang, slug);
  if (!guide) return {};
  const canonical = guide.canonical || `${SITE}/${lang}/guides/${slug}`;
  return {
    title: { absolute: guide.title },
    description: guide.description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: canonical,
      type: "article",
      locale: lang,
    },
  };
}

export default async function GuidePost({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isGuideLang(lang)) notFound();
  const guide = getGuide(lang, slug);
  if (!guide) notFound();
  const related = relatedGuides(lang, slug, 3);

  return (
    <GuidesChrome lang={lang}>
      <article className="w-full">
        <header className="w-full bg-black px-6 pt-12 pb-10 text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
            {/* Spacer matches the country nav below so the title lines up with the body */}
            <div className="hidden shrink-0 md:block md:w-56" aria-hidden />
            <div className="min-w-0 flex-1">
              <Link
                href={`/${lang}/guides`}
                className="mb-6 inline-block text-xs font-black uppercase tracking-widest text-[#ff7a00] hover:underline"
              >
                ← Camel Global Guides
              </Link>
              {guide.date && (
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-white/50">
                  {fmtDate(guide.date, lang)}
                </p>
              )}
              <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
                {guide.title}
              </h1>
            </div>
          </div>
        </header>

        <div className="w-full bg-white px-6 py-14">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
            <GuideCountryNav lang={lang} selected={guide.country} />
            <div className="min-w-0 flex-1">
          <div
            className="guide-body"
            dangerouslySetInnerHTML={{ __html: stripLeadingH1(guide.html) }}
          />

          {/* Partner-signup CTA — chrome text follows the site language switcher */}
          <div className="mt-14 border-t border-black/10 pt-10">
            <GuidesCta />
          </div>

          {related.length > 0 && (
            <div className="mt-14">
              <h2 className="mb-6 text-xs font-black uppercase tracking-widest text-black/40">
                More guides
              </h2>
              <ul className="divide-y divide-black/10">
                {related.map((r) => (
                  <li key={r.slug} className="py-4">
                    <Link
                      href={`/${lang}/guides/${r.slug}`}
                      className="group flex items-baseline justify-between gap-4"
                    >
                      <span className="text-lg font-black text-black transition-colors group-hover:text-[#ff7a00]">
                        {r.title}
                      </span>
                      <span className="shrink-0 text-sm font-black text-[#ff7a00]">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
            </div>
          </div>
        </div>
      </article>
    </GuidesChrome>
  );
}

// The body already opens with an H1 (with the brand). We render a styled title
// band above, so drop the body's first H1 to keep a single H1 per page.
function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/i, "");
}
