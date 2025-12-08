import type { NextConfig } from "next";

// @ts-ignore
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  // output: 'export', // WARN: API Routes not supported in static export. Enable only for mobile build.
  images: {
    unoptimized: true,
  },
};

export default process.env.NODE_ENV === 'development' ? nextConfig : withPWA(nextConfig);
