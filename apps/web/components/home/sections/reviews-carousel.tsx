'use client';
// apps/web/components/home/sections/reviews-carousel.tsx
// ═══════════════════════════════════════════════════════════════
// Patient-reviews CAROUSEL (client island). Shows 4 cards per view on desktop,
// 2 on tablet, 1 + a peek on mobile (sizing lives in home.css). Pages derive
// automatically from the scroll track width, so "next" advances one full view
// (a page of 4 on desktop) and the dot count adapts to the breakpoint.
//
// Accessibility (W3C APG carousel + WCAG 2.2 AA):
//  • region with aria-roledescription="carousel" + a label.
//  • Prev/Next are real <button>s placed in the DOM BEFORE the track; clicking
//    scrolls the track but keeps focus on the button (press repeatedly).
//  • Pagination dots are <button>s with aria-current on the active page and a
//    >=24px hit area even though the visual dot is small.
//  • A visually-hidden aria-live="polite" region announces the current page.
//  • Native swipe comes free from scroll-snap; arrows/dots are the non-drag
//    alternative (2.5.7). Smooth scroll only when motion is welcome.
//  • Cards carry no interactive controls, so off-screen cards never trap focus.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReviewItem } from '../data';
import { ArrowLeft, ArrowRight, Check, Star } from '../_shared';

export type ReviewsCarouselLabels = {
  /** Accessible name for the carousel region. */
  region: string;
  prev: string;
  next: string;
  /** Template with {current} and {total}, e.g. "Reviews, page {current} of {total}". */
  pageTemplate: string;
  /** e.g. "5 out of 5 stars". */
  rating: string;
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fillTemplate(tpl: string, current: number, total: number): string {
  return tpl.replace('{current}', String(current)).replace('{total}', String(total));
}

export function ReviewsCarousel({
  reviews,
  labels,
}: {
  reviews: readonly ReviewItem[];
  labels: ReviewsCarouselLabels;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  // Deterministic initial dot count (desktop default = 4 per view) so SSR and
  // the first client render agree on the steady-state pager (no post-hydration
  // dot-row jump / next-arrow flip). sync() refines per real breakpoint on mount.
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(() => Math.max(1, Math.ceil(reviews.length / 4)));

  /** Measure the real card pitch (card width + gap) so page maths match the
   *  snapped card at every breakpoint, including the mobile 1-card + peek view. */
  const metrics = useCallback(() => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return null;
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    const pitch = first.offsetWidth + gap;
    const perView = Math.max(1, Math.round(el.clientWidth / pitch));
    return { el, perView, step: perView * pitch };
  }, []);

  const sync = useCallback(() => {
    const m = metrics();
    if (!m) return;
    const count = Math.max(1, Math.ceil(reviews.length / m.perView));
    const current = Math.min(count - 1, Math.round(m.el.scrollLeft / m.step));
    setPageCount(count);
    setPage(current);
  }, [metrics, reviews.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [sync]);

  const scrollToPage = useCallback(
    (target: number) => {
      const m = metrics();
      if (!m) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const max = m.el.scrollWidth - m.el.clientWidth;
      m.el.scrollTo({ left: Math.min(target * m.step, max), behavior: reduce ? 'auto' : 'smooth' });
    },
    [metrics],
  );

  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;
  const liveMessage = fillTemplate(labels.pageTemplate, page + 1, pageCount);

  return (
    <div className="rev" role="region" aria-roledescription="carousel" aria-label={labels.region}>
      <div className="rev__head">
        <div className="rev__nav">
          <button
            type="button"
            className="rev__arrow"
            aria-label={labels.prev}
            disabled={atStart}
            onClick={() => scrollToPage(page - 1)}
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            className="rev__arrow"
            aria-label={labels.next}
            disabled={atEnd}
            onClick={() => scrollToPage(page + 1)}
          >
            <ArrowRight />
          </button>
        </div>
      </div>

      <ul className="rev__track" ref={trackRef}>
        {reviews.map((r) => (
          <li key={`${r.name}-${r.place}`} className="rev__card">
            <figure
              style={{
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-12)',
                blockSize: '100%',
              }}
            >
              <span className="rev__stars" role="img" aria-label={labels.rating}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} />
                ))}
              </span>
              <blockquote className="rev__q" style={{ margin: 0 }}>
                {r.q}
              </blockquote>
              <figcaption className="rev__by">
                <span className="rev__av" aria-hidden="true">
                  {initials(r.name)}
                </span>
                <span>
                  <span className="rev__name">{r.name}</span>
                  <span className="rev__place">
                    <Check /> {r.place}
                  </span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <div className="rev__dots">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            className="rev__dot"
            aria-label={fillTemplate(labels.pageTemplate, i + 1, pageCount)}
            aria-current={i === page ? 'true' : undefined}
            onClick={() => scrollToPage(i)}
          />
        ))}
      </div>

      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
    </div>
  );
}
