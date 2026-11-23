import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared client is TypeScript source in the workspace.
  transpilePackages: ["@blindside/client"],
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
