import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['picsum.photos','lorempixel.com'], // ← habilita el dominio de las imágenes
  },
  outputFileTracingIncludes: {
    "/api/tarifario/[id]/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
  serverExternalPackages: [
    "@sparticuz/chromium",
    "puppeteer-core",
    "ssh2",
    "ssh2-sftp-client",
  ],
};

export default nextConfig;
