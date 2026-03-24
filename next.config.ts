import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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