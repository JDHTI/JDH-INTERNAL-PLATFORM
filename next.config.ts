import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs .next/standalone/server.js without node_modules.
  output: "standalone",

  async redirects() {
    // Administration moved into the TI area; old links and bookmarks follow it.
    return [
      { source: "/administracion", destination: "/ti/administracion/areas", permanent: true },
      { source: "/administracion/:section", destination: "/ti/administracion/:section", permanent: true },
      // The supplier profiles left the supports master (2026-11-20); a saved link lands on the master.
      { source: "/:area/apoyos/perfiles/:path*", destination: "/:area/apoyos", permanent: false },
    ];
  },
};

export default nextConfig;
