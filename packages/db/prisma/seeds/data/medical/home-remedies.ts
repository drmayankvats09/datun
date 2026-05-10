// ═══════════════════════════════════════════════════════════════
// HOME REMEDIES — Indian dental home remedies with safety tags
// Rebuilt from Wave 2 v1 with expanded coverage + safety metadata.
// Memory rule: home remedies section MANDATORY in every consultation.
// ═══════════════════════════════════════════════════════════════

import type { PregnancyStatus } from '@prisma/client';

export interface HomeRemedy {
  readonly id: string;
  readonly english: string;
  readonly hindi: string;
  readonly applicableConditions: readonly string[];
  readonly safeInPregnancy: boolean;
  readonly safeInChildren: boolean;
  readonly minAge: number;
  readonly contraindicatedWith: readonly string[];
}

export const HOME_REMEDIES: readonly HomeRemedy[] = [
  {
    id: 'rem-001',
    english: 'Warm salt water gargle: 1 tsp salt in 1 cup warm water, rinse 3-4 times daily',
    hindi: 'गुनगुने पानी में 1 चम्मच नमक मिलाकर 3-4 बार कुल्ला करें',
    applicableConditions: ['pain', 'swelling', 'gum-bleeding', 'post-extraction', 'ulcer'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 4,
    contraindicatedWith: [],
  },
  {
    id: 'rem-002',
    english: 'Clove oil: 1 drop on cotton, place on affected tooth (max 2 days)',
    hindi: 'लौंग का तेल रुई पर लगाकर दर्द वाले दांत पर रखें',
    applicableConditions: ['pain', 'sensitivity'],
    safeInPregnancy: false,
    safeInChildren: false,
    minAge: 12,
    contraindicatedWith: ['eugenol-allergy'],
  },
  {
    id: 'rem-003',
    english: 'Cold compress on cheek: 10 min on, 10 min off',
    hindi: 'गाल पर ठंडा सेक करें, 10 मिनट लगाएं फिर 10 मिनट हटाएं',
    applicableConditions: ['swelling', 'trauma', 'post-extraction'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 0,
    contraindicatedWith: [],
  },
  {
    id: 'rem-004',
    english: 'Avoid extreme hot/cold foods until consultation',
    hindi: 'डेंटिस्ट से मिलने तक बहुत गर्म या ठंडा खाने से बचें',
    applicableConditions: ['sensitivity', 'pain', 'cracked-tooth'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 0,
    contraindicatedWith: [],
  },
  {
    id: 'rem-005',
    english: 'Soft diet: khichdi, dal, dahi, pureed foods',
    hindi: 'नरम खाना ही खाएं — खिचड़ी, दाल, दही, मसला हुआ',
    applicableConditions: ['post-extraction', 'pain', 'trismus'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 0,
    contraindicatedWith: [],
  },
  {
    id: 'rem-006',
    english: 'Brush with soft-bristle brush, gentle circular motions, twice daily',
    hindi: 'मुलायम ब्रश से धीरे-धीरे गोलाकार में दिन में दो बार ब्रश करें',
    applicableConditions: ['gum-bleeding', 'sensitivity', 'routine'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 2,
    contraindicatedWith: [],
  },
  {
    id: 'rem-007',
    english: 'Stop tobacco/smoking completely until healing',
    hindi: 'जब तक ठीक न हो, सिगरेट और तंबाकू बिल्कुल न लें',
    applicableConditions: ['post-extraction', 'gum-disease', 'ulcer', 'leukoplakia'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 0,
    contraindicatedWith: [],
  },
  {
    id: 'rem-008',
    english: 'Tulsi-water rinse: boil 5-6 leaves, cool, rinse',
    hindi: '5-6 तुलसी के पत्ते पानी में उबालें, ठंडा करके कुल्ला करें',
    applicableConditions: ['ulcer', 'bad-breath'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 4,
    contraindicatedWith: [],
  },
  {
    id: 'rem-009',
    english: 'Honey + turmeric paste on ulcer (pea-sized, 2-3 times/day)',
    hindi: 'अल्सर पर हल्दी + शहद की पेस्ट दिन में 2-3 बार',
    applicableConditions: ['ulcer', 'gum-inflammation'],
    safeInPregnancy: true,
    safeInChildren: false,
    minAge: 2,
    contraindicatedWith: ['turmeric-allergy', 'diabetes-uncontrolled'],
  },
  {
    id: 'rem-010',
    english: 'Garlic clove pressed against affected tooth (max 5 min)',
    hindi: 'लहसुन की कली दांत पर रखें (5 मिनट तक)',
    applicableConditions: ['pain'],
    safeInPregnancy: false,
    safeInChildren: false,
    minAge: 18,
    contraindicatedWith: ['blood-thinners', 'mucosal-irritation'],
  },
  {
    id: 'rem-011',
    english: 'Coconut oil pulling: 1 tbsp swish 10-15 min before brushing',
    hindi: 'नारियल तेल से 10-15 min oil pulling',
    applicableConditions: ['gum-bleeding', 'bad-breath', 'plaque'],
    safeInPregnancy: true,
    safeInChildren: false,
    minAge: 12,
    contraindicatedWith: [],
  },
  {
    id: 'rem-012',
    english: 'Hydrogen peroxide rinse 1.5%: dilute 1:1 with water, rinse 30s',
    hindi: 'Hydrogen peroxide 1.5% (पानी से मिलाकर) कुल्ला 30 sec',
    applicableConditions: ['gum-inflammation', 'mild-infection'],
    safeInPregnancy: true,
    safeInChildren: false,
    minAge: 12,
    contraindicatedWith: [],
  },
  {
    id: 'rem-013',
    english: 'Stay hydrated: 8-10 glasses water/day',
    hindi: 'दिन में 8-10 गिलास पानी पिएं',
    applicableConditions: ['xerostomia', 'post-extraction', 'oral-thrush'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 0,
    contraindicatedWith: ['fluid-restriction'],
  },
  {
    id: 'rem-014',
    english: 'Avoid spicy/citrus foods if mucositis or ulcer present',
    hindi: 'मसालेदार/खट्टा खाने से बचें (अगर chhale हैं)',
    applicableConditions: ['ulcer', 'mucositis', 'erosion'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 0,
    contraindicatedWith: [],
  },
  {
    id: 'rem-015',
    english: 'Use straw for cold drinks if sensitivity (avoid contact with teeth)',
    hindi: 'ठंडे drink straw से लें (sensitivity मे)',
    applicableConditions: ['sensitivity', 'erosion'],
    safeInPregnancy: true,
    safeInChildren: true,
    minAge: 4,
    contraindicatedWith: [],
  },
] as const;

export function getRemediesForCondition(conditionTag: string): readonly HomeRemedy[] {
  return HOME_REMEDIES.filter((r) => r.applicableConditions.includes(conditionTag));
}

export function getSafeRemediesFor(
  conditionTag: string,
  profile: { ageYears: number; pregnancyStatus: PregnancyStatus; allergies: readonly string[] },
): readonly HomeRemedy[] {
  return HOME_REMEDIES.filter((r) => {
    if (!r.applicableConditions.includes(conditionTag)) return false;
    if (profile.ageYears < r.minAge) return false;
    if (profile.pregnancyStatus === 'PREGNANT' && !r.safeInPregnancy) return false;
    if (profile.ageYears < 18 && !r.safeInChildren) return false;
    const lowerAllergies = profile.allergies.map((a) => a.toLowerCase());
    if (r.contraindicatedWith.some((c) => lowerAllergies.includes(c.toLowerCase()))) return false;
    return true;
  });
}
