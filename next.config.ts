import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // Pin the workspace root (a stray parent lockfile otherwise confuses inference).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
