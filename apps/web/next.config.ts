import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000"

// Portal preview (src/lib/preview.ts): sample data and no sign-in. Off by default everywhere, so the
// dev site needs a real login too. Never on main; set PORTAL_PREVIEW=1 on a branch in Amplify to turn it on.
const PORTAL_PREVIEW = process.env.AWS_BRANCH === "main" ? "0" : process.env.PORTAL_PREVIEW ?? "0";
const nextConfig: NextConfig = {
  env: {
    BUILD_BRANCH: process.env.AWS_BRANCH ?? "local",
    BUILD_COMMIT: (process.env.AWS_COMMIT_ID ?? "local").slice(0, 7),
    PORTAL_PREVIEW,
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