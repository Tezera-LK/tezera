import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000"
const nextConfig: NextConfig = {
  env: {
    BUILD_BRANCH: process.env.AWS_BRANCH ?? "local",
    BUILD_COMMIT: (process.env.AWS_COMMIT_ID ?? "local").slice(0, 7),
  },
  async rewrites() {
    return [
      {
        source: "/api",
        destination: `${API_URL}/`,
      },
      {
        source: "/api/:path+",
        destination: `${API_URL}/:path+`,
      },
    ];
  },
};

export default nextConfig;