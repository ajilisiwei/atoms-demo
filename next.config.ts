import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Uploaded buddy avatars live in Vercel Blob; each store gets its own
        // single-label subdomain, so one wildcard segment covers it.
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    // Dev-only: fake-IP proxy setups resolve public hostnames to 198.18.x.x,
    // which trips the optimizer's SSRF guard. Production keeps the guard.
    ...(process.env.NODE_ENV === "development"
      ? { dangerouslyAllowLocalIP: true }
      : {}),
  },
  async headers() {
    return [
      {
        // Sandboxed preview documents have an opaque origin, and module
        // scripts fetch in CORS mode — vendor assets must allow any origin.
        source: "/vendor/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
