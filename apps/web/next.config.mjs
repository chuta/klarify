/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@klarify/core', '@klarify/ai', '@klarify/ui'],
  experimental: {
    typedRoutes: true,
  },
  /**
   * Teach webpack to resolve .js imports to .ts/.tsx sources.
   *
   * packages/core and packages/ai use `moduleResolution: NodeNext` which
   * requires explicit `.js` extensions in TypeScript source files — TypeScript
   * compiles these correctly, but webpack (used by Next.js transpilePackages)
   * looks for literal .js files and fails. extensionAlias fixes this by telling
   * webpack: "when you see .js, also try .ts and .tsx".
   */
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default nextConfig;
