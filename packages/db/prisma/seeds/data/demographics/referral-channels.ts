// ═══════════════════════════════════════════════════════════════
// REFERRAL CHANNELS — How patients discover Datun
// Used in patient seed for realistic acquisition source distribution.
// Pattern: Practo/Zocdoc patient acquisition tracking.
// ═══════════════════════════════════════════════════════════════

export type ReferralCategory =
  | 'organic-search'
  | 'paid-marketing'
  | 'social-media'
  | 'word-of-mouth'
  | 'medical-referral'
  | 'corporate-partnership'
  | 'walk-in';

export interface ReferralChannel {
  readonly id: string;
  readonly label: string;
  readonly category: ReferralCategory;
  readonly weight: number;
  readonly typicalUserType: string;
}

export const REFERRAL_CHANNELS: readonly ReferralChannel[] = [
  // Organic
  {
    id: 'google-search',
    label: 'Google search',
    category: 'organic-search',
    weight: 25,
    typicalUserType: 'urban tier-1/2, English-speaking',
  },
  {
    id: 'youtube-video',
    label: 'YouTube health video',
    category: 'organic-search',
    weight: 5,
    typicalUserType: 'all tiers',
  },
  // Paid
  {
    id: 'instagram-ad',
    label: 'Instagram paid ad',
    category: 'paid-marketing',
    weight: 8,
    typicalUserType: 'young adult urban',
  },
  {
    id: 'facebook-ad',
    label: 'Facebook paid ad',
    category: 'paid-marketing',
    weight: 4,
    typicalUserType: 'middle-age urban',
  },
  {
    id: 'google-ad',
    label: 'Google paid ad',
    category: 'paid-marketing',
    weight: 6,
    typicalUserType: 'urgent care seekers',
  },
  // Social
  {
    id: 'whatsapp-referral',
    label: 'WhatsApp from friend/family',
    category: 'word-of-mouth',
    weight: 12,
    typicalUserType: 'all tiers',
  },
  {
    id: 'family-referral',
    label: 'Family member referred',
    category: 'word-of-mouth',
    weight: 8,
    typicalUserType: 'all tiers',
  },
  {
    id: 'friend-referral',
    label: 'Friend referred',
    category: 'word-of-mouth',
    weight: 6,
    typicalUserType: 'all tiers',
  },
  {
    id: 'instagram-organic',
    label: 'Instagram organic post',
    category: 'social-media',
    weight: 3,
    typicalUserType: 'young adult',
  },
  // Medical
  {
    id: 'physician-referral',
    label: 'Physician/GP referral',
    category: 'medical-referral',
    weight: 5,
    typicalUserType: 'middle-age, geriatric',
  },
  {
    id: 'gynecologist-referral',
    label: 'Gynecologist referral',
    category: 'medical-referral',
    weight: 3,
    typicalUserType: 'pregnancy, pre-IVF',
  },
  {
    id: 'cardiologist-referral',
    label: 'Cardiologist referral',
    category: 'medical-referral',
    weight: 2,
    typicalUserType: 'cardiac patients',
  },
  {
    id: 'endocrinologist-referral',
    label: 'Endocrinologist referral',
    category: 'medical-referral',
    weight: 2,
    typicalUserType: 'diabetic patients',
  },
  {
    id: 'oncologist-referral',
    label: 'Oncologist referral',
    category: 'medical-referral',
    weight: 1,
    typicalUserType: 'cancer patients',
  },
  {
    id: 'pediatrician-referral',
    label: 'Pediatrician referral',
    category: 'medical-referral',
    weight: 3,
    typicalUserType: 'children',
  },
  {
    id: 'second-opinion-referral',
    label: 'Second opinion seeker',
    category: 'medical-referral',
    weight: 2,
    typicalUserType: 'failed treatment',
  },
  // Corporate
  {
    id: 'corporate-tie-up',
    label: 'Employer tie-up',
    category: 'corporate-partnership',
    weight: 3,
    typicalUserType: 'IT/corporate employees',
  },
  {
    id: 'corporate-wellness',
    label: 'Corporate wellness program',
    category: 'corporate-partnership',
    weight: 2,
    typicalUserType: 'IT employees',
  },
  // Walk-in
  {
    id: 'walk-in',
    label: 'Walk-in (no prior referral)',
    category: 'walk-in',
    weight: 4,
    typicalUserType: 'all tiers, urgent',
  },
  {
    id: 'health-camp',
    label: 'NGO/health camp',
    category: 'walk-in',
    weight: 2,
    typicalUserType: 'BPL, rural',
  },
  {
    id: 'emergency-walk-in',
    label: 'Emergency walk-in',
    category: 'walk-in',
    weight: 2,
    typicalUserType: 'all, trauma',
  },
] as const;

export const TOTAL_REFERRAL_WEIGHT = REFERRAL_CHANNELS.reduce((s, r) => s + r.weight, 0);

export function pickReferralChannel(seed: number): ReferralChannel {
  const target = (seed % 1_000_000) * (TOTAL_REFERRAL_WEIGHT / 1_000_000);
  let cumulative = 0;
  for (const ch of REFERRAL_CHANNELS) {
    cumulative += ch.weight;
    if (cumulative >= target) return ch;
  }
  return REFERRAL_CHANNELS[REFERRAL_CHANNELS.length - 1]!;
}
