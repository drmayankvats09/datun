// ═══════════════════════════════════════════════════════════════
// QUALIFICATIONS — BDS/MDS specializations + registration councils
// Used in doctor.factory.ts for realistic Doctor profiles.
// Source: Dental Council of India (DCI) recognized specializations.
// ═══════════════════════════════════════════════════════════════

export const DENTAL_QUALIFICATIONS = [
  'BDS',
  'BDS, MDS',
  'BDS, MDS (Oral Surgery)',
  'BDS, MDS (Endodontics)',
  'BDS, MDS (Orthodontics)',
  'BDS, MDS (Periodontics)',
  'BDS, MDS (Prosthodontics)',
  'BDS, MDS (Pediatric Dentistry)',
  'BDS, MDS (Oral Pathology)',
  'BDS, MDS (Public Health Dentistry)',
] as const;

export type DentalQualification = (typeof DENTAL_QUALIFICATIONS)[number];

export const DENTAL_SPECIALIZATIONS = [
  'General Dentistry',
  'Oral and Maxillofacial Surgery',
  'Endodontics (Root Canal)',
  'Orthodontics (Braces & Aligners)',
  'Periodontics (Gum Treatment)',
  'Prosthodontics (Crowns, Bridges, Implants)',
  'Pediatric Dentistry',
  'Cosmetic Dentistry',
  'Oral Pathology',
  'Implantology',
] as const;

export type DentalSpecialization = (typeof DENTAL_SPECIALIZATIONS)[number];

export const REGISTRATION_COUNCILS = [
  'Delhi State Dental Council',
  'Dental Council of India',
  'Maharashtra State Dental Council',
  'Karnataka State Dental Council',
  'Tamil Nadu State Dental Council',
] as const;

/** Generate realistic DCI registration number (format: A-12345) */
export function generateRegistrationNumber(seed: number): string {
  const letter = String.fromCharCode(65 + (seed % 26)); // A-Z
  const digits = String(10000 + ((seed * 37) % 90000)).padStart(5, '0');
  return `${letter}-${digits}`;
}
