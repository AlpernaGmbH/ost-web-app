import type { NextConfig } from "next";

// Cache Components is intentionally off: this is a private, per-user app where every page reads the
// session cookie, so there is no static shell to gain and every route would need a Suspense boundary.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
