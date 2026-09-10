/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @supermind/core ships TypeScript source, so Next must transpile it.
  transpilePackages: ['@supermind/core'],
};

export default nextConfig;
