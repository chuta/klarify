/** @type {import('next').NextConfig} */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    const srcPath = path.resolve(__dirname, 'src');
    const existing = config.resolve.alias;
    // Explicit `@/* → ./src/*` — mirrors tsconfig; fixes CI “Can't resolve '@/lib/…'”
    // when path aliases aren’t applied the same as in local dev.
    if (Array.isArray(existing)) {
      config.resolve.alias = [...existing, { name: '@', alias: srcPath }];
    } else {
      config.resolve.alias = { ...(existing ?? {}), '@': srcPath };
    }
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
