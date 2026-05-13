import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://portal.camel-global.com";
  const now  = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/partner/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/partner/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/partner/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
