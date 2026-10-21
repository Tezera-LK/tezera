import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    BUILD_BRANCH: process.env.AWS_BRANCH ?? "local",
    BUILD_COMMIT: (process.env.AWS_COMMIT_ID ?? "local").slice(0, 7),
  },
};

export default nextConfig;