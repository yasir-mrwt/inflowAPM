import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep project documentation intentional; Next.js should not regenerate
  // framework-owned agent instruction files during local development.
  agentRules: false,
};

export default nextConfig;
