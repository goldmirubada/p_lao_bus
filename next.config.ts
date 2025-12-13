import type { NextConfig } from "next";

// @ts-ignore
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: true, // FORCE DISABLE PWA to prevent Service Worker caching issues in Webview
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export', // Enable export only for production build
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};

export default process.env.NODE_ENV === 'development' ? nextConfig : withPWA(nextConfig);
