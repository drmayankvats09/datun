# DATUN — PATIENT-SIDE PAGE ARCHITECTURE 🔒

### The "what & features" spec for every patient-facing page (for Claude Design to build)

**What this document is.** A complete, research-backed inventory of _every_ patient-side page/screen Datun needs, with, per page: its **purpose**, its **key sections & features**, **where charts/graphs and tables go**, and **build notes**. It is the companion to `Datun_Design_System_FINAL.md` (the _how it looks_); this is the _what is on each page_. Claude Design builds presentational UI from these two docs together; backend wiring (data, auth, rendering, infra) is the CTO+founder's job, done after.

**Scope.** Patient side only (clinics.datunai.com is out of scope here). Built on Datun's locked positioning — _India's most trusted dental platform, "Practo/Zomato of dental", dentist-backed (built by dentists at the system level; the brand never says "AI" publicly), the word "free" follows the refined rule (Design Part 12.5) — never a brand-lead or promotional shout, but allowed as honest no-cost reassurance (with the business model), mission-truth, the dental-tourism estimate CTA, or a ₹0 pricing label_. Mission: _Healthcare is a Right_. Tagline: _Everyone deserves care_.

> **🔄 DECISION UPDATE — Task #55 (supersedes earlier wording throughout this doc):** Tagline **"Everyone deserves care"** (supersedes "Everyone Deserves a Doctor"); patient-facing language **"dentist" / "dentist-backed"** (not "doctor"); descriptor **"India's most trusted dental platform"** (supersedes "India's #1"). **"Dentist-backed" = built by dentists at the SYSTEM level** — NOT a per-consultation doctor review/sign-off; never imply per-consultation review on patient surfaces (this retires the per-consult "doctor-backed" trust marker in A1/B4 and reframes the A5 "Our Doctors" / C2 "Doctor profile" surfaces as dentist-centric). The NMC per-consultation clinician sign-off on the Rx PDF (B5) is a separate **legal** requirement, reconcile with counsel. "diagnosis" / "prescription" unchanged. Read any older "doctor-backed" / "Everyone Deserves a Doctor" / "#1" below as superseded by this note.

**Foundation rule (founder-locked).** **No Phase 1 / Phase 2.** Every system's foundation is laid _now_ — the full page universe is architected from day one for brand + SEO/GEO + future scale. Sequencing of _build effort_ is a separate exercise; _architecture_ is complete here.

**Two faces (architecture-locked).** datunai.com is ONE installable PWA with two faces: **(A) WEBSITE-face** = marketing/content/SEO, server-rendered, no app tab-bar; **(B) APP-face** = the product (consult, dashboard, etc.), app-shell + bottom tab-bar + offline + push. Each page below is tagged **[WEB]**, **[APP]**, or **[BOTH]**.

**Research basis.** ~300+ sources across marketplace/telehealth IA, programmatic + local SEO, medical-condition/procedure page anatomy, healthcare data-viz, symptom-assessment UX, patient-portal screens, E-E-A-T/trust, India legal (DPDP/NMC), content-hub/FAQ/GEO, booking flows, PWA/onboarding/auth, dental tourism, health Q&A communities, WhatsApp/notifications, teledentistry photo capture, and medical report formats. Inline notes mark the highest-leverage findings.

**Page families (15).**
A. Website-face / Marketing · B. Consult & Diagnosis engine · C. Discovery (directory & profiles) · D. Booking & Appointments · E. Account & Health-data (app) · F. Conditions / Treatments / Symptoms libraries · G. Cost guides · H. Local pages · I. Content hub · J. Trust / Brand / Company · K. Engagement · L. Legal / Compliance / Utility · M. PWA app-shell utility · N. Dental Tourism · O. Q&A Community.

---

# FAMILY A — WEBSITE-FACE / MARKETING `[WEB]`

_The storefront. Patients are often anxious or in pain; the first screen must answer four things in <10s: who we help, what we do, how to start, what happens next. Calm > clinical (no sterile "medical-blue + stethoscope stock"). Single primary action everywhere. Clean, scannable, fast (CLS-safe)._

### A1. Homepage _(Task #55 — replaces coming-soon)_

