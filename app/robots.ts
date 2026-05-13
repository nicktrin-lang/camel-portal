import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/partner/signup", "/partner/terms", "/partner/privacy"],
        disallow: ["/partner/", "/admin/", "/driver/", "/api/"],
      },
    ],
    sitemap: "https://portal.camel-global.com/sitemap.xml",
  };
}