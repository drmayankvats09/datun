// apps/web/components/home/data.ts
// ═══════════════════════════════════════════════════════════════
// PATIENT HOMEPAGE — content data (Task #55).
//
// Plain-language, calm, NON-alarmist dental copy. Every "what it is" line is
// grounded in primary sources (Cleveland Clinic, ADA MouthHealthy, AAE, AAO,
// NHS, NIDCR, CDC) and every "how Datun guides you" line keeps Datun's honest
// scope: Datun gives a dentist-backed read and routes to a verified clinic; it
// does NOT perform procedures, never overpromises, and always keeps the
// "see a dentist if it worsens" off-ramp.
//
// Brand law (Part 12): never the word "AI"; "free" only per Part 12.5; no
// fabricated counts/ratings; sentence case. This is local content data (the
// existing taxonomy convention); section chrome lives in common.home.* i18n.
// ═══════════════════════════════════════════════════════════════

/** A common dental problem shown as an answer-first tile. */
export interface ProblemItem {
  /** Stable id (used for React keys, icon lookup, future routing). */
  id: string;
  /** English label. */
  label: string;
  /** Devanagari label, rendered only on the Hindi locale (perf: keeps the
   *  Indic webfont off the English page). */
  hi: string;
  /** One short, calm line: what it usually is + how Datun guides you. */
  blurb: string;
}

/** A common dental procedure shown as an answer-first tile. */
export interface ProcedureItem {
  id: string;
  label: string;
  blurb: string;
}

/** A real patient question for the FAQ accordion (also feeds FAQPage schema). */
export interface FaqItem {
  q: string;
  a: string;
}

/** A genuine founder-provided v1 review (real, consented, all 5 stars). */
export interface ReviewItem {
  name: string;
  place: string;
  rating: 5;
  q: string;
}

/** A row in the honest comparison (generic industry contrast, non-disparaging). */
export interface CompareRow {
  k: string;
  no: string;
  yes: string;
}

/** A city served, shown as a "near you" location card. */
export interface CityItem {
  city: string;
  region: string;
}

// ── Common dental problems (answer-first) ──────────────────────
export const PROBLEMS: readonly ProblemItem[] = [
  {
    id: 'toothache',
    label: 'Toothache',
    hi: 'दाँत दर्द',
    blurb:
      'Usually decay reaching the sensitive inside, sometimes a crack or gum issue. Datun reads what is likely going on and points you to a verified clinic if you need one.',
  },
  {
    id: 'sensitivity',
    label: 'Sensitivity',
    hi: 'सेंसिटिविटी',
    blurb:
      'A short, sharp twinge from cold or sweet that fades fast, often the layer under the enamel being a little exposed. Datun explains what helps and whether a dentist should take a look.',
  },
  {
    id: 'bleeding-gums',
    label: 'Bleeding gums',
    hi: 'मसूड़ों से खून',
    blurb:
      'Usually early gum irritation from plaque at the gumline, and reassuringly it is reversible with the right care. Datun guides better cleaning and helps you book a professional clean.',
  },
  {
    id: 'cavity',
    label: 'Cavity',
    hi: 'कैविटी',
    blurb:
      'A small hole in the tooth made by acid from everyday bacteria and sugar. Datun helps tell early signs from something that needs a filling, and books a verified dentist when one is needed.',
  },
  {
    id: 'bad-breath',
    label: 'Bad breath',
    hi: 'मुँह की बदबू',
    blurb:
      'Most often bacteria and debris in the mouth, frequently on the tongue, and very often improvable. Datun suggests simple, proven steps and flags when a check-up is worth it.',
  },
  {
    id: 'broken-tooth',
    label: 'Broken tooth',
    hi: 'टूटा दाँत',
    blurb:
      'A chip or break from a knock, a hard bite, or a weakened tooth. Datun gives the right first steps, tells you how urgent it is, and books a verified dentist.',
  },
  {
    id: 'wisdom-tooth',
    label: 'Wisdom tooth',
    hi: 'अक्ल दाड़',
    blurb:
      'Pain often means there is not enough room and the gum has become sore. Because not every wisdom tooth needs removing, Datun routes you to a verified clinic for a proper look.',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    hi: 'आपात',
    blurb:
      'Severe pain, facial swelling, bleeding that will not stop, or a knocked-out tooth. Datun helps you act fast, find the nearest verified clinic, and always says when to seek urgent in-person care.',
  },
] as const;

