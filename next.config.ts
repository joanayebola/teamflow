import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Teamflow is a fully dynamic, per-user app (auth + database on every
  // route), so Cache Components / PPR are intentionally disabled and routes
  // opt into dynamic rendering explicitly.
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
