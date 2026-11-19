import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000"

// Portal preview (src/lib/preview.ts): sample data and no sign-in on the dev branch's site until the
// database and sign-in are hosted. Never on main; PORTAL_PREVIEW=0 or 1 in Amplify overrides the default.
const PORTAL_PREVIEW =
  process.env.AWS_BRANCH === "main" ? "0" : process.env.PORTAL_PREVIEW ?? (process.env.AWS_BRANCH === "dev" ? "1" : "0");
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