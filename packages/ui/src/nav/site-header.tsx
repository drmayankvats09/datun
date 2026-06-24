'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface NavLink {
  label: string;
  href: string;
  current?: boolean;
}
export interface SiteHeaderProps {
  logo: React.ReactNode;
  links: NavLink[]; // 5–7 marketing links
  ctaLabel?: string; // "Ask Datun"
  ctaHref?: string;
  loginHref?: string;
  /** "For Clinics" → OUTBOUND cross-link to the separate clinic app. */
  clinicsHref?: string;
  className?: string;
}

/**
 * Datun website-face header — Part 15.8. Marketing nav, NO app tab-bar. Sticky;
 * elevates (shadow + restrained backdrop-blur) once scrolled. Mobile = logo +
 * hamburger → drawer. "For Clinics" is an outbound link to clinics.datunai.com.
 * Semantic <header>/<nav> landmarks + skip-link. Token-only.
 */
export function SiteHeader({
  logo,
  links,
  ctaLabel = 'Ask Datun',
  ctaHref = '/consult',
  loginHref = '/login',
  clinicsHref = 'https://clinics.datunai.com',
  className,
}: SiteHeaderProps) {
  const [stuck, setStuck] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    if (drawer) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <header className={cn('dtn-siteheader', stuck && 'dtn-siteheader--stuck', className)}>
      <a href="#main" className="dtn-skip">
        Skip to content
      </a>
      <div className="dtn-siteheader__in">
        <a href="/" aria-label="Datun home">
          {logo}
        </a>
        <nav className="dtn-sitenav" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="dtn-navlink"
              aria-current={l.current ? 'page' : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="dtn-header__right">
          <a href={clinicsHref} className="dtn-header__clinics" rel="noopener">
            For clinics
          </a>
          <a href={loginHref} className="dtn-navlink dtn-cta-inline">
            Log in
          </a>
          <a href={ctaHref} className="dtn-btn dtn-btn--primary dtn-btn--md dtn-cta-inline">
            {ctaLabel}
          </a>
          <button
            className="dtn-hamburger"
            aria-label="Open menu"
            aria-expanded={drawer}
            aria-controls="dtn-nav-drawer"
            onClick={() => setDrawer(true)}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {drawer && (
        <>
          <div className="dtn-drawer__scrim" onClick={() => setDrawer(false)} />
          <nav id="dtn-nav-drawer" className="dtn-drawer" aria-label="Mobile">
            <button
              className="dtn-hamburger"
              style={{ display: 'grid', alignSelf: 'flex-end' }}
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="dtn-drawer__link"
                aria-current={l.current ? 'page' : undefined}
              >
                {l.label}
              </a>
            ))}
            <a href={clinicsHref} className="dtn-drawer__link" rel="noopener">
              For clinics
            </a>
            <a href={loginHref} className="dtn-drawer__link">
              Log in
            </a>
            <a
              href={ctaHref}
              className="dtn-btn dtn-btn--primary dtn-btn--lg dtn-btn--block"
              style={{ marginBlockStart: 'var(--space-12)' }}
            >
              {ctaLabel}
            </a>
          </nav>
        </>
      )}
    </header>
  );
}
