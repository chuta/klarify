/** @type {import('next').NextConfig} */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@klarify/core', '@klarify/ai', '@klarify/ui'],
  /**
   * PostHog reverse proxy (US Cloud).
   *
   * Browsers send analytics to `/ingest/*` on our own origin, which Next.js
   * rewrites to PostHog. This keeps requests first-party so ad-blockers and
   * mobile networks common in our African market don't silently drop events.
   * `skipTrailingSlashRedirect` prevents a 308 on the static-asset path.
   *
   * Endpoints per PostHog US Cloud:
   *   - ingestion: https://us.i.posthog.com
   *   - static assets: https://us-assets.i.posthog.com
   */
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  experimental: {
    typedRoutes: true,
    // Prisma's query engine is a native `.node` binary that is loaded
    // dynamically at runtime. Bundling it through webpack breaks the loader;
    // marking it external tells Next.js to require it from node_modules in
    // the serverless function instead.
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client'],
    // Force the rhel-openssl-3.0.x engine binary into the function bundle.
    // Without this, Next.js' file tracer may miss the dynamically-loaded
    // `.so.node` file and Lambda throws PrismaClientInitializationError.
    outputFileTracingIncludes: {
      '/**/*': [
        './node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
        './node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/schema.prisma',
      ],
    },
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