// ── Common dental procedures (Datun explains + routes; never performs) ──
export const PROCEDURES: readonly ProcedureItem[] = [
  {
    id: 'implant',
    label: 'Dental implant',
    blurb:
      'A small titanium post placed in the jaw to act as a new tooth root, topped with a crown. Datun explains the honest bits, it is minor surgery and healing takes a few months, then routes you to a verified clinic to see if it is right for you.',
  },
  {
    id: 'aligners',
    label: 'Clear aligners',
    blurb:
      'Custom, near-invisible removable trays that gently straighten teeth over time. Datun explains how they compare with braces and routes you to a verified orthodontist, since they are not right for every case.',
  },
  {
    id: 'braces',
    label: 'Braces',
    blurb:
      'Fixed brackets and wires that straighten teeth and correct the bite, ideal for more complex cases. Datun helps you weigh braces against aligners and books a verified orthodontist.',
  },
  {
    id: 'rct',
    label: 'Root canal (RCT)',
    blurb:
      'A treatment that saves an infected tooth by cleaning out the inner pulp, then sealing and usually crowning it. With modern numbing it is about as comfortable as a filling. Datun explains it calmly and routes you to a verified clinic.',
  },
  {
    id: 'crown',
    label: 'Crown or cap',
    blurb:
      'A tooth-shaped cap that covers and strengthens a weak, broken, or root-canal-treated tooth. Datun helps you understand when it is the right fix and connects you to a verified clinic.',
  },
  {
    id: 'whitening',
    label: 'Whitening',
    blurb:
      'A cosmetic treatment that lightens stains to brighten tooth colour; it does not change the health or shape of a tooth. Datun sets honest expectations and routes you to a verified clinic for dentist-supervised whitening.',
  },
  {
    id: 'scaling',
    label: 'Scaling or cleaning',
    blurb:
      'A professional clean that removes plaque and hardened tartar, which can only be removed by a dentist or hygienist. Datun helps you book a verified clinic and flags when a deeper clean is needed.',
  },
  {
    id: 'filling',
    label: 'Filling',
    blurb:
      'The dentist removes the decayed part of a tooth and fills the hole to seal it, stopping the damage. Datun helps you tell when a cavity needs filling and routes you to a verified clinic to get it done.',
  },
] as const;

// ── FAQ (real patient questions, answer-first, honest) ─────────
// Doubles as the FAQPage JSON-LD source (same array, no markup/visible drift).
export const FAQS: readonly FaqItem[] = [
  {
    q: 'Is Datun a replacement for seeing a dentist?',
    a: 'No. Datun gives you a dentist-backed first opinion and a clear next step, then helps you reach a verified clinic. A remote check cannot fully replace an in-person exam, and Datun tells you when to see someone.',
  },
  {
    q: 'Does it cost anything to ask?',
    a: 'No cost to ask. You get an assessment and a report you keep at no cost; you only pay a clinic if you choose to book treatment. Datun is funded by partner clinics, and your data is never sold.',
  },
  {
    q: 'Can I use Datun in my own language?',
    a: 'Yes, in your own language. Describe your problem and read your assessment in the language you speak, whichever it is.',
  },
  {
    q: 'Who is behind the answers?',
    a: 'Licensed dentists. Every assessment follows protocols written and reviewed by practising dentists, so your report is dentist-backed.',
  },
  {
    q: 'How are clinics verified?',
    a: "We primary-source-check a clinic's credentials before it can join Datun, so you are only ever routed to verified clinics.",
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your details are encrypted, consent-logged, and deletable any time, fully DPDP 2023 compliant. Your data is never sold.',
  },
  {
    q: 'Can I use Datun at night or on weekends?',
    a: 'Yes, any hour. You can describe a problem and get a structured next step at 1 AM or on a Sunday, with no app download and no waiting.',
  },
  {
    q: 'What do I actually get?',
    a: 'A dentist-backed assessment of what is likely going on, simple home-care steps where relevant, a report you keep, and, if needed, a verified clinic booked nearby.',
  },
  {
    q: 'Will Datun push me toward treatment I do not need?',
    a: 'No. Where a problem is minor or a tooth can still be saved, Datun says so. No pressure and no dark patterns, just honest guidance about scope.',
  },
  {
    q: 'Which dental problems can Datun help with?',
    a: 'Anything from a sudden toothache or sensitivity to bleeding gums, a broken tooth, or planning a procedure like a filling, crown, or aligners. If it is a tooth worry, start with Datun.',
  },
] as const;

