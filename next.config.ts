import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs .next/standalone/server.js without node_modules.
  output: "standalone",

  async redirects() {
    // Administration moved into the TI area; old links and bookmarks follow it.
    return [
      { source: "/administracion", destination: "/ti/administracion/areas", permanent: true },
      { source: "/administracion/:section", destination: "/ti/administracion/:section", permanent: true },
    ];
  },
};

export default nextConfig;
