/**
 * Datun concept → Phosphor icon map (Part 10.11). ONE concept = ONE icon across
 * the whole product. Import the named Phosphor component; pass via <Icon as={…}>.
 * Universal, cross-culturally recognizable metaphors; "if it needs explanation,
 * it's the wrong icon." Custom Datun glyphs (10.13) live in ./datun-glyphs.
 *
 *   import * as Ph from "@phosphor-icons/react";
 *   import { ICON } from "@repo/ui/icon/concept-map";
 *   <Icon as={Ph[ICON.search]} label="Search" />
 */
export const ICON = {
  // navigation / actions
  search: 'MagnifyingGlass',
  close: 'X',
  back: 'ArrowLeft',
  forward: 'ArrowRight',
  menu: 'List',
  more: 'DotsThree',
  send: 'PaperPlaneTilt',
  download: 'DownloadSimple',
  share: 'ShareNetwork',
  edit: 'PencilSimple',
  delete: 'Trash',
  filter: 'SlidersHorizontal',
  settings: 'GearSix',
  add: 'Plus',
  check: 'Check',
  // app-face tab-bar (4 destinations — 15.8)
  home: 'House',
  reports: 'FileText',
  findDentist: 'MapPin',
  profile: 'UserCircle',
  // health / trust
  call: 'Phone',
  calendar: 'CalendarBlank',
  clock: 'Clock',
  location: 'NavigationArrow',
  language: 'Translate',
  photo: 'Camera',
  voice: 'Microphone',
  notification: 'Bell',
  star: 'Star',
  heart: 'Heart',
  shield: 'ShieldCheck',
  info: 'Info',
  // status (paired with label/shape — never colour-alone)
  success: 'CheckCircle',
  warning: 'Warning',
  error: 'WarningCircle',
  // brand-owned concepts → custom Datun glyphs (10.13, see datun-glyphs.tsx)
  tooth: 'DatunTooth',
  triageGood: 'DatunTriageGood',
  triageAttention: 'DatunTriageAttention',
  triageUrgent: 'DatunTriageUrgent',
  reportVerified: 'DatunReport',
  clinicVerified: 'DatunVerified',
} as const;

export type ConceptName = keyof typeof ICON;
