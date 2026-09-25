import type { NextConfig } from "next";

const apiTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
