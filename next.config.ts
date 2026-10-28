import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // font kartu story dibaca dari disk saat runtime (lib/story.tsx), jadi ikutkan saat deploy.
  // bot (webhook) juga membuat gambar story untuk pesan rekap.
  outputFileTracingIncludes: {
    "/api/story/*": ["./assets/fonts/**"],
    "/bagikan/*": ["./assets/fonts/**"],
    "/api/telegram": ["./assets/fonts/**"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      // link masuk dari bot: /masuk?token=… → route handler yang memasang cookie (query ikut terbawa)
      {
        source: "/masuk",
        has: [{ type: "query", key: "token" }],
        destination: "/masuk/cek",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