- **Purpose:** convert a first-time visitor into "Ask Datun"; establish trust + category leadership.
- **Sections/features (as shipped, Task #55):** sticky header (logo, minimal nav, persistent "Ask Datun" CTA) · **hero** (warm headline + sub that answers the 4 questions + single primary CTA "Ask Datun" → /consult + a calm dentist-built trust cue) · **trust strip** (real v1 figures + an "any dental issue, toothache to smile makeover" breadth cue — dentist-built at the system level, no per-consultation claim) · **how-it-works** (3 steps, visual) · **the two doors** (Guidance/diagnosis · Directory/booking) · **common problems** + **common procedures** (answer-first tiles) · **why Datun + honest comparison table** (redesigned: per-criterion cards on mobile → aligned 3-col table on desktop) · **mission** (3 deliberate lines) · **verified dentists / featured cities** (→ local pages) · **patient reviews carousel** (real, consented) · **dental-tourism teaser** (centred) · **FAQ** (accordion, FAQPage schema) · **final CTA band** · **for-clinics** secondary outbound link to clinics.datunai.com · footer (sitemap, legal, languages, social). Repeat the primary CTA mid-page + footer.
- **Charts/tables:** none.
- **Build notes:** hero = the brand's whole promise in one screen; no fake stats — every number wired or honest. PWA install affordance available but subtle (website-face, no tab-bar).

### A2. How Datun Works

- **Purpose:** explain both flows + the doctor-backed-diagnosis difference.
- **Sections/features:** guidance flow (describe → diagnosis → report → medicine or clinic) · directory flow (search → verified dentist → book) · "what you get" (PDF report/prescription) · verification explainer teaser · FAQ block · CTA.
- **Charts/tables:** a step/flow diagram (illustration, not data).

### A3. Why Datun / Trust & Safety

- **Purpose:** make the trust case (the brand's core currency in YMYL).
- **Sections/features:** verification process summary · doctor-backed positioning · data-privacy (DPDP) promise · honest-scope statement (what Datun can/can't do) · accreditations/credentials · CTA.

### A4. About / Our Mission

- **Sections/features:** "Healthcare is a Right" mission · origin story · vision (Zomato-of-Indian-healthcare, dental-first) · team · values.

### A5. Our Doctors / Medical Panel

- **Purpose:** E-E-A-T — show the credentialed humans behind the diagnosis.
- **Sections/features:** medical reviewers/panel (BDS/MDS, photos, credentials) · how clinical quality is ensured · "reviewed by" standard.

### A6. For Patients (overview)

- **Sections/features:** one-scroll tour of all patient features (consult, directory, records, health-score, WhatsApp) with deep-links.

### A7. Contact

- **Sections/features:** support channels, WhatsApp (manual support number), email, grievance officer (DPDP), office address + map, hours.

### A8. Download / Install the app

- **Sections/features:** PWA install coach (Android/iOS instructions) · benefits of installing · (future) app-store badges · QR.

---

# FAMILY B — CONSULT & DIAGNOSIS ENGINE `[APP]`

_Datun's core front door. Model: structured intake → guided Q&A → result. Datun's differentiator vs Ada/Symptomate (which all say "not a diagnosis"): a **doctor-backed DIAGNOSIS**. Tone is calm, reassuring, anxiety-aware throughout. Photo + voice inputs supported. Never the word "AI"; never priced._

### B1. /consult — Intro

- **Purpose:** a reassuring, low-friction start.
- **Sections/features:** warm prompt ("Tell us what's bothering you") · entry: quick-pick chips (common complaints) + free-text · reassurance + privacy line · optional sign-in (or anonymous start) · progress expectation ("~2 minutes").

### B2. Guided Q&A

- **Sections/features:** chatbot-style one-question-at-a-time · answer via **chips + free-text** · **photo upload** (guided capture, see B-note) · **voice input** (speech-to-text for describing symptoms) · progress indicator · back/edit · "skip/not sure" option · supportive microcopy.
- **Build notes (photo):** guided capture with on-screen outline of teeth/mouth + quality auto-check (focus/angle/lighting) + retake prompt + crop; consent on upload (DPDP, Part 14.10). Teledentistry research shows patient photos are viable for screening.

### B3. Reviewing / processing

- **Sections/features:** calm interstitial (skeleton in result shape, _not_ a spinner) · reassuring copy ("Reviewing your answers…") · no fake delay theatrics.

### B4. Diagnosis result card

- **Purpose:** deliver the doctor-backed diagnosis, calmly + honestly.
- **Sections/features:** the diagnosis (plain language) · **severity/urgency indicator** · what it means · why · recommended next step · "doctor-backed" trust marker · save/share/download-report · clear escalation if urgent.
- **Charts/tables:** **severity shown as a radial zone/gauge** (good/attention/urgent — color + label, never color-alone; Design Part 19.8). No tables.

### B5. Assessment report (PDF)

- **Purpose:** a keepable, shareable, clinically-formatted report/prescription.
- **Sections/features (structured blocks, not prose):** patient info (top) · chief complaint · assessment findings · **diagnosis + severity** · recommendations / treatment plan · **medicine list** (if no procedure needed) OR **clinic-routing** (if treatment needed) · follow-up guidance · **doctor sign-off + registration number + digital signature** (NMC: unalterable PDF) · Datun branding · disclaimer.
- **Charts/tables:** findings/recommendations **table**; severity **gauge**.
- **Build notes:** medical-report best practice = labelled blocks so a reader finds diagnosis/meds/follow-up in seconds.

### B6. Next-step routing

- **Sections/features:** **if no procedure** → medicine-in-consult summary + safety notes · **if treatment needed** → nearby **verified clinics** (cards) + "Book" + map · option to download report + WhatsApp it · "Ask again" path.

---

# FAMILY C — DISCOVERY: DIRECTORY & PROFILES `[BOTH]`

_72% of Indian patients search before booking; patients visit 3–5 pages pre-booking. A find-a-provider tool + rich, trust-heavy profiles. Profiles are programmatic (1 per verified dentist/clinic → thousands of pages). Dental anxiety (36% avoid checkups) → warm, transparent, reassuring._

### C1. Directory / Find a Dentist

- **Purpose:** match patient need → verified provider → action.
- **Sections/features:** prominent **search** (treatment / dentist / location) · **filters** (treatment, location/area, gender, language, rating, distance, availability, accepting-new, fees-range, verified-only) · sort (relevance/rating/distance) · **provider cards** (photo, name, specialty, rating, location, verified badge, "Book") · **map toggle** · pagination/infinite-scroll · active-filters chips.
- **Charts/tables:** map; no graphs/tables.

### C2. Doctor profile _(programmatic, 1 per verified dentist)_

- **Sections/features:** photo · name + **verified badge** · credentials (BDS/MDS, registration) · specialties/sub-specialties · bio · **rating + reviews** · languages · location + map · fees · accepting-new · services offered · **Book CTA** (sticky on mobile) · **Q&A answers tab** (Family O funnel) · related dentists · share. JSON-LD (Physician).
- **Charts/tables:** optional rating-distribution bar; no tables.

### C3. Clinic profile _(programmatic, 1 per verified clinic)_

- **Sections/features:** clinic photos/gallery · **verified badge** · services + **price list (table)** · dentists-at-this-clinic · hours · location + map + directions · amenities · reviews · Book CTA. JSON-LD (Dentist/MedicalBusiness, NAP, geo).
- **Charts/tables:** **services/price table**; map.

### C4. Search results

- **Sections/features:** filtered list/grid · sort · active filters · pagination · empty-state ("no dentists match — widen filters") · save-search (logged-in).

### C5. Reviews (aggregate, per provider)

- **Sections/features:** overall rating · **rating breakdown** · individual reviews (verified-patient badge, date, treatment) · helpful-vote · report · write-a-review (post-visit, verified). Ethical, compliant.
- **Charts/tables:** rating-distribution **bar**.

---

# FAMILY D — BOOKING & APPOINTMENTS `[APP]`

_Flow: provider → slot → confirm → confirmation (details + pre-visit + add-to-calendar) → layered reminders → visit/join → post-visit follow-up. Reschedule/cancel self-serve._

### D1. Booking — select slot

- **Sections/features:** visit-type (in-clinic / teleconsult) · provider/clinic context · **calendar with real-time availability** · time-slot grid · timezone/locale-correct.

### D2. Booking — details & confirm

- **Sections/features:** patient details (prefilled if logged-in) · reason/notes · single-column form, validate-on-blur · consent · review summary · confirm CTA.

### D3. Booking confirmation

- **Sections/features:** appointment summary (doctor, date/time, location+map) · **pre-visit instructions** · **add-to-calendar (.ics)** · reschedule/cancel · WhatsApp confirmation note · what-to-bring.

### D4. Appointment detail / manage

- **Sections/features:** upcoming + past list · status · reschedule · cancel (with policy) · directions · join-teleconsult · re-book.

### D5. Teleconsult / video room

- **Sections/features:** single-tap join from reminder · connection-status · audio/video controls (visible, not dominant) · doc/photo share · in-call chat · end + post-call summary.

---

# FAMILY E — ACCOUNT & HEALTH-DATA `[APP]`

_The logged-in app. Healthcare dashboards are a "progressive-disclosure masterclass": surface the most actionable thing first, keep the rest accessible, never overwhelm an anxious user. Personalize to the dental context._

### E1. Dashboard / Home (logged-in)

- **Sections/features:** greeting · **Oral Health Score** (compact) · next appointment · recommended action (single, contextual) · recent activity · quick "Ask Datun" · shortcuts (records, meds, find dentist). Actionable-first, anxiety-aware.
- **Charts/tables:** **health-score ring + KPI stat-cards with sparklines** (Design Part 19.8/19.9).

### E2. Oral Health Score

- **Purpose:** the signature metric — "how's my dental health right now?"
- **Sections/features:** big score + zone label · what drives it · how to improve (actions) · history.
- **Charts/tables:** **radial ring** (big number + zones + label, never color-alone) + **score-over-time line** + factors list (Part 19.8).

### E3. Health records

- **Sections/features:** past diagnoses · reports (PDF, downloadable) · uploaded photos · allergies · search/filter · upload · share. DPDP export.
- **Charts/tables:** records **table/list**.

### E4. Consultation history

- **Sections/features:** chronological **timeline** of past consults + linked reports · re-open/re-ask.

### E5. Medications / Prescriptions

- **Sections/features:** current + past meds · dosage/schedule · **reminders** (opt-in) · refill prompt · **adherence tracking** · safety notes (link to Family M med-safety).
- **Charts/tables:** **adherence chart** + meds **table**.

### E6. Appointments (history + upcoming)

- **Sections/features:** list with status · filters · re-book · cancel/reschedule.
- **Charts/tables:** list/**table**.

### E7. Patterns / Oral-health insights

- **Sections/features:** trends over time (recurring symptoms, score, habits) · plain-language insight ("slightly better than last month" — never "AI") · prompts.
- **Charts/tables:** **line/bar trends** + optional heatmap (sparingly).

### E8. Profile / Account

- **Sections/features:** personal info · medical/dental history · **family members** (sub-profiles) · preferences · photo. Forms, single-column.

### E9. Notifications center

- **Sections/features:** alerts/reminders/tips · read/unread · per-type controls · empty-state.

### E10. Settings

- **Sections/features:** account · **language (10)** · notifications (channel + frequency) · **privacy & consent (DPDP self-service: view/export/delete data, consent toggles)** · theme (light/dark/high-contrast) · linked WhatsApp · logout · delete account.

---

# FAMILY F — CONDITIONS / TREATMENTS / SYMPTOMS LIBRARIES `[WEB]`

_The SEO/GEO bulk + brand authority. Pillar-cluster + topical authority; every page medically-reviewed (E-E-A-T) with citations + MedicalCondition/MedicalWebPage schema; **answer-first formatting** (each H2 opens with a 2-sentence direct answer — feeds AI Overviews, which appear on ~51% of health searches). Each page funnels to "Ask Datun"._

### F1. Conditions hub

- **Sections/features:** A–Z + search · grouped by area · cards · intro · links to symptoms/treatments.

### F2. Condition page _(template → ~50–70 pages)_

_Cavities, gingivitis, periodontitis, halitosis, sensitivity, cracked/broken tooth, abscess, malocclusion, oral cancer, TMJ/TMD, gum recession, dry mouth, bruxism, impacted wisdom tooth, plaque/tartar, stained teeth, mouth ulcers, pulpitis, pericoronitis, enamel erosion, etc._

- **Sections/features (anatomy):** Overview → Symptoms → Causes → Risk factors → Diagnosis → **Treatment options** → When-to-see-a-dentist → Prevention → Complications → **FAQ** → References · "Ask Datun" CTA · related conditions/treatments · "medically reviewed by + date" · breadcrumb.
- **Charts/tables:** comparison **table** where useful (e.g., gingivitis vs periodontitis). No graphs.
- **Build notes:** uniqueness per page (no thin/duplicate); MedicalCondition + MedicalWebPage(aspect/lastReviewed/reviewedBy) + FAQPage + Breadcrumb JSON-LD.

### F3. Treatments hub

- **Sections/features:** A–Z + search · grouped (restorative/cosmetic/surgical/preventive/ortho) · cards.

### F4. Treatment / procedure page _(template → ~50–60 pages)_

_Filling, root canal, crown, extraction, implant, dentures, braces, clear aligners, whitening, scaling/cleaning, root planing, gum/flap surgery, bone graft, sealants, veneers, bridges, dental bonding, inlay/onlay, apicoectomy, wisdom-tooth removal, full-mouth rehab, All-on-4, smile makeover, fluoride treatment, night guard, etc._

- **Sections/features:** What-it-is → How-it's-done → How-to-prepare → Risks → Results/recovery → **cost snippet** (→ Family G) → alternatives → When-needed → FAQ · "Find a dentist" + "Ask Datun" CTAs · related.
- **Charts/tables:** material/option **comparison table** (e.g., crown types: metal/PFM/ceramic/zirconia); optional cost table.

### F5. Symptoms hub

- **Sections/features:** A–Z + search · cards.

### F6. Symptom page _(template → ~30–40 pages)_

_Toothache, bleeding gums, jaw pain, swollen gums/face, bad breath, sensitivity to hot/cold, loose tooth, clicking jaw, mouth sores, dry mouth, tooth discoloration, gum recession, broken tooth, etc._

- **Sections/features:** What-it-means → Possible causes → **When it's urgent** (red flags) → What-to-do-now → "Ask Datun" CTA · related conditions/treatments · FAQ.
- **Charts/tables:** causes **table**. No graphs.

---

# FAMILY G — COST GUIDES `[WEB]`

_High commercial-intent, table-heavy. "How much does X cost in India" is a top patient query; honest cost transparency is on-brand (the consult is never priced, but treatment-cost education is honest — Design Part 12.5/12.6). Cost shown as honest ₹ ranges, never a "free" price-claim (refined rule, Design Part 12.5)._

### G1. Cost guides hub

- **Sections/features:** all treatment-cost guides · search · "estimate your cost" (→ G3) · EMI explainer.

### G2. Treatment-cost page _(template → ~40 national pages, optionally × cities = hundreds)_

_Root canal cost, implant cost, braces cost, aligners cost, crown cost, veneers cost, whitening cost, extraction cost, dentures cost, bridge cost, scaling cost, filling cost, full-mouth rehab cost, All-on-4 cost, etc._

- **Sections/features:** price range (₹, Indian grouping) · **factors that affect cost** · **by-city table** · **by-material/type table** · EMI/payment options · cheaper-vs-premium honesty · when-to-see-a-dentist · FAQ · "Find a dentist" CTA.
- **Charts/tables:** **price tables (core)** + optional range bar.

### G3. Cost estimator / calculator

- **Sections/features:** pick treatment + city (+ material) → estimated range · disclaimer (final cost after exam) · "Find a dentist" CTA.
- **Charts/tables:** result **stat-cards/table**.

---

# FAMILY H — LOCAL PAGES `[WEB]`

_The biggest page multiplier; competes with Practo/JustDial for "[treatment] in [city]" and "dentist near me". Each is a local landing page over Datun's verified clinics, with map + local reviews + LocalBusiness/Dentist schema + FAQPage (for AI answers)._

### H1. "Dentists in [City/Area]" _(template → ~50–100+ cities/areas)_

- **Sections/features:** city intro · **verified clinics/dentists list** (cards) · **map** · top treatments in city · local reviews · areas/neighborhoods · "Ask Datun" + Book CTAs · FAQ. JSON-LD (LocalBusiness/Dentist, geo).
- **Charts/tables:** map + provider list. No graphs.

### H2. "[Treatment] in [City]" _(template → ~40 treatments × cities = thousands)_

_e.g., "Root canal in Delhi", "Dental implants in Mumbai", "Braces in Bangalore"._

- **Sections/features:** treatment + city intro · city-specific verified clinics · **cost table for that city** · reviews · FAQ · Book/Ask CTAs.
- **Charts/tables:** **cost table** + map.

### H3. City hub / "Dental care in [City]"

- **Sections/features:** index of that city's pages (dentists, treatments, costs) · internal-link cluster.

---

# FAMILY I — CONTENT HUB `[WEB]`

_Brand + GEO/SEO engine beyond the structured libraries. UGC and editorial content feed AI Overviews + Google; health content is one of the most AI-cited sectors. Answer-first, medically-reviewed, cited._

### I1. Blog / Articles hub

- **Sections/features:** categories · search · featured · cards · newsletter opt-in.

### I2. Article page _(ongoing, hundreds)_

- **Sections/features:** answer-first intro · **medically-reviewed byline + date** · body (scannable, plain language) · citations · FAQ block · related · "Ask Datun" CTA · share. Article/MedicalWebPage JSON-LD.

### I3. Guides / Pillar pages _(~10–20)_

- **Sections/features:** comprehensive topic guide (e.g., "Complete guide to braces", "Kids' dental care", "Pregnancy & oral health") → links to cluster (conditions/treatments/costs).
- **Charts/tables:** comparison tables; diagrams.

### I4. Glossary / Dental terms A–Z _(~200–300 terms)_

- **Sections/features:** term + plain definition + related terms + (link to condition/treatment). DefinedTerm schema.

### I5. FAQ (global) + per-page FAQ blocks

- **Sections/features:** searchable, categorized accordion · FAQPage schema (valuable for GEO even post rich-result-deprecation; health sites still favored).

### I6. Video hub

- **Sections/features:** explainers, procedure demos, patient stories · categories · transcripts (a11y + SEO). VideoObject schema.

### I7. Patient stories / Testimonials

- **Sections/features:** real names + photos + video (with consent) · outcome-focused · filter by treatment · CTA.

---

# FAMILY J — TRUST / BRAND / COMPANY `[WEB]`

_(About/How-it-works/Why-Datun/Our-Doctors live in Family A; these complete the trust + brand surface. 94% read reviews; 84% trust them like personal recs; trust > satisfaction drives choice.)_

### J1. Verification process — "How we verify every dentist & clinic"

- **Purpose:** Datun's core trust moat, made explicit.
- **Sections/features:** step-by-step verification (credentials, license, primary-source) · what the verified badge means · why it protects patients · examples. Diagram.

### J2. Reviews / Social-proof hub

- **Sections/features:** platform-wide trust · aggregate stats · curated stories.
- **Charts/tables:** rating-distribution bar.

### J3. Press / Media

- **Sections/features:** coverage, press kit, logos, contact.

### J4. Careers

- **Sections/features:** culture, values, openings, apply.

### J5. Community / Awareness

- **Sections/features:** health camps, education drives, campaigns (real-people trust).

### J6. Partners / "Verified on Datun"

- **Sections/features:** co-branding program, partner logos, how-to-join (clinic outbound).

---

# FAMILY K — ENGAGEMENT `[BOTH]`

### K1. Pricing / Plans _(for the optional Pro tier)_

- **Sections/features:** 3–4 tiers · **recommended plan highlighted** · **comparison table** · monthly/annual toggle · FAQ · honest "what's paid" · mobile-stacked (no horizontal scroll). Included tier may carry a "₹0" label; core ask stays unpriced; "free" never used as a promotional shout (refined rule, Design Part 12.5).
- **Charts/tables:** plan **comparison table**.

### K2. Referral / Invite

- **Sections/features:** share link/code · rewards explainer · status · social/WhatsApp share.

### K3. Help Center / Support

- **Sections/features:** **searchable knowledge base** · categories · article pages · contact/WhatsApp · "still need help" · status.

### K4. Health tools _(optional engagement)_

- **Sections/features:** e.g., brushing timer, checkup-reminder setup, oral-health quiz. Each light + useful.

---

# FAMILY L — LEGAL / COMPLIANCE / UTILITY `[WEB]`

_Mandatory in India; health data is high-risk under DPDP (penalties up to ₹250cr). Teleconsult must follow NMC guidelines._

### L1. Privacy Policy _(DPDP Act 2023 — consent, access, correction, deletion, grievance, retention)_

### L2. Terms of Service

### L3. Medical Disclaimer _(scope, not-a-substitute-for-in-person-exam)_

### L4. Telemedicine consent _(NMC Telemedicine Practice Guidelines; no Schedule X via teleconsult; unalterable PDF Rx)_

### L5. Grievance Redressal _(IT Rules; named grievance officer + timelines)_

### L6. Refund / Cancellation policy

### L7. Cookie Policy

### L8. Accessibility Statement _(Design Part 13.2; RPwD/IS-17802; grievance contact)_

### L9. Data request / export / delete _(DPDP self-service entry point; mirrors Settings E10)_

### L10. HTML Sitemap

- **Common features:** last-updated date, plain-language summary at top, contact. No graphs/tables.

---

# FAMILY M — PWA APP-SHELL UTILITY `[APP]`

_The app's connective tissue. Onboarding is value-first + skippable; auth is phone-OTP passwordless. Tone stays warm/anxiety-aware (not cold or harsh)._

### M1. Onboarding _(3–5 value screens)_

- **Sections/features:** value props · permission-priming (notifications, later camera) · skippable · optional personalization.

### M2. Login / Phone-OTP

- **Sections/features:** phone entry (+91) · "send OTP" · trust line · alt-paths.

### M3. OTP verify

- **Sections/features:** segmented OTP input (autocomplete one-time-code) · resend timer · error states.

### M4. Profile setup

- **Sections/features:** name + basics · optional dental history · "skip for now".

### M5. Permission priming

- **Sections/features:** contextual asks (notifications/camera/location) with the _why_.

### M6. 404 / Not-found · M7. 500 / Error · M8. Offline (PWA fallback)

- **Sections/features:** friendly, on-brand, recovery action; offline shows cached/queued state.

### M9. Emergency / Urgent dental

- **Purpose:** safety-first guidance for urgent dental problems.
- **Sections/features:** "Is this an emergency?" red-flag checklist (severe pain, swelling, trauma, bleeding) · what-to-do-now (calm first-aid steps) · **nearest emergency/open clinics** + map · urgent CTA · clear escalation language. (Compliant, non-alarming; Design Part 12.6.)

### M10. Empty states _(per surface)_

- **Sections/features:** explain + show how to get started (empty-state-as-onboarding); never blank.

### M11. WhatsApp bot _(channel, not a page — documented for completeness)_

- **Sections/features:** opt-in (DPDP, consent stored) · in-chat menu (book / my reports / talk to support / health tips) · appointment reminders + consultation-complete + follow-ups (approved templates) · **human handover** to manual support with history · "not for diagnosis — Ask Datun / book for serious concerns" disclaimer · verified business account. (India: ~500M users, 98% open rate — the highest-leverage channel.)

---

# FAMILY N — DENTAL TOURISM `[WEB]` + `[APP]`

_Adjacent vertical (NRIs + international patients). Asset-light layer over Datun's verified clinics. Hook = 65–80% cost savings + verified quality. Datun's edge = verification ("the risk is the clinic, not the country"). India dental-tourism market ~18% CAGR. Foundation laid now (no phase gating)._

### N1. Dental Tourism landing (hub)

- **Sections/features:** savings hero · why-India · how-it-works · verified clinics · trust (NABH/MDS/certified implants) · "Get a free estimate" CTA · destinations.
- **Charts/tables:** savings bar.

### N2. Cost comparison (home-country vs India)

- **Sections/features:** per-treatment comparison (country selector) · what's included · total-with-travel honesty.
- **Charts/tables:** **savings bar + cost comparison table**.

### N3. Treatment package pages _(implants, All-on-4, full-mouth, veneers, smile makeover, etc.)_

- **Sections/features:** what's included · timeline/visits · price · before/after · book/estimate CTA.
- **Charts/tables:** **package table** + before/after gallery.

### N4. Virtual case evaluation

- **Sections/features:** upload X-rays/photos/reports · get estimate + plan before travel · contact concierge.

### N5. Treatment plan / itinerary

- **Sections/features:** day-by-day schedule · length-of-stay · visits · "treatment mornings + sightseeing afternoons".
- **Charts/tables:** **itinerary table**.

### N6. Tourism city guides _(Delhi/Mumbai/Bangalore… for international patients)_

- **Sections/features:** clinics + travel + hospitality ecosystem · airport access · map.

### N7. Visa & travel guide

- **Sections/features:** e-medical visa · invitation letter · documents · timelines.

### N8. Accommodation & logistics

- **Sections/features:** hotels near clinic · airport transfer · local support · map.

### N9. Before/after gallery

- **Sections/features:** cosmetic transformations (consent) · filter by treatment.

### N10. International patient stories

- **Sections/features:** same-procedure video testimonials · country filter.

### N11. Trust & accreditation

- **Sections/features:** NABH, MDS, sterilization protocols, implant manufacturer certificates, **warranty/redo policy**, home-country partner-clinic coordination.

### N12. FAQ (tourism)

- **Sections/features:** safety, timelines, payment (cards/UPI/wire), follow-up. FAQPage schema.

### N13. International concierge / contact

- **Sections/features:** dedicated international desk · WhatsApp · currencies/payment · response-time promise.

### N14. "[Treatment] in India for [country] patients" _(programmatic → ~10 treatments × ~8 countries)_

_e.g., "Dental implants in India for UK patients"._

- **Sections/features:** treatment + savings vs that country · verified clinics · packages · trust · FAQ.
- **Charts/tables:** **cost comparison table**.

---

# FAMILY O — Q&A COMMUNITY ("Datun Answers") `[BOTH]`

_The UGC + GEO + doctor-acquisition engine (Reddit/Quora-style mechanics + Practo's "ask a question", but **verified Datun dentists answer — never random doctors**, which protects the doctor-backed-trust brand and avoids the spam/quality problems on open platforms). UGC is the new AI-citation/trust layer; health Q&A is heavily AI-cited; every question becomes a long-tail page. Tone is **warm + anxiety-aware** (never Stack-Overflow-harsh; askers are never downvoted). Foundation laid now._

**System guardrails (apply to all O pages):** verified-dentist-only answers · **anonymous asking** (DPDP) · **no prescriptions in public Q&A** (general guidance only; diagnosis/Rx → route to /consult; NMC) · medical disclaimer on every thread · human + medical-review + ML moderation · cite-where-relevant · seed with real Q&A at launch.

### O1. Community / Q&A home

- **Sections/features:** "Ask a question" CTA · recent + popular + unanswered tabs · categories (by condition/treatment) · search · top-contributors strip · trust/disclaimer banner.

### O2. Ask a question (composer)

- **Sections/features:** concise title · detail field · **photo attach** (optional) · **tags** (condition/treatment) · **anonymity toggle** (default anonymous) · answer-guideline tip · **similar-questions surfacing** (reduce duplicates) · post.

### O3. Question detail page _(the SEO/GEO asset, programmatic → thousands)_

- **Sections/features:** question · **verified-dentist answers** (dentist badge + credentials + link to profile + citations) · **upvote / helpful** · **best/verified-answer** mark · follow-ups · related questions · **"For a proper diagnosis, Ask Datun" CTA** · report · share. QAPage JSON-LD.
- **Charts/tables:** none (discussion content).

### O4. Category / topic pages _(by condition/treatment)_

- **Sections/features:** browse Q&A by topic · links to the matching condition/treatment page (pillar-cluster tie) · ask CTA.

### O5. Tag pages _(programmatic)_

- **Sections/features:** one per tag · question list · description.

### O6. Search results (Q&A)

- **Sections/features:** query + filters (answered/unanswered, tag, recency) · cards.

### O7. Dentist answers tab _(on Doctor profile, C2)_

- **Sections/features:** a dentist's answers + reputation + badges → **booking/consult funnel**.

### O8. Leaderboard / Top contributors

- **Sections/features:** reputation ranking · badges ("Verified Dentist", "Top Contributor", milestones) · gentle gamification (motivates quality answers → more pages rank → more patients).

### O9. Community guidelines + report/moderation

- **Sections/features:** specific rules (not "be nice") · medical-safety + no-self-promotion rules · report flow · escalation. (Visible moderation = safety.)

---

# APPENDIX — page-universe at scale

- **Unique templates/pages:** ~90 (Families A–E, J–O cores + the template definitions in F–H–N).
- **Programmatic/generated (the brand + SEO/GEO engine):** Conditions ~50–70 · Treatments ~50–60 · Symptoms ~30–40 · Cost guides ~40 (× cities optional → hundreds) · Local ~1,000–2,500 (dentists-in-city + treatment-in-city) · Doctor + Clinic profiles = thousands (scale with network) · Glossary ~200–300 · Blog/Guides ~400–600 · Tourism country×treatment ~80 · **Q&A question pages = thousands**.
- **Total at maturity: ~10,000–15,000+ pages.**

**Where graphs live (only data-rich app surfaces):** Dashboard (ring + KPI sparklines), Oral Health Score (ring + line), Patterns (trends), Medications (adherence), Reviews (rating bars), Diagnosis (severity gauge), Cost comparison (savings bar). **Where tables live:** Cost guides, clinic price lists, condition/treatment comparisons, pricing plans, records/meds/appointments lists, tourism packages/itinerary/comparison. **Marketing & content pages stay graph/table-free** unless a comparison genuinely aids the reader (data-ink discipline).

_Companion to `Datun_Design_System_FINAL.md`. This document defines **what each page is and the features it contains**; the design system defines **how it looks and behaves**; backend wiring (data/auth/rendering/infra) is handled separately by the CTO + founder. Patient side only._
