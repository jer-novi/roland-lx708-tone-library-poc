import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
