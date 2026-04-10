/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CRITICAL DEPLOYMENT FIX: The Webpack asyncWebAssembly override has been explicitly removed.
  // The WASM binary is successfully bypassed as a static public asset to prevent Vercel SSR build panics.
};

module.exports = nextConfig;
