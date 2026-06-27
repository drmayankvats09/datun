'use client';
// apps/web/components/home/_icons.tsx
// ═══════════════════════════════════════════════════════════════
// Homepage icon set — Phosphor via the @repo/ui <Icon> primitive (Part 10, the
// ONE icon library; replaces the old hand-rolled inline SVGs). These are client
// components because Phosphor icons read IconContext (a hook); as 'use client'
// leaves they still server-render to HTML (GEO-safe) and then hydrate, while the
// RSC section render pass stays valid.
//
// Default UI icons -> Regular (currentColor, inherits the surrounding text token).
// Rating -> Fill. Category/feature tiles -> Duotone (two-tone via the icon's
// currentColor + Phosphor's soft secondary), tinted per-tile from the ramps.
// ═══════════════════════════════════════════════════════════════

import type { ElementType } from 'react';
import { Icon, DatunReport } from '@repo/ui';
import {
  Broom,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  ChatCircleDots,
  Check as PhCheck,
  Crown,
  Drop,
  FirstAid,
  GlobeSimple,
  LockSimple,
  MagnifyingGlass,
  MapPin,
  Scales,
  SealCheck,
  ShieldCheck as PhShieldCheck,
  Smiley,
  Snowflake,
  Sparkle,
  Star as PhStar,
  Tooth,
  Wind,
} from '@phosphor-icons/react';

type IP = { className?: string };

// ── UI / trust icons (Regular) ─────────────────────────────────
export const Shield = ({ className }: IP) => <Icon as={SealCheck} className={className} />;
export const ShieldCheck = ({ className }: IP) => <Icon as={PhShieldCheck} className={className} />;
export const Pin = ({ className }: IP) => <Icon as={MapPin} className={className} />;
export const Search = ({ className }: IP) => <Icon as={MagnifyingGlass} className={className} />;
export const Lock = ({ className }: IP) => <Icon as={LockSimple} className={className} />;
export const Chat = ({ className }: IP) => <Icon as={ChatCircleDots} className={className} />;
export const Report = ({ className }: IP) => <Icon as={DatunReport} className={className} />;
export const Scale = ({ className }: IP) => <Icon as={Scales} className={className} />;
export const Check = ({ className }: IP) => <Icon as={PhCheck} className={className} />;
export const Spark = ({ className }: IP) => <Icon as={Sparkle} className={className} />;
export const Globe = ({ className }: IP) => <Icon as={GlobeSimple} className={className} />;
export const ChevronDown = ({ className }: IP) => <Icon as={PhCaretDown} className={className} />;
export const ArrowLeft = ({ className }: IP) => <Icon as={PhCaretLeft} className={className} />;
export const ArrowRight = ({ className }: IP) => <Icon as={PhCaretRight} className={className} />;
export const Star = ({ className }: IP) => <Icon as={PhStar} weight="fill" className={className} />;

// ── Category tiles (Duotone, dental-specific metaphors) ────────
const CATEGORY: Record<string, ElementType> = {
  // problems
  toothache: Tooth,
  sensitivity: Snowflake,
  'bleeding-gums': Drop,
  cavity: Tooth,
  'bad-breath': Wind,
  'broken-tooth': Tooth,
  'wisdom-tooth': Tooth,
  emergency: FirstAid,
  // procedures
  implant: Tooth,
  aligners: Smiley,
  braces: Tooth,
  rct: Tooth,
  crown: Crown,
  whitening: Sparkle,
  scaling: Broom,
  filling: Drop,
};

/** Duotone category glyph for a problem/procedure tile. The two-tone reads from
 *  the tile's currentColor (set per-tile via the --_h tint in the section). */
export function CategoryIcon({ id }: { id: string }) {
  return <Icon as={CATEGORY[id] ?? Tooth} weight="duotone" size="lg" />;
}
