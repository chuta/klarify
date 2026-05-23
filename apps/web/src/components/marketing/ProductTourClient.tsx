'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  PRODUCT_TOUR_STOPS,
  productTourImageSrc,
  type TourEngine,
} from '@/lib/productTour';

const ENGINE_STYLES: Record<TourEngine, { badge: string; accent: string }> = {
  FounderCounsel: { badge: 'bg-[#0B6E6E] text-white', accent: 'border-[#0B6E6E]' },
  ComplianceOS: { badge: 'bg-[#D4A843] text-white', accent: 'border-[#D4A843]' },
  Platform: { badge: 'bg-[#0D2B45] text-white', accent: 'border-[#0D2B45]' },
};

/**
 * Interactive product tour — sidebar navigation + screenshot panel.
 * Public preview for visitors who have not signed up yet.
 */
export function ProductTourClient(): JSX.Element {
  const [activeId, setActiveId] = useState(PRODUCT_TOUR_STOPS[0]?.id ?? '');

  const active =
    PRODUCT_TOUR_STOPS.find((stop) => stop.id === activeId) ?? PRODUCT_TOUR_STOPS[0];
  if (!active) return <></>;

  const styles = ENGINE_STYLES[active.engine];

  return (
    <section className="bg-[#FAFAFA] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        {/* Mobile: horizontal stop picker */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 md:hidden">
          {PRODUCT_TOUR_STOPS.map((stop) => (
            <button
              key={stop.id}
              type="button"
              onClick={() => setActiveId(stop.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                stop.id === activeId
                  ? 'bg-[#0B6E6E] text-white'
                  : 'border border-[#CCCCCC] bg-white text-[#555555]'
              }`}
            >
              {stop.title}
            </button>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          {/* Desktop sidebar */}
          <nav
            className="hidden lg:block"
            aria-label="Product tour sections"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#555555]">
              Explore the platform
            </p>
            <ul className="space-y-1">
              {PRODUCT_TOUR_STOPS.map((stop) => (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(stop.id)}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                      stop.id === activeId
                        ? 'bg-white font-semibold text-[#0B6E6E] shadow-sm ring-1 ring-[#0B6E6E]/20'
                        : 'text-[#555555] hover:bg-white/80 hover:text-[#1A1A1A]'
                    }`}
                  >
                    {stop.title}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-xl border border-[#0B6E6E]/20 bg-[#E6F4F4] p-4">
              <p className="mb-3 text-sm font-semibold text-[#0D2B45]">
                Ready to try it yourself?
              </p>
              <Link
                href="/sign-up"
                className="block rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
              >
                Get started free
              </Link>
            </div>
          </nav>

          {/* Active stop detail */}
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${styles.badge}`}
              >
                {active.engine}
              </span>
              <span className="rounded-full border border-[#CCCCCC] bg-white px-3 py-1 text-xs font-medium text-[#555555]">
                {active.planLabel}
              </span>
            </div>

            <h2 className="mb-3 text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
              {active.title}
            </h2>
            <p className="mb-6 max-w-2xl text-base text-[#555555]">{active.description}</p>

            <ul className="mb-8 space-y-2">
              {active.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#555555]">
                  <span className="mt-0.5 shrink-0 text-[#0B6E6E]">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* Browser-style screenshot frame */}
            <div
              className={`overflow-hidden rounded-2xl border-2 bg-white shadow-xl ${styles.accent}`}
            >
              <div className="flex items-center gap-2 border-b border-[#CCCCCC] bg-[#F5F5F5] px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#C0392B]/70" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#D4A843]/70" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#1A7A4A]/70" aria-hidden />
                <span className="ml-3 truncate text-xs text-[#555555]">
                  app.klarify.africa — {active.title}
                </span>
              </div>
              <div className="relative bg-[#FAFAFA]">
                <Image
                  src={productTourImageSrc(active.imageFile)}
                  alt={`Klarify dashboard — ${active.title}`}
                  width={1440}
                  height={900}
                  className="h-auto w-full"
                  priority={active.id === PRODUCT_TOUR_STOPS[0]?.id}
                />
              </div>
            </div>

            {/* Prev / next */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <TourNavButton
                direction="prev"
                stopId={active.id}
                onSelect={setActiveId}
              />
              <span className="text-xs text-[#555555]">
                {PRODUCT_TOUR_STOPS.findIndex((s) => s.id === active.id) + 1} of{' '}
                {PRODUCT_TOUR_STOPS.length}
              </span>
              <TourNavButton
                direction="next"
                stopId={active.id}
                onSelect={setActiveId}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface TourNavButtonProps {
  direction: 'prev' | 'next';
  stopId: string;
  onSelect: (id: string) => void;
}

function TourNavButton({ direction, stopId, onSelect }: TourNavButtonProps): JSX.Element {
  const index = PRODUCT_TOUR_STOPS.findIndex((s) => s.id === stopId);
  const target =
    direction === 'prev'
      ? PRODUCT_TOUR_STOPS[index - 1]
      : PRODUCT_TOUR_STOPS[index + 1];

  if (!target) {
    return <span className="w-24" />;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(target.id)}
      className="rounded-lg border border-[#CCCCCC] bg-white px-4 py-2 text-sm font-semibold text-[#0B6E6E] transition hover:border-[#0B6E6E] hover:bg-[#E6F4F4]"
    >
      {direction === 'prev' ? '← Previous' : 'Next →'}
    </button>
  );
}
