import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared client is TypeScript source in the workspace.
  transpilePackages: ["@blindside/client"],
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Turbopack's file-system cache served a stale Tailwind stylesheet after
    // globals.css changed (in dev, and on Vercel, which restores .next/cache).
    // Always compile CSS fresh; the build is small.
    turbopackFileSystemCacheForBuild: false,
    turbopackFileSystemCacheForDev: false,
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
