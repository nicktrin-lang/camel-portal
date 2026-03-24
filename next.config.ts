import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/partner/:path*",
        destination: "https://portal.camel-global.com/partner/:path*",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: "https://portal.camel-global.com/admin/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
