import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray parent lockfile otherwise confuses inference).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
