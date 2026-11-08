import type { NextConfig } from "next";

const config: NextConfig = {
  // Self-contained server bundle for the Docker image (Fly.io).
  output: "standalone",
  images: {
    // Supabase Storage public URLs; a wildcard keeps the build independent of env vars.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      // Original images are served from the museums' own open-access CDNs.
      { protocol: "https", hostname: "openaccess-cdn.clevelandart.org" },
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "www.artic.edu" },
    ],
  },
};
export default config;
