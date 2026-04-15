import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self, Next.js inline, Google Maps, hCaptcha (ready for item 4), Vercel Analytics
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://js.hcaptcha.com https://va.vercel-scripts.com",
      // Styles: self, inline (Tailwind), Google Fonts, Google Maps
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self, data URIs, Google Maps tiles, Supabase storage
      "img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com https://*.supabase.co",
      // Frames: hCaptcha (ready for item 4)
      "frame-src https://hcaptcha.com https://*.hcaptcha.com",
      // Connections: Supabase, Google Maps geocoding, frankfurter (currency), hCaptcha
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://api.frankfurter.app https://hcaptcha.com https://*.hcaptcha.com https://va.vercel-scripts.com",
      // Workers (Next.js)
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/partner/:path*",
        has: [
          {
            type: "host",
            value: "camel-global.com",
          },
        ],
        destination: "https://portal.camel-global.com/partner/:path*",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        has: [
          {
            type: "host",
            value: "camel-global.com",
          },
        ],
        destination: "https://portal.camel-global.com/admin/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;