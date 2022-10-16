/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = {
  webpack: (nextConfig, options) => {
    nextConfig.experiments = {
      topLevelAwait: true,
    };
    return nextConfig;
  },
};
