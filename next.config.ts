import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted deployment: standalone server bundle (node .next/standalone/server.js)
  output: "standalone",
};

export default nextConfig;
