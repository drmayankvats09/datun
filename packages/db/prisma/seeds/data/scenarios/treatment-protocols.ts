// ═══════════════════════════════════════════════════════════════
// TREATMENT PROTOCOLS — 8 dental specialties × scenario-specific plans
// Source: ADA Treatment Pathways + AIIMS clinical protocols
// Replaces v1's flat urgency-templates with specialty-aware protocols.
// ═══════════════════════════════════════════════════════════════

import type { UrgencyLevel } from '@prisma/client';

export type DentalSpecialty =
  | 'endodontic'
  | 'restorative'
  | 'surgical'
  | 'orthodontic'
  | 'periodontal'
  | 'prosthodontic'
  | 'pediatric'
  | 'cosmetic';

export interface TreatmentProtocol {
  readonly id: string;
  readonly specialty: DentalSpecialty;
  readonly icd10Codes: readonly string[];
  readonly urgency: UrgencyLevel;
  readonly treatmentPlanEnglish: string;
  readonly treatmentPlanHindi: string;
  readonly investigationsNeeded: readonly string[];
  readonly followUpDays: number;
  readonly redFlags: readonly string[];
  readonly typicalCostInr: { readonly min: number; readonly max: number };
  readonly typicalSessions: number;
}

export const TREATMENT_PROTOCOLS: readonly TreatmentProtocol[] = [
  // ── ENDODONTIC ──
  {
    id: 'tp-endo-001',
    specialty: 'endodontic',
    icd10Codes: ['K04.0', 'K04.01'],
    urgency: 'MODERATE',
    treatmentPlanEnglish:
      'Indirect pulp cap with calcium hydroxide, monitor 6 weeks. If pain persists, proceed to RCT.',
    treatmentPlanHindi: 'पल्प कैप ट्रीटमेंट, 6 हफ्ते देखेंगे। दर्द रहा तो रूट कैनाल करेंगे।',
    investigationsNeeded: ['IOPA X-ray', 'pulp-vitality-test'],
    followUpDays: 42,
    redFlags: ['Pain becomes throbbing', 'Swelling appears'],
    typicalCostInr: { min: 1000, max: 3000 },
    typicalSessions: 1,
  },
  {
    id: 'tp-endo-002',
    specialty: 'endodontic',
    icd10Codes: ['K04.02', 'K04.1'],
    urgency: 'URGENT',
    treatmentPlanEnglish:
      'Single-visit RCT with rotary instrumentation, bioceramic obturation, post-endodontic crown',
    treatmentPlanHindi: 'एक सिटिंग में रूट कैनाल, फिर 1 हफ्ते बाद कैप',
    investigationsNeeded: ['IOPA X-ray', 'electric-pulp-test'],
    followUpDays: 7,
    redFlags: ['Severe post-op pain >48hr', 'Swelling'],
    typicalCostInr: { min: 4000, max: 12000 },
    typicalSessions: 2,
  },
  {
    id: 'tp-endo-003',
    specialty: 'endodontic',
    icd10Codes: ['K04.7'],
    urgency: 'EMERGENCY',
    treatmentPlanEnglish:
      'Drainage via access opening, antibiotic therapy (Amoxicillin 500 mg TDS or Clindamycin if penicillin-allergic), follow with RCT in 48-72 hr',
    treatmentPlanHindi: 'फोड़े से मवाद निकालेंगे, antibiotic देंगे, फिर रूट कैनाल',
    investigationsNeeded: ['IOPA X-ray', 'CBC if febrile'],
    followUpDays: 2,
    redFlags: ['Fever >101°F', 'Difficulty swallowing', 'Spreading swelling'],
    typicalCostInr: { min: 5000, max: 15000 },
    typicalSessions: 3,
  },

  // ── RESTORATIVE ──
  {
    id: 'tp-rest-001',
    specialty: 'restorative',
    icd10Codes: ['K02.51', 'K02.61'],
    urgency: 'ROUTINE',
    treatmentPlanEnglish:
      'Composite filling after caries excavation, bonding agent, layered placement, light cure',
    treatmentPlanHindi: 'कीड़ा साफ करके सफेद फिलिंग लगाएंगे',
    investigationsNeeded: ['IOPA X-ray'],
    followUpDays: 30,
    redFlags: ['Pain on biting after filling', 'Sensitivity persists >2 weeks'],
    typicalCostInr: { min: 800, max: 2500 },
    typicalSessions: 1,
  },
  {
    id: 'tp-rest-002',
    specialty: 'restorative',
    icd10Codes: ['K02.52', 'K02.62'],
    urgency: 'MODERATE',
    treatmentPlanEnglish:
      'Indirect composite or ceramic onlay/inlay if defect exceeds 50% of tooth structure',
    treatmentPlanHindi: 'अगर बहुत बड़ा कैविटी है तो inlay/onlay',
    investigationsNeeded: ['IOPA X-ray'],
    followUpDays: 30,
    redFlags: ['Pain', 'Marginal staining'],
    typicalCostInr: { min: 4000, max: 10000 },
    typicalSessions: 2,
  },

  // ── SURGICAL ──
  {
    id: 'tp-surg-001',
    specialty: 'surgical',
    icd10Codes: ['K01.1', 'K05.21'],
    urgency: 'URGENT',
    treatmentPlanEnglish:
      'Surgical extraction of impacted third molar under local anesthesia, suturing, post-op antibiotics',
    treatmentPlanHindi: 'अक्ल दाढ़ surgery से निकालेंगे, टांके लगेंगे',
    investigationsNeeded: ['OPG', 'CBCT if close to nerve'],
    followUpDays: 7,
    redFlags: ['Numbness in lip/tongue', 'Heavy bleeding', 'Dry socket'],
    typicalCostInr: { min: 3000, max: 8000 },
    typicalSessions: 2,
  },
  {
    id: 'tp-surg-002',
    specialty: 'surgical',
    icd10Codes: ['K08.3'],
    urgency: 'URGENT',
    treatmentPlanEnglish: 'Atraumatic root retrieval, socket curettage, hemostasis, suturing',
    treatmentPlanHindi: 'जड़ निकालेंगे atraumatic तरीके से',
    investigationsNeeded: ['IOPA X-ray'],
    followUpDays: 7,
    redFlags: ['Persistent bleeding', 'Dry socket pain day 3-5'],
    typicalCostInr: { min: 1500, max: 4000 },
    typicalSessions: 1,
  },

  // ── ORTHODONTIC ──
  {
    id: 'tp-ortho-001',
    specialty: 'orthodontic',
    icd10Codes: ['K07.3', 'K07.4'],
    urgency: 'ROUTINE',
    treatmentPlanEnglish:
      'Comprehensive orthodontic assessment, cephalometric analysis, treatment plan with metal/ceramic braces or clear aligners',
    treatmentPlanHindi: 'पूरा ortho assessment, फिर braces या aligners का plan',
    investigationsNeeded: ['OPG', 'lateral-cephalogram', 'study-models'],
    followUpDays: 28,
    redFlags: ['Bracket dislodgement', 'Severe discomfort'],
    typicalCostInr: { min: 30000, max: 250000 },
    typicalSessions: 24,
  },

  // ── PERIODONTAL ──
  {
    id: 'tp-perio-001',
    specialty: 'periodontal',
    icd10Codes: ['K05.10', 'K03.6'],
    urgency: 'MODERATE',
    treatmentPlanEnglish:
      'Scaling and polishing (prophylaxis), oral hygiene instructions, chlorhexidine rinse 14 days',
    treatmentPlanHindi: 'दांत की सफाई (scaling), oral hygiene सिखाएंगे, chlorhexidine माउथवॉश',
    investigationsNeeded: [],
    followUpDays: 90,
    redFlags: ['Bleeding persists', 'Recession progresses'],
    typicalCostInr: { min: 1500, max: 5000 },
    typicalSessions: 1,
  },
  {
    id: 'tp-perio-002',
    specialty: 'periodontal',
    icd10Codes: ['K05.3'],
    urgency: 'MODERATE',
    treatmentPlanEnglish:
      'Full-mouth deep scaling and root planing (SRP) in 2-4 sessions, antibiotic adjunct (Doxycycline 100 mg OD x 21 days), reassess at 8 weeks',
    treatmentPlanHindi: 'Deep scaling 2-4 sessions में, साथ में Doxycycline 21 दिन',
    investigationsNeeded: ['OPG', 'periodontal-charting'],
    followUpDays: 56,
    redFlags: ['No improvement in pocket depth', 'Tooth mobility increases'],
    typicalCostInr: { min: 5000, max: 25000 },
    typicalSessions: 4,
  },

  // ── PROSTHODONTIC ──
  {
    id: 'tp-pros-001',
    specialty: 'prosthodontic',
    icd10Codes: ['K08.10'],
    urgency: 'ROUTINE',
    treatmentPlanEnglish:
      'Complete denture fabrication (acrylic or flexible), 5-6 appointments over 3 weeks',
    treatmentPlanHindi: 'Complete denture बनाएंगे, 3 हफ्ते में 5-6 visits',
    investigationsNeeded: ['OPG'],
    followUpDays: 21,
    redFlags: ['Sore spots persist >2 weeks', 'Difficulty eating'],
    typicalCostInr: { min: 8000, max: 40000 },
    typicalSessions: 6,
  },
  {
    id: 'tp-pros-002',
    specialty: 'prosthodontic',
    icd10Codes: ['K08.10'],
    urgency: 'ROUTINE',
    treatmentPlanEnglish:
      'Single tooth implant: surgical placement → 3-6 months osseointegration → abutment + crown',
    treatmentPlanHindi: 'Implant: surgery → 3-6 महीने → फिर crown',
    investigationsNeeded: ['CBCT', 'OPG', 'bone-density-test'],
    followUpDays: 90,
    redFlags: ['Pain at implant site', 'Mobility', 'Peri-implantitis signs'],
    typicalCostInr: { min: 25000, max: 80000 },
    typicalSessions: 5,
  },

  // ── PEDIATRIC ──
  {
    id: 'tp-ped-001',
    specialty: 'pediatric',
    icd10Codes: ['K02.51', 'K02.52'],
    urgency: 'MODERATE',
    treatmentPlanEnglish:
      'Glass ionomer or composite restoration, behavior management with tell-show-do, fluoride varnish, parental counseling',
    treatmentPlanHindi: 'GIC या composite filling, बच्चे को friendly approach से',
    investigationsNeeded: ['IOPA if needed'],
    followUpDays: 90,
    redFlags: ['Pain', 'Filling loss'],
    typicalCostInr: { min: 800, max: 2500 },
    typicalSessions: 1,
  },
  {
    id: 'tp-ped-002',
    specialty: 'pediatric',
    icd10Codes: ['S03.2'],
    urgency: 'EMERGENCY',
    treatmentPlanEnglish:
      'Avulsed tooth — immediate replantation if <60 min, splinting 7-14 days, RCT if mature root, antibiotic prophylaxis, tetanus check',
    treatmentPlanHindi: 'टूटा दांत वापस लगाएंगे (अगर 1 घंटे के अंदर), splint, antibiotic',
    investigationsNeeded: ['IOPA X-ray', 'soft-tissue-X-ray'],
    followUpDays: 7,
    redFlags: ['Mobility increases', 'Discoloration', 'Periapical changes'],
    typicalCostInr: { min: 3000, max: 10000 },
    typicalSessions: 4,
  },

  // ── COSMETIC ──
  {
    id: 'tp-cos-001',
    specialty: 'cosmetic',
    icd10Codes: ['K03.6'],
    urgency: 'ROUTINE',
    treatmentPlanEnglish:
      'In-office bleaching (35% hydrogen peroxide) + take-home trays for maintenance',
    treatmentPlanHindi: 'In-office whitening + घर के लिए trays',
    investigationsNeeded: [],
    followUpDays: 14,
    redFlags: ['Severe sensitivity', 'Gum irritation'],
    typicalCostInr: { min: 4000, max: 15000 },
    typicalSessions: 2,
  },
  {
    id: 'tp-cos-002',
    specialty: 'cosmetic',
    icd10Codes: ['K00.2', 'K03.6'],
    urgency: 'ROUTINE',
    treatmentPlanEnglish: 'Porcelain veneers — 6-8 anterior teeth, 3 appointments over 2 weeks',
    treatmentPlanHindi: 'Veneers — 6-8 आगे के दांतों पर, 2 हफ्ते में',
    investigationsNeeded: [],
    followUpDays: 90,
    redFlags: ['Bond failure', 'Fracture'],
    typicalCostInr: { min: 8000, max: 25000 },
    typicalSessions: 3,
  }, // per tooth
] as const;

export function getProtocolsByIcd10(icd10: string): readonly TreatmentProtocol[] {
  return TREATMENT_PROTOCOLS.filter((p) => p.icd10Codes.includes(icd10));
}

export function getProtocolsBySpecialty(specialty: DentalSpecialty): readonly TreatmentProtocol[] {
  return TREATMENT_PROTOCOLS.filter((p) => p.specialty === specialty);
}
