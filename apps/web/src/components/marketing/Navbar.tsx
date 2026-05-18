import Link from 'next/link';
import Image from 'next/image';

/**
 * Shared marketing navbar.
 *
 * Used on /, /features, /pricing, /who-its-for.
 * Links route to real pages (not hash anchors) so they remain navigable
 * from any marketing page, not just the landing page.
 */
export function Navbar(): JSX.Element {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1A3A55] bg-[#0D2B45]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/klarify_logo.png"
            alt="Klarify"
            width={112}
            height={38}
            priority
            className="object-contain brightness-0 invert"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/features" className="text-sm text-white/70 transition hover:text-white">
            Features
          </Link>
          <Link href="/who-its-for" className="text-sm text-white/70 transition hover:text-white">
            Who It&apos;s For
          </Link>
          <Link href="/pricing" className="text-sm text-white/70 transition hover:text-white">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}
