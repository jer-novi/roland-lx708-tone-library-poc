import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Docker containers to connect to webpack-hmr for hot-reload.
  // Next 16 promoted this from experimental.allowedDevOrigins to a
  // top-level option. Alleen strings hier (geen RegExp, Next 16 strict).
  // `*` matcht hier maar één hostname-segment (geen punten), dus voor het
  // 100.x.x.x Tailscale-subnet zijn drie wildcards nodig (100.*.*.*).
  allowedDevOrigins: [
    "0.0.0.0",
    "localhost",
    "127.0.0.1",
    "100.*.*.*", // Tailscale (en Docker-bridge) subnet
  ],
  images: {
    // Lokale dev-backend: API_URL wijst naar http://localhost:8080 in dev.
    // De ThumbnailComponent gebruikt 'unoptimized' voor <Image>, dus deze
    // remotePatterns zijn alleen relevant voor next/image zonder
    // unoptimized — we laten de oude Wikimedia-entry staan voor backward
    // compat met eventuele WikiCard-renderings die nog externe URLs
    // zouden kunnen serveren.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/api/wiki-thumbs/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/api/wiki-thumbs-hd/**",
      },
    ],
  },
};

export default nextConfig;
