import Link from 'next/link';
import Image from 'next/image';

/**
 * Shared marketing footer.
 *
 * MANDATORY: The legal disclaimer block must never be removed
 * (CLAUDE.md §16 Rule 1). It must persist on every marketing page.
 */
export function Footer(): JSX.Element {
  return (
    <footer className="border-t border-[#CCCCCC] bg-[#FAFAFA] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Image
              src="/klarify_logo.png"
              alt="Klarify"
              width={100}
              height={34}
              className="mb-2 object-contain"
            />
            <p className="mb-4 text-sm text-[#555555]">
              Compliance OS for African fintech &amp; digital assets. Know what licence you need,
              what to do next, and stay regulator-ready. Starting with Nigeria.
            </p>
            <p className="text-xs text-[#555555]">
              Klarify is a product of Blockspace Technologies Limited · Lagos, Nigeria
            </p>
            <p className="text-xs text-[#555555]">klarify.africa · hello@klarify.africa</p>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#1A1A1A]">
              Product
            </p>
            <ul className="space-y-2 text-sm text-[#555555]">
              <li><Link href="/features" className="hover:text-[#0B6E6E]">Features</Link></li>
              <li><Link href="/who-its-for" className="hover:text-[#0B6E6E]">Who It&apos;s For</Link></li>
              <li><Link href="/pricing" className="hover:text-[#0B6E6E]">Pricing</Link></li>
              <li><Link href="/sign-in" className="hover:text-[#0B6E6E]">Sign in</Link></li>
              <li><Link href="/sign-up" className="hover:text-[#0B6E6E]">Get started free</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#1A1A1A]">
              Legal
            </p>
            <ul className="space-y-2 text-sm text-[#555555]">
              <li><a href="#" className="hover:text-[#0B6E6E]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#0B6E6E]">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#0B6E6E]">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        {/* MANDATORY LEGAL DISCLAIMER — must never be removed (CLAUDE.md §16 Rule 1) */}
        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
            Important Legal Notice
          </p>
          <p className="text-xs text-amber-800">
            Klarify provides regulatory information and educational guidance only, not legal
            advice. All AI-generated content on this platform is for informational purposes and
            must not be relied upon as a substitute for advice from a qualified Nigerian legal or
            compliance practitioner. Regulatory frameworks are subject to change. Klarify accepts
            no liability for regulatory decisions made based on information provided through this
            platform. For advice specific to your situation, consult a qualified practitioner.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-[#555555]">
            © {new Date().getFullYear()} Blockspace Technologies Limited. All rights reserved.
          </p>
          <p className="text-xs text-[#555555]">
            Powered by Klarify Team · Grounded in ISA 2025, SEC Digital Asset Rules, MLPPA
            2022
          </p>
        </div>
      </div>
    </footer>
  );
}
