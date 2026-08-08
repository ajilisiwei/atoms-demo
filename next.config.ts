import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Uploaded buddy avatars live in Vercel Blob; each store gets its own
        // subdomain, so the pattern matches the store rather than one host.
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
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
