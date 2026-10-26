import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve images (mostly static webp/png brand assets) as-is. The optimizer
  // rejects some of the supplied webp variants with a 400, so skip it.
  images: { unoptimized: true },
  // Allow the sandbox preview proxy to request dev resources (HMR) while
  // previewing on a phone / remote client.
  allowedDevOrigins: [
    "run-agent-6ade01e2709d8b043bcd5f8d-37fp661lhww8tmvzu44.remote-agent.svc.cluster.local",
    ".remote-agent.svc.cluster.local",
    "*.remote-agent.svc.cluster.local",
  ],
};

export default nextConfig;