// ── Honest comparison (generic industry contrast, ASCI-safe, non-disparaging) ──
export const COMPARE_ROWS: readonly CompareRow[] = [
  { k: "Who's behind it", no: 'A form, or no one', yes: 'Built by licensed dentists' },
  { k: 'What you walk away with', no: 'A list of clinics', yes: 'A report, yours to keep' },
  { k: 'How long it takes', no: 'Calls, callbacks, waiting', yes: 'About two minutes' },
  { k: 'Verified clinics', no: 'Anyone who pays to list', yes: 'Every one, checked by us' },
  {
    k: 'In your language',
    no: 'Usually English only',
    yes: 'Hindi, English, and more Indian languages',
  },
];

// ── Cities served (no fabricated counts; honest "verified clinics" label) ──
export const CITIES: readonly CityItem[] = [
  { city: 'Mumbai', region: 'Maharashtra' },
  { city: 'Delhi', region: 'NCR' },
  { city: 'Bengaluru', region: 'Karnataka' },
  { city: 'Hyderabad', region: 'Telangana' },
  { city: 'Pune', region: 'Maharashtra' },
  { city: 'Chennai', region: 'Tamil Nadu' },
  { city: 'Kolkata', region: 'West Bengal' },
  { city: 'Ahmedabad', region: 'Gujarat' },
  { city: 'Jaipur', region: 'Rajasthan' },
  { city: 'Lucknow', region: 'Uttar Pradesh' },
];

// ── Patient reviews (REAL founder-provided v1 data, all 5 stars, consented) ──
// Verbatim authentic Hinglish/English voice. Do NOT rewrite into formal English
// and do NOT add fabricated reviewers or counts (brand honesty law).
export const REVIEWS: readonly ReviewItem[] = [
  {
    name: 'Aarav S.',
    place: 'Delhi',
    rating: 5,
    q: 'The chat felt very simple. I could explain my tooth pain in normal Hinglish without filling long forms.',
  },
  {
    name: 'Priya V.',
    place: 'Noida',
    rating: 5,
    q: "Raat ko pain start hua tha and I didn't know whether it was serious. Datun helped me understand what to do next.",
  },
  {
    name: 'Karthik R.',
    place: 'Bengaluru',
    rating: 5,
    q: 'I liked that it asked about allergy and medicines first. That made it feel more responsible than a normal chatbot.',
  },
  {
    name: 'Rohit G.',
    place: 'Ghaziabad',
    rating: 5,
    q: 'Maine photo upload ki aur questions ka flow kaafi easy tha. Clear tha ki dentist ko kab dikhana hai.',
  },
  {
    name: 'Sneha P.',
    place: 'Mumbai',
    rating: 5,
    q: 'For someone who gets anxious about dental problems, the tone was calm and not scary.',
  },
  {
    name: 'Ananya S.',
    place: 'Lucknow',
    rating: 5,
    q: 'Hindi mein baat kar paana was the best part. My parents would actually be comfortable using this.',
  },
  {
    name: 'Vikram R.',
    place: 'Jaipur',
    rating: 5,
    q: 'It did not pretend to replace a dentist. It helped me decide whether I needed urgent care.',
  },
  {
    name: 'Neha M.',
    place: 'Gurgaon',
    rating: 5,
    q: 'No app download, no waiting. Bas message karo and get a structured next step.',
  },
  {
    name: 'Simran K.',
    place: 'Chandigarh',
    rating: 5,
    q: 'Mere gums bleed kar rahe the. Datun ne simple language mein samjhaya ki ignore nahi karna chahiye.',
  },
  {
    name: 'Aditya J.',
    place: 'Pune',
    rating: 5,
    q: 'The questions were surprisingly relevant: hot/cold sensitivity, swelling, pain duration. It felt organised.',
  },
  {
    name: 'Riya A.',
    place: 'Indirapuram',
    rating: 5,
    q: 'At 1 AM, even basic guidance feels valuable. Datun gave me clarity instead of random Google searches.',
  },
  {
    name: 'Mohit Y.',
    place: 'Faridabad',
    rating: 5,
    q: 'Mujhe sabse achha ye laga ki answer direct tha: home care kya karni hai aur clinic kab jaana hai.',
  },
] as const;
