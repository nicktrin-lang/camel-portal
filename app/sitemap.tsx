import type { MetadataRoute } from "next";
import { listGuides, getAllGuideParams, getGuideMarkets } from "@/lib/guides";

// Static: read guide content at BUILD time and bake the URLs in. A dynamic
// metadata route can't reach content/guides on Vercel (outputFileTracingIncludes
// doesn't apply to it), so it must be generated at build where the markdown is
// present.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://portal.camel-global.com";
  const now  = new Date();

  // Only index public-facing pages — never partner/admin/driver portal pages.
  const core: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/partner/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/partner/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/partner/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // One indexable hub PER MARKET — /<lang>/guides is that country's guides index and
  // canonicalises to itself. (It used to be a single aggregated index that every language
  // variant consolidated into, which left the country dimension invisible to search.)
  const guideIndexes: MetadataRoute.Sitemap = getGuideMarkets().map(({ market }) => ({
    url: `${base}/${market}/guides`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const guidePosts: MetadataRoute.Sitemap = getAllGuideParams().map(({ market, slug }) => {
    const meta = listGuides(market).find((g) => g.slug === slug);
    const lastModified = meta?.date ? new Date(meta.date) : now;
    return {
      url: `${base}/${market}/guides/${slug}`,
      lastModified: isNaN(lastModified.getTime()) ? now : lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    };
  });

  return [...core, ...guideIndexes, ...guidePosts];
}
