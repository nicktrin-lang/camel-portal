import type { MetadataRoute } from "next";
import { getGuideLangs, listGuides, getAllGuideParams } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://portal.camel-global.com";
  const now  = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/partner/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/partner/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/partner/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const guideIndexes: MetadataRoute.Sitemap = getGuideLangs().map((lang) => ({
    url: `${base}/${lang}/guides`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const guidePosts: MetadataRoute.Sitemap = getAllGuideParams().map(({ lang, slug }) => {
    const meta = listGuides(lang).find((g) => g.slug === slug);
    const lastModified = meta?.date ? new Date(meta.date) : now;
    return {
      url: `${base}/${lang}/guides/${slug}`,
      lastModified: isNaN(lastModified.getTime()) ? now : lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    };
  });

  return [...core, ...guideIndexes, ...guidePosts];
}
