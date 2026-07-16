/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: "../../",
  experimental: {},
  webpack: (config) => config,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      {
        source: '/shop',
        destination: '/collections/all',
        permanent: true,
      },
      {
        source: '/collections/new-arrivals',
        destination: '/collections/all',
        permanent: true,
      }
    ];
  },
};

export default nextConfig;
