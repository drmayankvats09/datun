# DATUN — PATIENT-SIDE DEEP BUILD SPEC 🔒 (LIVING DOCUMENT)

### Family-by-family, page-by-page, section-by-section — the FAANG-grade build brief for Claude Design

**How this document works.** This is the _deep_ companion to two docs:

1. `Datun_Design_System_FINAL.md` — _how it looks & behaves_ (color, type, spacing, motion, components, a11y).
2. `Datun_Patient_Page_Architecture_FINAL.md` — _the map_: which families/pages exist (the index).
3. **THIS doc** — _the deep brief_: for each page, every section, every sub-feature, copy direction, components, where data-viz/tables go, and build notes — decided FAANG-grade, research-backed.

**The per-part loop (locked).** We go family-by-family. For each family: deep multi-source web research (page-by-page + sub-feature-by-sub-feature) → I decide the FAANG-grade best (one decision, no options) → I write the family's full spec here as a new **Part** → I update this living doc so the next part continues with context. Older parts get revised whenever a later decision requires it. **No Phase 1/Phase 2** — every foundation is specified now. **Patient side only.**

**Status tracker.**

- ✅ **Part 1 — Family A: Website-face / Marketing**
- ✅ **Part 2 — Family B: Consult & Diagnosis engine**
- ✅ **Part 3 — Family C: Discovery (directory & profiles)**
- ✅ **Part 4 — Family D: Booking & Appointments**
- ✅ **Part 5 — Family E: Account & Health-data**
- ✅ **Part 6 — Family F: Conditions / Treatments / Symptoms libraries**
- ✅ **Part 7 — Family G: Cost Guides**
- ✅ **Part 8 — Family H: Local Pages**
- ✅ **Part 9 — Family I: Content Hub**
- ✅ **Part 10 — Family J: Trust / Brand / Company**
- ✅ **Part 11 — Family K: Engagement**
- ✅ **Part 12 — Family L: Legal / Compliance / Utility**
- ✅ **Part 13 — Family M: PWA App-Shell Utility**
- ✅ **Part 14 — Family N: Dental Tourism**
- ✅ **Part 15 — Family O: Q&A Community ("Datun Answers")** _(this part — completes the patient-side build spec, A→O)_

**Locked brand facts applied throughout.** India's #1 dental platform ("Practo/Zomato of dental"); two doors (Guidance → doctor-backed **diagnosis** → PDF report → medicine or verified-clinic routing; Directory → find verified dentist → book); the brand **never says "AI" publicly** (it's "doctor-backed diagnosis"); the word **"free" follows the refined rule (Design Part 12.5)** — never a brand-lead/promotional shout, but allowed as honest no-cost reassurance (with the business model), mission-truth, the dental-tourism estimate CTA, or a ₹0 pricing label; mission _Healthcare is a Right_; tagline _Everyone Deserves a Doctor_; audience = every Indian, Android-first + iOS tested, Tier-1→2→3 sequencing; datunai.com = ONE PWA, two faces (WEBSITE-face here, APP-face later families).

---

# 🌐 GLOBAL WEBSITE-FACE SHELL (shared across all `[WEB]` pages)

_Specified once here because the header/footer/trust-bar recur on every marketing & content page. The APP-face shell (bottom tab-bar, app chrome) is specified in Part 13 (Family M)._

## Shell-1. Global header (website-face)

- **Structure:** single sticky top bar (sticky because it carries the primary CTA; research: sticky header + persistent CTA is a healthcare best practice). Height compact; condenses slightly on scroll.
- **Left:** Datun logo (wordmark + mark) → links home.
- **Center / primary nav (5–7 items max — "less is more"):** decided set →
  1. **How it works** (→ A2)
  2. **Find a Dentist** (→ Family C directory) — plain label, not "Meet our experts"
  3. **Learn** (lightweight click-to-open dropdown → Conditions hub, Treatments hub, Symptoms hub, Cost guides, Blog — Families F/G/I) — _click-to-open, never hover; no dropdown-in-dropdown_
  4. **Dental Tourism** (→ Family N) — present from day one (no phasing)
  5. **For Clinics ↗** (secondary outbound to clinics.datunai.com — visually de-emphasized)
- **Right (actions):** **language switcher** (10 locales), **Log in** (front-and-center, _not_ buried — 70% of patients value record access), **primary CTA button "Ask Datun"** (→ /consult; persists on scroll; the one focused action).
- **Mobile:** logo + **persistent "Ask Datun"** + hamburger. Hamburger opens a full-height sheet with the nav items, language, Log in. Tap targets ≥ 24×24px (≥ 44px recommended); thumb-friendly.
- **A11y/build:** keyboard-navigable, focus-visible rings, `aria-current` on active, skip-to-content link, 3:1 contrast on all controls. Server-side rendered (GEO + first-paint).
- **What NOT to do:** no mega-menu overload, no cute icons hiding actions, no shifting labels (CTA copy stays consistent → reduces hesitation).

## Shell-2. Global footer (website-face)

- **Columns (decided):**
  1. **Product** — Ask Datun, Find a Dentist, Dental Tourism, Datun Answers (Q&A), Download the app
  2. **Learn** — Conditions, Treatments, Symptoms, Cost guides, Blog, Glossary, FAQ
  3. **Company** — About, Our Doctors, How we verify, Careers, Press, Contact
  4. **Legal & Trust** — Privacy (DPDP), Terms, Medical Disclaimer, Telemedicine consent, Grievance Redressal, Refund, Cookies, Accessibility, HTML Sitemap
- **Footer base row:** language switcher · social links · **"Install Datun" link** (PWA install entry point — research: footer is a valid secondary install entry) · copyright · **medical disclaimer one-liner** ("Datun provides doctor-backed guidance; for emergencies contact local services").
- **Trust micro-row (above base):** "Doctor-backed" · "Verified clinics" · DPDP/secure (HTTPS) badge · medically-reviewed mark. (Login/portal is NOT relegated to footer — it lives in the header.)
- **Build:** SSR; footer is part of the internal-link graph (SEO/GEO); NAP (Name/Address/Phone) consistent with all external listings.

## Shell-3. Recurring trust elements (used on multiple pages)

- **Reusable modules** (so pages update without breaking structure): _trust strip_, _how-it-works 3-step_, _doctor-panel teaser_, _patient-stories carousel_, _condition quick-links grid_, _city grid_, _FAQ accordion_, _CTA band_. Each is a token-styled component from the design system.
- **Trust principle (research-locked):** trust is woven **throughout** and placed **near commitment points** (next to CTAs), never only in the footer. Trust stack = clinician credibility + process reliability + outcome context. Real photography only (no stock "smiling suits"). Statistics must be real + verifiable; testimonials real + consented.

---

# PART 1 — FAMILY A: WEBSITE-FACE / MARKETING `[WEB]`

## A.0 — Family principles & page-sequence model

_The storefront. Visitors are frequently anxious or in pain and scanning fast. Research-derived rules for every page in this family:_

- **Calm > clinical.** Warm, reassuring, ample whitespace; never sterile "medical-blue + stethoscope stock." (Anxiety-aware; design system palette = teal-led.)
- **Answer 4 questions in <10s** (the "first-screen test"): _what we do · who it's for · how to start · what happens next._
- **One focused primary action** per page ("Ask Datun"); optional low-commitment secondary path (e.g., "See how it works"). Avoid decision fatigue.
- **Lead with relevance & fit, then credibility, then process, then action** (the patient-evaluation order — broad brand claims first = failure mode).
- **Clarity beats aesthetics**; proof (real numbers, real faces) beats persuasion; precise language beats clever wordplay.
- **Mobile-first** (60–70%+ traffic mobile): vertical stacking, ≥24–32px headlines, full-width tappable CTAs, real-device tested.
- **SSR + GEO-ready** (AI Overviews ~48% of queries; health is one of the most AI-cited sectors): server-rendered, answer-first H2s, one-topic-per-section H-hierarchy, MedicalOrganization/Organization + FAQ + Breadcrumb JSON-LD, llms.txt, fresh content, consistent entity/NAP. LLMs cite-not-rank; citation authority compounds.
- **CLS-safe & fast** (Visual-stability + Core Web Vitals; one-second delay can cut conversions ~7%).
- **Reusable modules** so marketing can iterate without breaking structure.

**The durable page architecture (applied to A1 and reused):** (1) first-screen service promise + patient-fit qualifier + single action → (2) how it works → (3) the two doors → (4) trust/credibility → (5) breadth (conditions/cities) → (6) social proof → (7) final CTA + reassurance. This mirrors how patients actually evaluate care.

---

## A1 — Homepage `[WEB]` _(Task #55 — replaces the coming-soon page)_

**Purpose.** Convert a first-time, often-anxious visitor into "Ask Datun"; establish Datun as the category-defining, trustworthy dental brand; serve SEO/GEO as the entity's root page.
**Primary action:** "Ask Datun" → /consult. **Secondary:** "Find a Dentist" → directory.

### Section-by-section (top → bottom)

1. **Global header** (Shell-1) — persistent "Ask Datun".
2. **Hero** _(the whole promise in one screen)_
   - **Headline** (<10 words, benefit-driven, what's-in-it-for-the-patient — not "we are a platform"). Warm + reassuring. Carries the _Everyone Deserves a Doctor_ spirit without being a tagline dump.
   - **Subheadline** (<25 words): what Datun does + the doctor-backed-diagnosis promise + breadth ("any dental problem").
   - **Single primary CTA** "Ask Datun" (large, high-contrast, above the fold) + **secondary** text-link "See how it works".
   - **One trust cue** near the CTA (e.g., "Doctor-backed" or consultation count or verified-clinics count — real, no fake numbers; a **"No cost to you"** reassurance is also permitted here per the refined rule — Design Part 12.5 — though the hero _headline_ still leads with mission/value, not a "free" shout).
   - **Hero visual:** warm, real, on-brand — a calm consultation/report motif (per design system; the rejected 3D-blob is out, design rebuilt in Claude Design). No stock "smiling suits". Optional subtle motion that guides the eye to the CTA (honor prefers-reduced-motion).
   - **Mobile:** vertical stack (headline → subhead → CTA → visual), 24–32px+ headline, full-width CTA, text above visual.
3. **Trust strip** _(immediately reinforce credibility — research: proof above/near fold beats persuasion)_: doctor-backed · X consultations delivered · verified clinics across N cities · medically-reviewed. Real, verifiable; logos/marks unobtrusive.
4. **How Datun works** _(3 steps, reusable module)_: (1) **Describe** what's bothering you → (2) **Get a doctor-backed diagnosis** + report → (3) **Get medicine** in consult _or_ see a **verified dentist**. Consistent spot-illustration/icon "stepping stones" (same stroke/palette). Each step = short benefit line. Ends with inline "Ask Datun" CTA.
5. **The two doors** _(let the visitor self-select)_: **Door 1 — Guidance** (describe → diagnosis → report → medicine/clinic) with "Ask Datun" CTA; **Door 2 — Find & Book** (search verified dentists → book) with "Find a Dentist" CTA. Two clean cards; equal weight; honest about what each gives.
6. **Why Datun / trust block** _(credibility, tied to real patient concerns)_: verification moat (how every dentist/clinic is verified), doctor-backed diagnosis, DPDP/data-privacy promise, honest scope. Each point ties to a concern. Link → A3.
7. **Condition quick-links** _(breadth + SEO internal-linking)_: grid of common complaints (toothache, sensitivity, bleeding gums, bad breath, broken tooth, wisdom-tooth pain…) → condition/symptom pages (Family F). Each is also an "Ask Datun" on-ramp.
8. **Featured cities** _(local breadth + SEO)_: grid of cities → local pages (Family H). "Dentists in <City>".
9. **Patient stories teaser** _(social proof — emotional reassurance)_: real names + photos (+ video) with consent; outcome-focused; carousel. Link → patient stories (Family I/J).
10. **Dental Tourism teaser** _(present from day one)_: short band for NRIs/international patients ("World-class dental care in India, verified") → Family N.
11. **Datun Answers teaser** _(community + GEO)_: "Real questions, answered by verified dentists" → Family O. (Also seeds AI-citation/UGC authority.)
12. **For Clinics cross-link** _(secondary, outbound)_: a quiet band → clinics.datunai.com (B2B). De-emphasized; never competes with patient CTAs.
13. **Final CTA band** _(reassurance + action)_: warm restatement + "Ask Datun". Low-pressure copy (high-pressure language reduces trust in care contexts).
14. **Global footer** (Shell-2).

- **Charts/tables:** none (marketing page stays graph/table-free).
- **Build notes:** SSR; `MedicalOrganization` + `WebSite` (+ `SearchAction`) + `FAQPage` (if FAQ present) + `BreadcrumbList` JSON-LD; answer-first copy; LCP image optimized; install affordance subtle (website-face, no app tab-bar); every section wired to a real capability or honest static — no faked screens/stats; reuse modules.
- **Interlinks verified:** Ask Datun→B1 (Part 2); Find a Dentist→C1 (Part 3); condition links→F (Part 6); cities→H (Part 8); stories→I/J (Parts 9/10); tourism→N (Part 14); Q&A→O (Part 15); For Clinics→external. _(All targets exist in the architecture map.)_

---

## A2 — How Datun Works `[WEB]`

**Purpose.** Explain both flows end-to-end + the doctor-backed-diagnosis difference; convert the "I want to understand first" visitor.

### Sections

1. Header.
2. **Intro** — one-line promise + "Ask Datun" CTA.
3. **Flow 1 — Guidance/Care (visual, step-by-step):** describe (chips/text/photo/voice) → doctor-backed diagnosis + severity → PDF report/prescription → **medicine in consult if no procedure** / **routed to verified clinic if treatment needed**. Each step: what happens + what you get. Process diagram (illustration, not data).
4. **Flow 2 — Directory/Booking (visual):** search/filter → verified dentist/clinic profile → book → visit/teleconsult.
5. **"What you get"** — the report/prescription explained (sample, anonymized) + records saved + WhatsApp delivery.
6. **The Datun difference** — _doctor-backed_ (accountable, verified) vs generic symptom checkers; the verification moat (teaser → A3/J1).
7. **FAQ** (accordion, FAQPage schema): "Is this a real diagnosis?", "What if I need a procedure?", "Is my data private?" (answer-first).
8. **CTA band** + footer.

- **Charts/tables:** none (a process diagram only).
- **Build:** SSR; `HowTo`/`FAQPage` + `BreadcrumbList` JSON-LD; answer-first.

---

## A3 — Why Datun / Trust & Safety `[WEB]`

**Purpose.** Make the full trust case (the brand's core currency in YMYL) — the page a cautious patient reads before committing.

### Sections

1. Header.
2. **Headline + promise** (trust, specifically).
3. **Verification process summary** — how every dentist/clinic is verified (credentials, license, primary-source); what the verified badge means; why it protects patients. (Deep version = J1.) Diagram.
4. **Doctor-backed diagnosis** — credentialed humans behind every diagnosis; "reviewed by" standard; honest scope (what Datun can/can't do).
5. **Data privacy & security (DPDP)** — what's collected, consent, your control (view/export/delete), encryption/HTTPS; anonymity in community Q&A.
6. **Credentials & accreditations** — Datun's medical governance; relevant registrations.
7. **Trust signals** — real consultation stats, verified reviews, patient-outcome context (all real).
8. **FAQ** (safety-focused) + **CTA** + footer.

- **Charts/tables:** none (verification diagram only).
- **Build:** SSR; `MedicalOrganization` + `FAQPage` JSON-LD; E-E-A-T author/reviewer attribution architected in.

---

## A4 — About / Our Mission `[WEB]`

**Purpose.** Communicate who Datun is + why (mission/vision/values + story + team) — emotional + credibility anchor.

### Sections (research: About must do 3 things — who+why, team, proof; lead with clarity before storytelling)

1. Header.
2. **Mission hero** — _Healthcare is a Right, Not a Privilege_ + one-line what Datun does.
3. **Origin story** — why Datun exists (the dental access/trust gap in India), founder narrative (concise, authentic).
4. **Vision** — Zomato-of-Indian-healthcare, dental-first; the category Datun is defining.
5. **Values** — patient-first, verified-trust, honesty, access.
6. **Team** — leadership + medical panel teaser (real photos + roles; plain language) → links to A5.
7. **Proof / impact** — real numbers, patient stories teaser.
8. **CTA** (Ask Datun / Join as clinic — patient CTA primary) + footer.

- **Charts/tables:** none.
- **Build:** SSR; `Organization` + `AboutPage` JSON-LD.

---

## A5 — Our Doctors / Medical Panel `[WEB]`

**Purpose.** E-E-A-T — show the credentialed humans who back the diagnosis; reduce booking intimidation ("feel you already know them").

### Sections

1. Header.
2. **Intro** — Datun's medical governance + how clinical quality is ensured.
3. **Panel grid** _(research: simple grid, consistent photography)_ — each card: professional headshot · name · **credentials (BDS/MDS, registration number)** · specialty · **one-line philosophy of care** · (optional) link to their Q&A answers (Family O). Plain language, no academic shorthand.
4. **"Reviewed by" standard** — how content/diagnoses are medically reviewed (the E-E-A-T attribution model).
5. **CTA** (Ask Datun) + footer.

- **Charts/tables:** none.
- **Build:** SSR; `Physician`/`Person` JSON-LD per panelist; consistent image treatment; author entities linked for GEO.

---

## A6 — For Patients (overview) `[WEB]`

**Purpose.** One-scroll tour of all patient capabilities for someone exploring "what can Datun do for me?"; routes to each feature.

### Sections

1. Header.
2. **Intro** — "Everything dental, in one place."
3. **Capability blocks** (each: short benefit + visual + deep-link): Ask Datun (diagnosis + report) · Find & book verified dentists · Your health records & Oral Health Score · Medicines & reminders · Dental Tourism · Datun Answers (Q&A) · WhatsApp support.
4. **Trust strip** (reused).
5. **CTA** + footer.

- **Charts/tables:** none.
- **Build:** SSR; internal-link hub (SEO).

---

## A7 — Contact `[WEB]`

**Purpose.** Make it effortless to reach Datun + meet India support/grievance norms.

### Sections (research: phone clickable, address + embedded map, form, hours, emergency note; don't bury)

1. Header.
2. **Contact channels** — **WhatsApp** (manual-support number, primary in India) · email · phone (clickable on mobile).
3. **Contact form** — clear labelled fields, validate-on-blur, DPDP consent line; success/empty/error states.
4. **Grievance officer (DPDP/IT Rules)** — named officer + redressal path (links L5).
5. **Office address + embedded map + hours.**
6. **Emergency pointer** — "For a dental emergency, see <Emergency page>" (→ M9) / local services. Calm, non-alarming.
7. Footer.

- **Charts/tables:** map only.
- **Build:** SSR; `ContactPage` + `Organization` JSON-LD; form data handled DPDP-carefully.

---

## A8 — Download / Install the app `[WEB]`

**Purpose.** Drive PWA installs (the "premium native-like app" promise) with device-tailored guidance.

### Sections (research: highlight install loudly; iOS Safari has NO auto-prompt → manual steps mandatory)

1. Header.
2. **Hero** — "Install Datun" + benefits (offline access, faster, reminders/push, home-screen).
3. **Device-tailored instructions** _(auto-detect + show the right one)_:
   - **Android (Chrome/Edge):** tap the install prompt / "Add to Home screen" (illustrated steps).
   - **iOS (Safari):** Share → "Add to Home Screen" → Add (illustrated steps — _manual, because iOS has no auto-prompt_).
   - **Desktop:** install icon in address bar.
4. **QR code** — scan-to-open on phone.
5. **Why install** — short benefit list (push reminders, offline records, app-shell speed).
6. **(Future) app-store badges** placeholder — honest "coming soon" or hidden until real (no fake links).
7. **CTA** (Ask Datun) + footer.

- **Charts/tables:** none.
- **Build:** valid web app manifest (name, start_url, icons multiple sizes/formats, theme, display=standalone), HTTPS, service worker; splash screen; install entry also in header + footer (Shell-1/2); installed app boots into APP-face (Family M).

---

## A.research-basis (Part 1)

~100+ sources synthesized for this family, including: healthcare/medical homepage anatomy & section order (multiple 2026 guides), hero-section conversion best practices (6 essential elements / 5-second test / mobile stacking / no-stock-photo), healthcare trust-signal & social-proof placement + E-E-A-T/YMYL (Dec-2025 Core Update impact), healthcare navigation IA (5–7 items, sticky, click-to-open, plain labels, login-in-header), "how it works"/process & onboarding patterns (3-step, clarity>aesthetics, proof-above-fold, spot-illustration stepping-stones), About/mission & medical-team page patterns (story+grid+bios+philosophy), contact-page essentials, PWA install/A2HS (iOS-Safari manual-instructions caveat, manifest), competitor IA (Teladoc/Maven/Hims/Mayo/Zocdoc/1mg/Apollo 24x7), and GEO/AI-search homepage requirements (SSR, answer-first, Organization/MedicalOrganization + FAQ + Breadcrumb schema, llms.txt, entity clarity, freshness). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## A.interlink verification (Part 1)

- Header/footer/trust modules are shared (Shell-1/2/3) and reused by every `[WEB]` page → consistent structure, single source of change.
- Every homepage section links to a real destination that exists in the architecture map (Consult B, Directory C, Conditions F, Cost G, Local H, Content/Stories I, Trust J, Tourism N, Q&A O, external Clinics).
- No section depends on a not-yet-specified mechanic in a way that blocks Claude Design's _presentational_ build; data wiring is handled by CTO+founder after.
- "Free" word check: absent from all A-family copy. "AI" word check: absent (doctor-backed diagnosis only). Emergency/urgent language: calm, routes to M9.

---

---

# PART 2 — FAMILY B: CONSULT & DIAGNOSIS ENGINE `[APP]`

## B.0 — Family principles (the core front door)

_This is Datun's heart: a patient describes a dental problem and receives a **doctor-backed diagnosis** → PDF report/prescription → **medicine in-consult** (if no procedure) or **routing to a verified clinic** (if treatment needed). The flow is `[APP]`-face (app-shell, can be entered from any "Ask Datun" CTA). Research-locked rules:_

- **Doctor-backed diagnosis is the differentiator AND the safety/compliance anchor.** Every other consumer tool (Ada/Symptomate/K-Health) explicitly says _"triage, not a diagnosis; physicians outperform."_ Datun says **diagnosis** because a registered RMP stands behind it (the internal engine assists; a clinician reviews/owns the output and signs the prescription). This is why Datun must keep real NMC-registered clinician backing — it is what licenses the word "diagnosis."
- **Never the word "AI"** in any patient-facing copy (it's "doctor-backed"). **"free" follows the refined rule (Design Part 12.5)** — not a brand-lead/shout, but a **"No cost to you · funded by partner clinics · your data is never sold"** reassurance is permitted at a hesitation/objection point (it also defuses the data-selling fear).
- **Calm, anxiety-aware, reassuring** throughout (36% of people avoid dental care from anxiety). Plain language, supportive microcopy, no alarm.
- **Safety-first triage.** Err toward caution; detect red-flags; escalate clearly to urgent care when warranted (→ M9 Emergency). "Talk to a person"/human-support escalation always reachable.
- **One question at a time** (slot-filling) + **hybrid input** (chips for common answers + free-text + photo + voice) + **branching** (skip irrelevant) + **progress indicator** + friendly acknowledgments. Conversational flow lifts completion ~30%.
- **Save progress / resume** (a health flow crashing or losing answers mid-way is fatal to trust). Reliability is a feature.
- **Mobile-first**, short prompts (split long messages), large touch targets, thumb-friendly; works on modern 4G/5G; lean payloads.
- **NMC-compliant** end-to-end (medicine lists O/A/B + prohibited; registration number + digital signature on Rx; identity + consent; records ≥3 years; standard-of-care = in-person-equivalent). **DPDP-compliant** (health data is sensitive; explicit consent; encryption; minimization; view/export/delete).
- **Neutral routing** — when a procedure is needed, route honestly to verified clinics; when not, give medicine in-consult. Never make routing feel like an "upsell."
- **Calm processing** — interstitials are reassuring skeletons (in the result's shape), never anxiety-inducing spinners or fake delays.

**The consult flow (screen sequence):** B1 Intro → B2 Guided intake + Q&A (B2a structured intake → B2b chief complaint → B2c guided Q&A → with B2d photo + B2e voice inline) → B3 Reviewing → B4 Diagnosis result card → B5 Assessment report (PDF) → B6 Next-step routing (medicine in-consult **or** verified-clinic routing; emergency escalation branch at any point).

---

## B1 — /consult — Intro `[APP]`

**Purpose.** A reassuring, low-friction start that converts the "Ask Datun" intent into the flow.

### Sections/features

1. **Warm prompt** — "Tell us what's bothering you" (calm, human). Carries _Everyone Deserves a Doctor_ tone.
2. **Entry input** — **quick-pick chips** of common complaints (toothache, sensitivity, bleeding gums, swelling, broken tooth, bad breath, wisdom-tooth pain…) **+ free-text** field ("describe in your own words") **+ voice mic** (speech-to-text).
3. **Reassurance + privacy line** — "Reviewed by our dental doctors · your details are private" (doctor-backed + DPDP; no "AI"; "free" only per the refined rule — Design Part 12.5).
4. **Time expectation** — "~2 minutes" (sets a finishable expectation; conversational forms reward this).
5. **Sign-in choice** — start anonymously **or** sign in to save (no hard login wall — login walls cut completion; identity captured later, before the diagnosis/Rx per NMC).
6. **Single primary action** — "Start" (the one focused action).

- **Charts/tables:** none.
- **Build:** APP-shell; resumable session created here; consent groundwork; entry chips are reusable component.

---

## B2 — Guided intake + Q&A `[APP]` _(the core interaction)_

**Purpose.** Capture a clinically-sufficient, structured picture — calmly, conversationally — to power a sound doctor-backed diagnosis.
**Pattern:** chatbot-style, one question at a time, hybrid input, branching, progress indicator, back/edit, "not sure/skip", friendly acknowledgments, resumable. (Datun voice = Calm/Respectful.)

### B2a — Structured intake (sub-screen / early questions)

- **Captured (concise, conditional):** age, sex; **pre-existing conditions** (diabetes, heart disease, pregnancy, immunocompromised…); **current medications**; **allergies** (esp. local anaesthesia, penicillin/latex). Conditional logic: select "allergy" → prompt to specify. These are clinical-necessity + legal-protection + drive safe medicine choices.
- **UX:** chips/toggles for common, free-text for "other"; "skip if none"; reassurance that this keeps advice safe.
- **DPDP:** explicit consent to process health data captured here (links L1/L4).

### B2b — Chief complaint

- **Captured:** the main problem + onset/duration + severity (pain scale, calm) + location (tooth-area picker or chips) + triggers (hot/cold/sweet/pressure). "Why now" probe on high-signal answers.
- **UX:** plain-language; optional simple mouth/tooth diagram to point at the area.

### B2c — Guided Q&A (adaptive)

- **Behaviour:** branches from the complaint (e.g., bleeding-gums path vs broken-tooth path); asks only relevant follow-ups; **progress indicator** ("Step X of Y"); friendly acknowledgments ("Thanks — one more"); back/edit any answer; "not sure" allowed.
- **Red-flag detection:** certain answers (facial swelling + difficulty breathing/swallowing, trauma, uncontrolled bleeding, high fever) trigger an **immediate calm escalation** → urgent-care guidance (→ M9), short-circuiting the normal flow.

### B2d — Photo capture (inline, optional but encouraged)

- **Guided capture:** on-screen **outline/overlay** for the mouth/teeth/affected area; **prep instruction** ("brush first; good light"); front + affected-area shots.
- **Quality auto-check:** focus/angle/lighting; **retake prompt** if poor; **crop**; multi-image allowed.
- **Consent + privacy** on upload (DPDP); images stored encrypted, attached to the case for clinician review. (Teledentistry research: patient photos are viable for caries/condition screening.)
- **UX:** skippable with explanation of how photos improve accuracy.

### B2e — Voice input

- **Speech-to-text** for describing symptoms (accessibility + low-literacy + convenience); editable transcript; multilingual (10 locales); mic affordance on free-text steps. (Design system Part 13 a11y + 16.12.)
- **Charts/tables:** none in B2.
- **Build:** branching logic + resumable state + encrypted media; structured output handed to the clinician-review/diagnosis step (briefs the RMP before they own the diagnosis).

---

## B3 — Reviewing / processing `[APP]`

**Purpose.** Bridge to the result calmly while the assessment + doctor-backing happens.

### Sections/features

- **Calm interstitial** — a **skeleton in the shape of the result** (not a spinner), reassuring copy ("Reviewing your answers with our dental team…"). No fake-delay theatrics, no anxiety-inducing language.
- **Honest status** — if a real clinician review introduces a wait, set expectation ("Your report will be ready shortly / we'll notify you") rather than faking instant.
- **Charts/tables:** none.
- **Build:** loading-state component from design system; supports both near-instant and short-wait (notify via push/WhatsApp) paths.

---

## B4 — Diagnosis result card `[APP]`

**Purpose.** Deliver the doctor-backed diagnosis — calmly, in plain language, honestly.

### Sections/features (research: educate → reveal → explain; communicate at literacy level; be honest about uncertainty; outline follow-up)

1. **The diagnosis** — plain-language name + one-line "what this is".
2. **Severity / urgency indicator** — calm **3-level** model: _Routine_ / _Needs attention_ / _Urgent_ — shown as a **radial gauge/zone with label + icon + color (never color-alone)** (design system Part 19.8). Even "Urgent" framed supportively with a clear action.
3. **What it means** — short explanation using the patient's own context (their reported symptoms / their uploaded photo for engagement).
4. **Why** — the reasoning, briefly (builds trust; honest about uncertainty where it exists — doctor-backing is the confidence anchor).
5. **Recommended next step** — clear, single primary action (download report · get medicine · see a verified dentist · seek urgent care).
6. **Doctor-backed trust marker** — "Reviewed by Dr. **_ (Reg. No. _**)" or "Datun dental panel" (the accountability anchor; NMC identity disclosure).
7. **Actions** — save · share · **download report (PDF)** · ask a follow-up · re-ask.
8. **Escalation** — if urgent, prominent calm "What to do now" + nearest emergency care (→ M9).

- **Charts/tables:** **severity gauge** (radial, label+icon+color). No tables here.
- **Build:** APP-shell; result persisted to records (E3/E4); honest copy; no "AI"; "free" per the refined rule (Design Part 12.5).

---

## B5 — Assessment report (PDF) `[APP]`

**Purpose.** A keepable, shareable, clinically-formatted, **NMC-compliant** report/prescription.

### Structure (labelled blocks — research: structured blocks beat prose; reader finds diagnosis/meds/follow-up in seconds)

1. **Header** — Datun branding + report title + date/time + unique report ID.
2. **Patient info** — name, age/sex, (ID where required) — top block.
3. **Chief complaint** — as captured.
4. **Assessment findings** — structured **findings table** (symptom/area/observation), referencing uploaded photos where relevant.
5. **Diagnosis + severity** — the diagnosis + **severity gauge** (label+icon+color, never color-alone).
6. **Recommendations / treatment plan** — plain language.
7. **Medicine list** _(if no procedure needed)_ — drug, dose, frequency, duration, notes — **restricted to NMC List O / List A (and List B only on valid follow-up); never Schedule X / narcotics / psychotropics**. OR **Clinic-routing block** _(if treatment/procedure needed)_ — "see a verified dentist for \_\_\_".
8. **Follow-up guidance** — when to return / escalate / re-assess.
9. **Doctor sign-off** — **doctor name + NMC/State-Council registration number + digital signature** (mandatory; unalterable PDF).
10. **Disclaimer** — scope + emergency-limitations statement (NMC) + "not a substitute for in-person examination where indicated".

- **Charts/tables:** **findings table** + **severity gauge**.
- **Build:** generated as an unalterable signed PDF; delivered in-app + **email/WhatsApp** (NMC: doctor must provide signed Rx/e-Rx via messaging); **stored ≥3 years** (NMC record-keeping); rendering uses the locked fonts (Playwright Chromium pipeline per infra); pharmacy transfer only with explicit patient consent.

---

## B6 — Next-step routing `[APP]`

**Purpose.** Convert the diagnosis into the right next action — honestly, never as an upsell.

### Branches

1. **No procedure needed → medicine in-consult** — summary of prescribed medicines (List O/A) + **safety notes** (interactions/allergies flagged from B2a; link to med-safety M/E5) + how-to-take + when-to-follow-up + download report + WhatsApp it.
2. **Treatment/procedure needed → verified-clinic routing** — nearby **verified clinics** as cards (name, verified badge, distance, rating, "Book") + **map** + "what to ask the dentist" + carry-your-report. (→ Family C profiles / Family D booking.)
3. **Urgent → emergency escalation** — calm "what to do now" + nearest emergency/open clinics + urgent CTA (→ M9).
4. **Always available** — "Ask again", save to records, share, talk-to-support (human handover).

- **Charts/tables:** clinic cards + map; medicine summary list. No graphs.
- **Build:** routing logic respects NMC (medicine vs in-person); neutral framing; clinic data from verified network; deep-links to C/D.

---

## B.research-basis (Part 2)

~100+ sources synthesized, including: AI symptom-assessment/triage UX & accuracy/safety (Ada, K Health, Buoy, Symptomate, Ubie; peer-reviewed accuracy + "triage-not-diagnosis" framing; safety-first calibration; care-navigation-as-upsell risk), conversational-form & chatbot UX (one-question-at-a-time/slot-filling, hybrid chips+free-text+forms, ~30% higher completion, progress indicators, branching, AI-uncertainty visibility, mobile short-prompts, human escalation, stable patterns), digital patient-intake best practices (age/sex/conditions/meds/allergies/chief-complaint, conditional logic, conciseness, no-login-wall, DPDP, structured clinician handoff, dental-anxiety capture), triage severity/urgency models (3–4 level, traffic-light familiarity, label+icon+color), India **NMC Telemedicine Practice Guidelines** (medicine Lists O/A/B + Prohibited/Schedule-X, RMP registration, identity + consent, signed e-Rx via messaging, records ≥3 years, standard-of-care, DPDP timeline), presenting-results/health-literacy (educate→reveal→explain, plain language, uncertainty, follow-up, CDC Diagnostic Excellence), and teledentistry (asynchronous store-and-forward + synchronous, guided photo capture/prep, caries-via-photo validity, WhatsApp delivery, in-person escalation), plus prior research on report-PDF structure, photo-capture UX, voice input, and calm loading/skeleton states. Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## B.interlink verification (Part 2)

- **Entry:** every "Ask Datun" CTA in Family A (header Shell-1, A1 hero/sections, A2/A6) lands on **B1** → flow proceeds B1→B6. ✔
- **Exits:** B6 medicine → med-safety (Family M/E5); B6 clinic-routing → Family C (profiles) + Family D (booking); B4/B6 urgent → **M9 Emergency**; results persist to **E3 records / E4 consult history**; report delivered via **WhatsApp bot (M11)** + email. ✔
- **Compliance interlinks:** consent/identity → **L1 Privacy / L4 Telemedicine consent**; Rx rules → NMC (medicine lists, reg-number, signature, ≥3-yr records); DPDP health-data consent in B2a. ✔
- **Design-system interlinks:** severity gauge = Part 19.8 (radial, label+icon+color, never color-alone); loading skeleton, chips, progress, forms, motion = design tokens/components; voice/a11y = Part 13 + 16.12. ✔
- **Word checks:** "AI" absent (doctor-backed diagnosis); "free" per refined rule (a no-cost reassurance with the funding model is permitted at hesitation points — Design Part 12.5). **Safety:** red-flag escalation present in B2c/B4/B6; human handover reachable; medicine restricted to NMC-permitted lists. ✔
- **No regression to Part 1:** Family A unchanged; B consumes A's CTAs exactly as A specified. (If a later part requires a Part 1/2 change, it will be made explicitly.)

---

---

# PART 3 — FAMILY C: DISCOVERY — DIRECTORY & PROFILES `[BOTH]`

## C.0 — Family principles (the trust-and-find layer)

_This is how a patient finds and chooses a **verified** dentist/clinic — whether they arrive from "Find a Dentist" (Door 2), from a diagnosis that needs a procedure (B6 routing), or from a local/SEO page. It is `[BOTH]`-face: profiles + directory render server-side as public **programmatic SEO/GEO pages** (one per verified dentist/clinic → thousands), and also power the logged-in in-app search/book. Research-locked rules:_

- **Verification is the product.** Datun's moat = every listed dentist/clinic is verified. The **verified badge** + transparent credentials are the headline trust signal on every card and profile (this is what generic directories like JustDial/Practo can't match on trust).
- **Search-before-book is the default behaviour** (72% of Indian patients research first; 3–5 pages pre-booking; 84–90% read reviews, most read 5+). So discovery must be fast, reassuring, and information-rich.
- **Real-time availability + book-without-calling** is the biggest conversion lever (removing the phone call; 20–30% more requests; "book at 10 PM"). Availability shows in cards and profiles; booking is one tap → Family D.
- **Relevance/verification ranking, NOT pay-to-rank.** To protect the trust brand, default ordering is relevance + proximity + rating + verification — never paid placement that undermines the verification promise. If a promoted slot is ever introduced, it must be clearly labelled and still meet the patient's filters. (No promotional "free" shout — "free" per the refined rule, Design Part 12.5; no "AI" word.)
- **Guided matching** (optional): from the diagnosis (B6) or a "help me choose" questionnaire, surface matched verified dentists (treatment-aware) → reduces wrong-fit bookings (+~14% booking). Free-text/manual search always remains.
- **Anxiety-aware & warm** (36% avoid care from anxiety); real photography (no stock); plain language; profiles answer the patient's 3 questions — _Is this dentist qualified? Are they human? Will I be comfortable?_
- **Mobile-first** (68–75% mobile): bottom-sheet filters, sticky "Book" CTA, large tap targets, <2–3s load (53% abandon >3s), map↔list toggle.
- **Local + GEO:** NAP consistency, `Dentist`/`Physician`/`MedicalBusiness` + `aggregateRating` + `Breadcrumb` JSON-LD; local-pack signals (relevance/distance/prominence); profiles are entity pages cited by AI.
- **DPDP + India ad-compliance:** reviews are genuine + consented (ASCI code + NMC — no misleading medical claims, no PHI in responses); patient data handled per DPDP.

**Discovery flow / entry points:** "Find a Dentist" (Shell-1 header, A1 Door 2) → **C1 Directory**; B6 procedure-routing → matched verified clinics (C2/C3); local/SEO pages (Family H) → C2/C3; every profile → **Book** (Family D). Doctor profile carries a **Q&A-answers tab** (→ Family O).

---

## C1 — Directory / Find a Dentist `[BOTH]`

**Purpose.** Match patient need → the right **verified** provider → action (book/ask), fast and reassuringly.

### C1a — Search bar + autocomplete

- **Search by** treatment ("root canal"), dentist name, clinic, or location/area — one smart bar.
- **NLP autocomplete:** 5–8 suggestions (top 3 most relevant), **typo-tolerant**, natural-language, drawn from popular queries + treatment taxonomy + provider/clinic names + location synonyms; ranked by relevance + popularity; debounced. **Recent searches** for returning users. (Autocomplete saves ~2–3s/query.)
- **Build:** search bar present across discovery; queries map to treatment taxonomy (ties to Family F/G entities).

### C1b — Filters (faceted)

- **Filters (decided set):** treatment/service · location/area · distance/radius · gender · language · rating · availability (today/this week) · accepting-new · fees-range · **verified-only** (default on).
- **Logic:** OR within a facet, AND across facets; **result counts** next to options; top options + "show more" for long lists.
- **Desktop:** persistent left sidebar, **real-time** updates. **Mobile:** **bottom-sheet/full-screen drawer**, sticky "Filter & Sort" button with **count ("Filters (3)")**, explicit **"Show X results" apply** (no jarring mid-interaction refresh). **Active-filter chips** above results (each ✕; chip removal = instant; "Clear all" always present).
- **A11y:** keyboard-operable, focus management in drawer, screen-reader labels, tap-friendly.
- **SEO:** canonical to the unfiltered directory; noindex filter-combination URLs (avoid crawl-budget waste).

### C1c — Provider/clinic cards

- **Each card:** photo · name · **verified badge** · specialty/key services · rating + review count · location/area + **distance** · fees indicator · **next available slot** · primary **"Book"** + secondary "View profile". Warm, scannable, real photo.

### C1d — Map view ↔ list toggle + geolocation

- **Toggle** between list (detailed cards) and **map** (pins by proximity, tap pin → mini-card → book). **Geolocation "near me"** (with permission) or manual city/area/zip + **radius**; adjustable location shown under the search bar; distance on every result.

### C1e — Sort, pagination, guided matching

- **Sort:** relevance (default) · rating · distance · earliest-availability. **Pagination/infinite-scroll** with stable performance. **Result count** + active filters always visible.
- **Guided matching (optional):** "Help me choose" mini-questionnaire (or arriving from B6 diagnosis) → treatment-aware matched verified dentists, with transparency on why they appear; free-text/manual always available.
- **Charts/tables:** map; no graphs/tables.
- **Build:** `[BOTH]`; SSR for the public directory; relevance ranking (not pay-to-rank); deep-links to C2/C3 + Family D.

---

## C2 — Doctor profile `[BOTH]` _(programmatic — 1 per verified dentist → thousands)_

**Purpose.** Convert a researching patient by answering _qualified? human? comfortable?_ and enabling one-tap booking.

### Sections

1. **Header block** — professional **headshot** (no stock) · full name · **verified badge** · specialty + sub-specialties · rating + review count · area/location · **languages** · accepting-new status.
2. **Sticky "Book" CTA** (mobile-sticky, contrasting) + **next-available slot** → Family D. Secondary: "Ask a question" / share.
3. **Credentials** — qualifications (**BDS/MDS**), **registration/council number**, years of experience, training/education. (The accountability + E-E-A-T anchor.)
4. **About / bio + philosophy of care** — plain language, warm, gives a sense of the person.
5. **Services offered** — treatments/conditions handled (link to Family F/G), with fees where available.
6. **Clinic(s) & location** — clinic(s) this dentist practices at (link C3) · **map + directions** · hours.
7. **Reviews** — overall rating + **breakdown** + individual verified-patient reviews (see C5).
8. **Q&A answers tab** — this dentist's answers in Datun Answers (→ **Family O**) — credibility + funnel.
9. **Related/nearby dentists** — alternatives.

- **Charts/tables:** optional **rating-distribution bar**; no tables.
- **Build:** SSR; `Physician` + `aggregateRating` + `Breadcrumb` JSON-LD; NAP-consistent; unique non-thin content per profile; entity page for GEO (AI-cited). Booking → Family D; verification status sourced from the verified-clinic system.

---

## C3 — Clinic profile `[BOTH]` _(programmatic — 1 per verified clinic → thousands)_

**Purpose.** Convert at the clinic level + carry the price-transparency that builds trust.

### Sections

1. **Header** — clinic name · **verified badge** · rating + reviews · area/location · hero photo.
2. **Photo gallery** — real clinic photos (exterior/interior/operatory) — builds confidence (treatment-in-action with consent).
3. **Sticky "Book" CTA** + next availability → Family D.
4. **Services + price list** — **services/price table** (treatment → indicative price/range) — honest cost transparency (the consult is never priced, but treatment-cost transparency is on-brand; cost via ranges, no "free" price-claim — refined rule, Design Part 12.5).
5. **Dentists at this clinic** — cards linking to C2.
6. **Hours · location + map + directions · contact · amenities** (parking, wheelchair access, languages, payment options).
7. **Reviews** — overall + breakdown + verified reviews (C5).

- **Charts/tables:** **services/price table**; map.
- **Build:** SSR; `Dentist`/`MedicalBusiness` + `aggregateRating` + geo/NAP + `Breadcrumb` JSON-LD; local-pack-optimized; booking → Family D.

---

## C4 — Search results `[BOTH]`

**Purpose.** Present filtered matches clearly; never dead-end.

### Sections/features

- **Filtered list/grid** of cards (C1c) · **result count** · **sort** · **active-filter chips** · map toggle.
- **Pagination/infinite-scroll** (stable, fast <3s).
- **Empty / no-results state (research: never a dead end):** explain + offer recovery — widen filters, nearby areas, related treatments, popular/ top-rated verified dentists, or "Ask Datun" as an alternative path.
- **Save-search** (logged-in) + **shortlist/favorite providers** (logged-in) for later comparison.
- **Charts/tables:** map; none else.
- **Build:** `[BOTH]`; SSR for indexable result/category pages where appropriate; a11y.

---

## C5 — Reviews (aggregate, per provider/clinic) `[BOTH]`

**Purpose.** Authentic social proof that drives confident booking + feeds GEO.

### Sections/features

1. **Overall rating** + total count.
2. **Rating breakdown** — distribution **bar** (5→1 star) + optional sub-ratings (e.g., bedside manner, cleanliness, wait time).
3. **Individual reviews** — **verified-patient badge** (only patients who actually had a consult/appointment can review — anti-fake) · date · treatment/visit type · review text · **helpful vote** · **report**.
4. **Provider/clinic response** — DPDP-careful, never revealing PHI; professional, timely (templated-compliant).
5. **Write a review** — **post-visit, verified only**; star + optional sub-ratings + text; requested via WhatsApp/SMS post-visit (higher conversion from the known number); catch unhappy feedback privately first to resolve before public.
6. **Sort/filter reviews** — most recent / most helpful / by treatment.

- **Charts/tables:** **rating-distribution bar** (+ optional sub-rating bars).
- **Build:** `Review` + `aggregateRating` JSON-LD (GEO; feeds AI Overviews via volume/sentiment/recency); **verified-only** collection (anti-fake); moderation (report + ML/human); **India ASCI + NMC compliant** (genuine, consented, no misleading medical claims, no PHI); recency surfaced.

---

## C.research-basis (Part 3)

~100+ sources synthesized, including: healthcare provider-directory & marketplace UX (Zocdoc, Practo, Healthgrades, Kyruus; real-time booking-in-search, guided search +14%, visit-reason/treatment search, relevance-vs-pay-to-rank, NAP/local visibility, 77% start on Google, abandonment if availability unclear), faceted-search & filter UX (Baymard/UXPin/Airbnb/Amazon patterns: desktop real-time vs mobile bottom-sheet + "Show X" apply, active-filter chips, result counts, OR/AND logic, SEO canonical/noindex, a11y), doctor/provider profile anatomy & conversion (qualified/human/comfortable, headshot-not-stock, credentials, sticky book CTA, reviews above fold, mobile-first, thin-page risk), reviews/ratings systems (84–90% read reviews; verified-patient anti-fake; collection via WhatsApp/SMS; provider responses; aggregateRating/Review schema; AI-Overview influence; operational-insight + unhappy-first capture; India ASCI/NMC + DPDP compliance), search UX (NLP autocomplete 5–8/typo-tolerant/recent searches, no-results recovery, sort, speed <3s, faceted +50% satisfaction), and maps/local/compare/save (map↔list toggle, geolocation "near me"/radius, directions, local-pack relevance/distance/prominence, compare, shortlist/saved-search). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## C.interlink verification (Part 3)

- **Entries:** "Find a Dentist" (Shell-1 header + A1 Door 2) → **C1**; **B6** procedure-routing → matched verified clinics (C2/C3); local/SEO pages (**Family H**) → C2/C3; "Ask Datun" alternative offered in C4 empty-state → **B1**. ✔
- **Exits:** every card/profile **"Book"** → **Family D** (booking); C2 services / C3 price-table link to **Family F/G** (treatments/costs); C2 **Q&A-answers tab → Family O**; reviews collection requested via **WhatsApp (M11)/SMS** post-visit (ties to Family D appointment + Family E records). ✔
- **Trust/verification interlink:** verified badge + credentials sourced from the verified-clinic system (the moat described in A3/J1); reviews verified-patient-only (anti-fake). ✔
- **Design-system interlinks:** cards, chips, filter drawer, sticky CTA, rating bars, map, skeleton/loading, sort, pagination = design tokens/components; rating-distribution bar follows Part 19 data-viz (honest, label+color). ✔
- **Compliance:** reviews ASCI+NMC+DPDP-compliant (genuine/consented/no-PHI/no-misleading-claims); programmatic profiles non-thin + NAP-consistent; ranking relevance-based (not pay-to-rank). ✔
- **Word checks:** "AI" absent (doctor-backed); "free" per refined rule (price transparency uses ranges, no "free" price-claim — Design Part 12.5). **No regression to Parts 1–2:** A's "Find a Dentist" and B6's clinic-routing land exactly as specified. ✔

---

---

# PART 4 — FAMILY D: BOOKING & APPOINTMENTS `[APP]`

## D.0 — Family principles (turn intent into a kept appointment)

_This converts a chosen verified dentist/clinic (from C2/C3, or B6 routing) into a confirmed visit — in-clinic or teleconsult — and keeps it kept. `[APP]`-face. Research-locked rules:_

- **Self-scheduling is a no-show weapon, not just convenience.** Patients who pick their own slot show up far more (online ~1.8% vs staff-booked ~5.9% no-show). Book-without-calling is the core promise.
- **Real-time availability** shown honestly; never offer a slot that isn't bookable. Booking writes back to the clinic's calendar (no double-booking).
- **Frictionless reschedule > cancel > no-show.** One-tap reschedule turns a conflict into a moved appointment (self-service rescheduling cuts cancellations ~30%, flips the cancel:no-show ratio). Make rescheduling effortless everywhere (confirmation, reminders, manage screen).
- **Layered, interactive reminders** (the optimal ~4 touchpoints; more annoys): confirmation → 24h → morning-of → join-time(teleconsult)/visit-day. Every reminder lets the patient confirm/reschedule/cancel in one tap. Channels: **WhatsApp (India-primary) + SMS + push + email** (Datun's approved WhatsApp templates: appointment_reminder, consultation_complete, 3-day/7-day follow-ups).
- **Capture mobile + email up front** (feeds the reminder cadence) — but minimal friction (prefill if logged-in; no heavy login wall).
- **Calm, anxiety-aware** (dental anxiety): reassuring confirmation, clear "what to expect / what to bring", non-punitive policy, supportive copy. No "AI" word; "free" per the refined rule (Design Part 12.5).
- **Visit-type first-class:** in-clinic and **teleconsult** live in one flow/calendar (not separate systems).
- **Mobile-first:** tappable slot tiles/chips (not native spin-pickers), sticky CTAs, big tap targets, <2–3s; timezone-aware (IST default; multi-tz for tourism/NRI).
- **NMC + DPDP compliant:** teleconsult identity + consent; signed e-Rx post-visit; records ≥3 years; PHI never exposed in SMS; encryption.
- **Continuity:** every appointment drives a clear next step (post-visit summary, report/Rx, follow-up, review request, saved to records).

**Booking flow / entry points:** C2/C3 "Book" or B6 clinic-routing → **D1 select slot** → **D2 details & confirm** → **D3 confirmation (+.ics)** → reminders (**D6**) → visit/join (**D5** teleconsult or in-clinic) → post-visit follow-up (**D6**) → review request (→ C5) + saved to records (→ E3/E6). Manage/reschedule/cancel anytime (**D4**).

---

## D1 — Booking: select slot `[APP]`

**Purpose.** Let the patient pick a real, available time, fast and clearly.

### Sections/features

1. **Provider/clinic context** — who/where they're booking (photo, name, verified badge, location/area), carried from C2/C3.
2. **Visit-type toggle** — **in-clinic** vs **teleconsult** (clear difference + what each suits). One flow.
3. **Date selection** — quick shortcuts (Today / Tomorrow / This week) + calendar; **past + unavailable days disabled**; "earliest available" shortcut.
4. **Slot picker** — **time-of-day grouped tiles/chips** (Morning / Afternoon / Evening), available vs booked visible, **next-available highlighted**; tappable (no native spin-pickers).
5. **Timezone-aware** — IST default; show timezone where relevant (tourism/NRI multi-tz); store UTC/ISO.
6. **Waitlist / "Notify me"** — if preferred slot/day is full, join waitlist or get notified on cancellation (backfills gaps).

- **Charts/tables:** none (calendar/slot grid).
- **Build:** real-time availability from clinic calendar (no double-book); a11y keyboard nav (arrows skip unavailable, Enter→slots); resumable; → D2.

---

## D2 — Booking: details & confirm `[APP]`

**Purpose.** Capture the minimum needed + a clear review, with least friction.

### Sections/features

1. **Patient details** — **prefilled if logged-in**; else minimal (name, mobile, email — captured for reminders); family-member selector (book for self/dependent, → E8).
2. **Reason / notes** — short free-text + optional attach (carry diagnosis/report from B6).
3. **Form UX** — **single-column, validate-on-blur**, large touch targets, clear labels, minimal required fields, inline errors.
4. **Consent** — appointment + (for teleconsult) telemedicine consent + DPDP data consent (→ L1/L4).
5. **Review summary** — provider, visit-type, date/time, location/fees (honest; no "free" price-claim — refined rule), policy snippet (cancellation/reschedule) shown _before_ confirming (don't surprise later).
6. **Confirm CTA** — single primary action.

- **Charts/tables:** none.
- **Build:** prefill from account; payment/deposit only if a clinic requires it (proportional, optional — not default; consult stays unpriced-of-friction); → D3.

---

## D3 — Booking confirmation `[APP]`

**Purpose.** Instant reassurance + everything the patient needs to show up.

### Sections/features

1. **Instant success state** — clear "You're booked" + appointment summary (provider, visit-type, **date/time**, location + **map/directions**, fees if any).
2. **Add to calendar** — **.ics download + Google/Apple/Outlook one-click links** (confirmation details embedded in the event).
3. **Pre-visit instructions / what to bring** — visit-type-specific (in-clinic: arrive 10 min early, bring report/ID; teleconsult: good light, quiet, brush first, test connection; carry-your-Datun-report if from B6).
4. **Manage actions** — **one-tap reschedule / cancel** (policy shown), directions, "add to records".
5. **Confirm-attendance** prompt (tap to confirm) — reduces no-shows.
6. **Multi-channel delivery** — in-app + **WhatsApp** (concise: date/time/provider/location) + **email** (full details + .ics + reschedule) fired instantly. SMS fallback. (No PHI in SMS.)

- **Charts/tables:** map only.
- **Build:** triggers reminder cadence (D6); WhatsApp via approved templates (M11); DPDP-safe message content; → D4/D5/D6.

---

## D4 — Appointment detail / manage `[APP]`

**Purpose.** A single place to see and change any appointment.

### Sections/features

1. **Upcoming + past lists** — status badges (confirmed / pending / completed / cancelled / no-show); filters.
2. **Detail view** — full summary + map/directions + provider link (C2/C3) + attached report/notes.
3. **Reschedule** — one-tap → real-time availability (D1 picker), no call; instant new confirmation.
4. **Cancel** — with **fair, pre-shown policy** (timeline + any consequence; consistent; grace for first-time); frees slot to waitlist.
5. **Join teleconsult** — single-tap → D5 (active near start time).
6. **Re-book / book follow-up** — quick path; **directions** for in-clinic.

- **Charts/tables:** list/status table.
- **Build:** mirrors **E6 Appointments** (same data, different surface); calendar-sync; double-book prevention; → D1/D5.

---

## D5 — Teleconsult / video room `[APP]`

**Purpose.** A calm, reliable, NMC-compliant virtual visit that ends in a clear next step.

### Sub-flow & features

**D5a — Pre-call check** — join link active ~15 min before; **camera/mic permission** ("Allow"); **connectivity/device test** (camera, mic, network signal); set display name, **blur background**, choose audio/video device; environment tips (light/quiet).
**D5b — Virtual waiting room** _(anxiety-reduction, not just technical)_ — **queue position + estimated wait**; **complete consent/intake while waiting** (productive wait reduces perceived time); notification when the dentist is ready.
**D5c — In-call** — controls **visible but not dominant**: mute, camera toggle, **connection-strength indicator**, more-options (switch device, blur, full-screen/grid), **end call**. **Show-mouth/tooth via camera**; **photo/document share** (send X-ray/photo); **in-call chat**. Landscape supported. **Low-bandwidth resilient** (lightweight, low-latency; graceful degradation on weak 4G).
**D5d — Post-call** _(continuity — else adherence drops)_ — **post-visit summary** + (if prescribed) **NMC-signed e-Rx/report** delivered (in-app + WhatsApp/email) + **follow-up scheduling** + **review request** (→ C5) + **saved to records** (→ E3/E4/E6).

- **Charts/tables:** none.
- **Build:** E2E-encrypted, DPDP/NMC-compliant (identity + consent + record-keeping ≥3 yrs); single-tap join from reminder/D4; resilient on Indian mobile networks; recording only with explicit consent.

---

## D6 — Reminders, follow-up & no-show system `[APP]` _(connective system)_

**Purpose.** Keep appointments kept and close the loop after.

### Features

1. **Layered reminder cadence (~4 touchpoints):** instant confirmation → **24h before** → **morning-of** → **join-time (teleconsult) / visit-day**. (More than ~4 annoys → +cancellations.) Channels: **WhatsApp (primary) + SMS + push + email**.
2. **Interactive** — every reminder offers **confirm / reschedule / cancel in one tap** (self-service rescheduling cuts cancellations ~30%).
3. **Waitlist auto-fill** — a cancellation auto-offers the slot to the next waitlisted patient.
4. **Post-visit follow-up** — thank-you + **review request** (→ C5, post-visit verified) + care instructions + re-book/recall prompt (Datun WhatsApp follow-up templates: 3-day/7-day) + "view your report/records".
5. **No-show handling** — gentle re-engagement + easy re-book; track patterns (ops insight); fair policy applied consistently.

- **Charts/tables:** none (patient-facing); ops analytics out of patient scope.
- **Build:** WhatsApp approved templates (M11) + MSG91 SMS + push; DPDP opt-in/consent stored; PHI-safe content; ties to D3/D4/D5, C5, E5/E6.

---

## D.research-basis (Part 4)

~100+ sources synthesized, including: healthcare self-scheduling & no-show research (online 1.8% vs staff 5.9% no-show; capture-contact-upfront; tap-reschedule; Zocdoc/Calendly/MediBuddy/PracticeSuite patterns; waitlist/first-available), date-time/slot-picker UX (time-range-first, tappable tiles vs painful native spin-pickers, time-of-day grouping, next-available auto-highlight, timezone/DST handling, WCAG keyboard nav, min/max validation), booking confirmation & .ics (instant confirmation, SMS+email roles, .ics + Google/Apple/Outlook links, pre-visit instructions, one-tap reschedule, confirm-attendance, reschedule re-confirmation, DPDP-safe SMS), telehealth video-visit UX (pre-call permission + connectivity test, virtual waiting room as anxiety-reduction with queue/ETA + productive wait, visible-not-dominant in-call controls + signal indicator + photo/doc share + chat, low-bandwidth resilience + landscape, post-call summary + e-Rx + follow-up + records, E2E/HIPAA-DPDP), reschedule/cancel & reminders (optimal ~4 touchpoints, interactive confirm/reschedule/cancel, self-service rescheduling cuts cancellations ~30%, fair non-punitive policy communicated at booking+confirmation+reminders, deposits proportional/optional, waitlist auto-fill, double-booking prevention), plus prior research on form UX (single-column/validate-on-blur/prefill), WhatsApp (500M India / 98% open / approved templates / human handover), and calendar integration. Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## D.interlink verification (Part 4)

- **Entries:** C2/C3 **"Book"** → **D1**; **B6** clinic-routing → C2/C3 → D1; "book follow-up" from D5d/D6 → D1. ✔
- **Exits:** D5d/D6 **review request → C5** (post-visit verified); appointment data **mirrors E6 Appointments**; report/Rx saved to **E3 records / E4 consult history**; medicine safety notes → **E5/Family M**; reminders/follow-ups via **WhatsApp (M11)** + SMS + push + email; urgent emergency routing → **M9**. ✔
- **Consult interlink:** D5 teleconsult shares the diagnosis/report pipeline with **Family B** (post-call e-Rx follows the same NMC-signed, ≥3-yr-record rules as B5); carry-your-report from **B6**. ✔
- **Design-system interlinks:** slot tiles/chips, calendar, sticky CTA, status badges, forms, skeleton/loading, in-call controls, toasts = design tokens/components; a11y per Part 13. ✔
- **Compliance:** teleconsult identity + telemedicine + DPDP consent (L4/L1); e-Rx NMC-compliant; records ≥3 yrs; PHI-safe messaging; cancellation policy fair + pre-disclosed. ✔
- **Word checks:** "AI" absent (doctor-backed); "free" per refined rule (fees shown honestly, no "free" price-claim — Design Part 12.5). **No regression to Parts 1–3:** C's "Book" and B6's routing land exactly as specified; reviews loop uses C5 as defined. ✔

---

---

# PART 5 — FAMILY E: ACCOUNT & HEALTH-DATA `[APP]`

## E.0 — Family principles (the logged-in app = the relationship layer)

_This is where a one-time visitor becomes a returning patient with a home, a history, and a sense of progress. It is the **APP-face** (app-shell + bottom tab-bar + offline + push). The biggest family (10 screens). Research-locked rules:_

- **Progressive-disclosure masterclass.** Surface the single most actionable thing first; keep everything else one tap away; never overwhelm an anxious user. Dashboards are **proactive decision tools** (recommended next step), not raw chart dumps.
- **3-taps-or-less** to any common task (view report, book, ask, refill/meds, records).
- **Actionable-first + anxiety-aware** (dental fear is real): calm, encouraging, plain-language; reassuring loading/success states; warmth not clinical coldness.
- **Personalized surfacing:** after a diagnosis → relevant condition education; after a prescription → drug info + safety; after a visit → review prompt. Not a generic library.
- **Honest, never over-claiming:** the Oral Health Score and insights are **wellness indicators with doctor-backed context**, never a diagnosis substitute. **No "AI" word; "free" per the refined rule (Design Part 12.5).** Insights feel _caring, not surveilling_.
- **Dignified light gamification:** progress, streaks, improvement framing — to aid adherence and return, but healthcare-grade dignified (not childish).
- **Mobile thumb-first** (70%+ usage): 44px/48dp targets, bottom-tab reach, offline read of records, push.
- **Privacy-by-design + DPDP:** health data is sensitive; explicit purpose-specific consent; encryption; minimization; **self-service view/export/delete + granular consent withdrawal**; access-logs; child-data parental consent. DPDP data-principal rights live by **May 14, 2027**.
- **Cold-start (new user, no data):** every screen has a warm empty-state that guides to the first action (usually "Ask Datun" → B1, or "Find a Dentist" → C1).
- **Continuity:** records/score/history are the connective memory that makes B (consult) and D (booking) feel personal.

**Account map / entry points:** bottom tab-bar (Home/E1 · Find/C · Records/E3 · Profile/E8 + a persistent "Ask Datun"/B1) → all E screens. Results from B4/B6 + D5d flow into **E3/E4**; prescriptions into **E5**; appointments mirror **D4** in **E6**.

---

## E1 — Dashboard / Home (logged-in) `[APP]`

**Purpose.** "What should I do about my dental health right now?" — answered in one glance.

### Sections/features

1. **Greeting** (name; warm, time-aware) + profile/notification access (bell with badge → E9).
2. **Oral Health Score (compact)** — small **ring** + zone label, tap → E2.
3. **Next appointment** card (date/time, provider, join/manage) → D4/D5; or "Book a check-up" if none.
4. **Single contextual recommended action** — one thing (e.g., "Finish your antibiotic course", "Your report is ready", "It's been 6 months — time for a check-up"). Not a wall of alerts.
5. **Recent activity** — last consult/report/appointment (tap → E4/E3/E6).
6. **Quick "Ask Datun"** — always one tap → B1.
7. **Shortcuts** — Records (E3), Medicines (E5), Find a Dentist (C1).

- **Charts/tables:** **health-score ring** + **KPI stat-cards with sparklines** (Design Part 19.8/19.9) — e.g., consults count, next-visit countdown, score trend spark.
- **Build:** progressive-disclosure; personalized surfacing; **cold-start empty-state** (no data → "Start with Ask Datun"); offline-cached; a11y; → B1/C1/E2/E3/E4/E5/E6/D4.

---

## E2 — Oral Health Score `[APP]`

**Purpose.** The signature, honest, improvable metric — "how's my dental health, and how do I improve it?"

### Sections/features

1. **Big score + zone label** — **radial ring** (number + zones; **never color-alone** — label + icon + position; green good / amber attention / red urgent, always labelled).
2. **What drives it** — explainable factors list (e.g., recent symptoms, last check-up recency, reported habits, open issues) — never a black box.
3. **How to improve** — concrete actions (book a check-up, ask about a symptom, habit nudges) → deep-link to B1/C1.
4. **History** — **score-over-time line** (trend; "slightly better than last month" framing).

- **Charts/tables:** **radial ring + score-over-time line + factors list** (Design Part 19.8).
- **Build:** honest wellness-indicator framing (doctor-backed context, **not** a diagnosis substitute; no "AI"); encouraging/empowering plain-language; avoid overcomplication (few trusted drivers); a11y (number+label, not color-only); → B1/C1.

---

## E3 — Health records `[APP]`

**Purpose.** The patient-controlled home for everything about their dental health (PHR).

### Sections/features

1. **Past diagnoses** + **downloadable PDF reports** (from B4/B6/D5d) — view/download/share.
2. **Uploaded photos** (from B2d/consults) — gallery.
3. **Allergies · current conditions · medications** (from B2a intake; the clinically-critical, emergency-relevant set).
4. **Search / filter** (by type, date, provider).
5. **Upload** — add external documents/photos (consent on upload, DPDP, encrypted).
6. **Share** — controlled, consent-based sharing (e.g., to a dentist) — patient decides who sees what.
7. **Export** — DPDP data portability (download all records).
8. **Access log** — "who/which clinic viewed your records, when" (DPDP transparency + trust).

- **Charts/tables:** records **list/table** (+ timeline grouping).
- **Build:** patient-controlled PHR; encrypted; **emergency-critical info (allergies/meds/conditions) surfaced for M9**; consent-based share; DPDP export + access-log; receives B4/B6/D5d outputs; → M9/E5.

---

## E4 — Consultation history `[APP]`

**Purpose.** The story of every Datun consult, re-openable.

### Sections/features

1. **Chronological timeline** of past consults (date, chief complaint, diagnosis summary, severity, linked report).
2. **Linked reports** — tap → the PDF (E3).
3. **Re-open / re-ask** — "ask a follow-up about this" → B1 with context (continuity).

- **Charts/tables:** timeline (list).
- **Build:** receives B4/B6 results + D5d teleconsult summaries; re-ask carries context to B1; → B1/E3.

---

## E5 — Medications / Prescriptions `[APP]`

**Purpose.** Help patients take medicines correctly + safely (mostly short dental courses).

### Sections/features

1. **Current + past medications** (from B6 medicine-in-consult + D5d e-Rx) — name, what-it's-for, dosage/schedule, duration.
2. **Reminders (opt-in)** — dose reminders for the course (WhatsApp/push); honest, not nagging.
3. **Course-completion / adherence tracking** — mark-as-taken; gentle **completion** focus (esp. antibiotics — finish the course); **adherence chart**.
4. **Refill / follow-up prompt** — when relevant.
5. **Safety notes** — interactions/allergies flagged (from B2a) + how-to-take + side-effects to watch → **link to Family M med-safety**.
6. **Plain education** — what each medicine does, in everyday words.

- **Charts/tables:** **adherence chart + meds table** (Design Part 19).
- **Build:** ties to **B6 medicine + Family M med-safety**; reminders opt-in (DPDP consent); short-course framing (not chronic over-medicalizing); → Family M.

---

## E6 — Appointments (history + upcoming) `[APP]`

**Purpose.** The patient-account surface of all appointments (mirrors D4).

### Sections/features

- **Upcoming + past list** with **status badges** (confirmed/completed/cancelled/no-show) · filters · detail → D4 · **re-book** · **cancel/reschedule** (D4 flows) · join-teleconsult (D5).
- **Charts/tables:** list/**table**.
- **Build:** **mirrors D4** (same data, account surface); → D1/D4/D5.

---

## E7 — Patterns / Oral-health insights `[APP]`

**Purpose.** Gentle, plain-language trends that help — without alarming.

### Sections/features

1. **Trends over time** — recurring symptoms, score trajectory, reported habits.
2. **Plain-language insight cards** — "Your gums seem to be improving since last visit", "Sensitivity has come up 3 times — worth a check-up." Supportive; **never alarming; never "AI."**
3. **Gentle prompts** — book a check-up / Ask Datun (→ B1/C1).

- **Charts/tables:** **line/bar trends** + optional **heatmap** (sparingly).
- **Build:** honest (supplement, not replacement; doctor-backed context); feels _understood, not surveilled_; opt-in; → B1/C1.

---

## E8 — Profile / Account + family members `[APP]`

**Purpose.** Personal + clinical identity, and the whole family's care in one place.

### Sections/features

1. **Personal info** — name, DOB, sex, contact, photo (editable; single-column forms, validate-on-blur).
2. **Medical/dental history** — conditions, allergies, current meds (the B2a set; reused as consult prefill).
3. **Family members / dependent sub-profiles** — add self + children + parents + spouse; **switch profile / book-on-behalf** (ties **D2 family-member selector**); each dependent has own records/score/meds.
   - **Age-based access transitions + DPDP child-data:** minors (<18) require **verifiable parental consent**; profiling/targeted-ads of minors **prohibited**; access auto-transitions as the dependent reaches adulthood (configurable, revocable, granular).
4. **Preferences** — quick links to settings.

- **Charts/tables:** none.
- **Build:** single-column forms; family-profile relationships + granular permissions + **DPDP parental-consent + age-transition**; prefill source for B2a/D2; → D2/E10.

---

## E9 — Notifications center `[APP]`

**Purpose.** A calm inbox of what's happened — distinct from the preference controls (E10).

### Sections/features

1. **Inbox** of alerts/reminders/tips/results — **read/unread** + **badge counter** (synced across devices).
2. **Filter by type** (appointments, reports/results, medicines, tips, account/security).
3. **Mark read/unread; swipe to mute a category** (→ E10).
4. **Empty-state** — warm, "you're all caught up."

- **Charts/tables:** none.
- **Build:** inbox = past messages (vs E10 = future behavior); searchable; offline-cached; per-type quick controls deep-link → E10.

---

## E10 — Settings `[APP]`

**Purpose.** Control + trust — including DPDP self-service (the compliance + trust differentiator).

### Grouped categories (4–7 top-level + settings search)

1. **Account / Profile** — edit info, password/PIN, 2FA, linked devices.
2. **Privacy & Data (DPDP self-service)** — _the substantial sub-system:_
   - **Consent dashboard** — view every consent; **granular toggle/withdraw anytime**; real-time effect; withdrawal of one consent doesn't break unrelated services.
   - **Your data rights (self-service)** — **view/access** all your data; **correct**; **export/download (portability)**; **delete/erase account + data**.
   - **Privacy notice** — layered, plain-language, **multilingual** (incl. audio/video option for low-literacy users).
   - **Access log** — who/which clinic viewed your records, when.
   - **Grievance** — tracking-ID + **DPO contact** + status updates (→ **L5**).
   - **Child-data** — parental-consent controls; no profiling of minors.
3. **Notifications (preference center)** — **per-category × per-channel** (in-app/push/**WhatsApp**/SMS/email) **× frequency** (real-time/daily-digest/weekly) + **quiet-hours/DND** (TRAI-DND + DPDP consent) + transactional-vs-promotional separation.
4. **Appearance** — theme (**light/dark/high-contrast**).
5. **Language** — **10 locales**.
6. **Linked services** — **WhatsApp** link/unlink.
7. **Help & Support** — FAQ, contact, talk-to-human.
8. **About** — version, legal links (L-family).

- **Logout + Delete account** — tucked at the **end** (destructive, rarely used). Important consent/policy-change reviews surfaced to top.
- **Charts/tables:** none.
- **Build:** card-sorted IA; settings search; status/security indicators; **DPDP rights enforced real-time (API-broadcast)**; ties **L1 Privacy / L4 Telemedicine consent / L5 Grievance / L9**; DPDP-ready by May 2027.

---

## E.research-basis (Part 5)

~100+ sources synthesized (the largest pass — every screen + sub-feature researched), including: patient-portal & health-dashboard UX (progressive disclosure / actionable-first / 3-taps / proactive-decision-tools / mobile-thumb-first / personalized surfacing / dignified gamification / real-time reassurance / cold-start empty-states), health-score & gauge design (radial ring for single-metric, track-trends-not-snapshots, avoid overcomplication, never-color-alone for ~8% colorblind, explainable drivers, encouraging anxiety-reducing framing, honest non-diagnosis), PHR / medical-records management (patient-controlled vs institution-EHR, portability + controlled sharing, emergency-critical info, allergies/meds/conditions, DPDP export, access-log), medication adherence (WHO ~50% non-adherence + barriers, reminders + education + interaction/duplication checks, short-dental-course framing, MTM personal-medication-record), health insights/patterns (gentle contextual nudges → 3× engagement, supportive microcopy "understood not surveilled," honest supplement-not-replacement, restrained viz), family/dependent proxy profiles (configurable relationships + granular permissions + audit-logging + age-based access transitions + book-on-behalf + DPDP verifiable parental consent + no child profiling), notifications (inbox vs preference-center, granular per-category/channel/frequency, transactional-vs-promotional, quiet-hours/DND, fatigue = #1 uninstall, empty-states), settings IA (4–7 grouped categories + search + visual hierarchy + destructive-at-end + card-sort), and India **DPDP Act 2023 / DPDP Rules 2025** (consent as primary basis, plain-language layered notice, withdrawal-as-easy-as-giving via consent dashboard + real-time cessation, data-principal rights access/correct/erase/portability, grievance + DPO, child <18 verifiable parental consent + profiling prohibition, SDF obligations, **rights live May 14 2027**). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## E.interlink verification (Part 5)

- **Entries:** bottom tab-bar (Home/Find/Records/Profile + Ask Datun); from B4/B6 (results → E3/E4), D5d (teleconsult summary/e-Rx → E3/E4/E5), D3/D4 (appointments → E6). ✔
- **Exits:** E1/E2/E4/E7 "Ask Datun" / "Find a Dentist" → **B1 / C1**; E5 safety notes → **Family M med-safety**; E3 emergency-critical info → **M9**; E6 mirrors **D4** (re-book/reschedule → D1/D5); E8 family-selector → **D2**; E10 DPDP self-service → **L1/L4/L5/L9**. ✔
- **Data-flow integrity:** E3 records + E4 history + E5 meds are the persistence layer written by B + D; E2 score + E7 patterns derive from this history; E6 = D4 mirror (single source of truth). ✔
- **Design-system interlinks:** ring + KPI sparkline cards + line/bar trends follow **Design Part 19.8/19.9**; lists/tables, badges, toggles, forms, bottom-tab app-shell, skeleton/empty-states = tokens/components; a11y per Part 13. ✔
- **Compliance:** DPDP self-service (consent dashboard + access/correct/export/erase + grievance + access-log + child parental-consent) maps to L1/L4/L5; health-data encrypted + minimized; score/insights honest (not diagnosis); meds tie to NMC-signed Rx from B/D. ✔
- **Word checks:** "AI" absent (doctor-backed; score/insights = wellness indicators); "free" per refined rule (Design Part 12.5). **No regression to Parts 1–4:** B-results, D-appointments, C-booking all land in E exactly as specified. ✔

---

---

# PART 6 — FAMILY F: CONDITIONS / TREATMENTS / SYMPTOMS LIBRARIES `[WEB]`

## F.0 — Family principles (the SEO/GEO engine + brand authority)

_This is the bulk of Datun's public web surface — hundreds→thousands of programmatic, medically-reviewed pages that (a) win Google + AI-citation traffic for every dental query an Indian types or asks, and (b) establish Datun as the dental authority. Every page funnels to **"Ask Datun"** (B1) or **"Find a Dentist"** (C1). `[WEB]`-face (SSR, marketing shell, no app tab-bar). Research-locked rules:_

- **Medically-reviewed E-E-A-T is the moat (and the survival requirement).** The **Dec 2025 core update** crushed even Healthline/WebMD/Medical News Today; generic AI-spun health content is dying. Datun's structural advantage = **real NMC-registered dentists author/review** every page (named reviewer byline + credentials + profile, tied to **A5 Our Doctors**). This makes uniqueness + trust _native_, not retrofitted.
- **Answer-first / GEO-native.** Each page leads with a direct answer; **each H2 is a real question** and opens with a 2-sentence direct answer (feeds AI Overviews, which appear on ~50%+ of health searches). Princeton GEO: **expert quotes +41%, statistics +30%, citations +30%** → every page carries **dentist quotes + real stats + inline citations** (WHO/CDC/NICE/PubMed + India **IDA/ICMR**).
- **Quality-gated programmatic (never thin).** Google's "scaled content abuse" penalty is real. Hard gate per page: **substantively unique (≥~50-60% unique, ≥500+ meaningful words, ≥3 unique data points), medically reviewed, valid schema, correct canonical, passes Core Web Vitals** — else **noindex** until it qualifies. Templates **add context/variation**, never identical-structure (= doorway pages). Roll out gradually + review cadence.
- **Pillar-cluster + topical authority.** Hubs (F1/F3/F5) = pillars; individual pages = clusters; **rich internal linking** (condition ↔ its symptoms ↔ its treatments ↔ its costs ↔ relevant Q&A) signals authority + prevents cannibalization + builds crawl paths.
- **Plain language + health literacy.** Grade ~6-8, short sentences (15-20 words), familiar words, jargon explained, active voice, "you", actionable question-headers, bullets, 1-idea paragraphs. **"Vital Signs" model:** simple answer on top + depth below for motivated readers (clarity + completeness; never over-trim safety details). Clean **on-brand medical illustrations** (no stock). **Multilingual (10 locales) + low-literacy support** (audio option) — built for all of India.
- **Honest + safe.** Educational, not a diagnosis; **medical disclaimer** ("for information; for a diagnosis, Ask Datun / see a dentist"); symptom pages route urgent red-flags to **M9 Emergency**. **No "AI" word** (doctor-backed/medically-reviewed); **"free" per refined rule** (cost pages use ranges, no price-claim → Family G; Design Part 12.5).

**Library system / entry points:** header **"Learn"** dropdown → F1/F3/F5 hubs (+ G cost, I blog); A1 condition quick-links → F2/F6; C2/C3 services → F2/F4; F4 cost snippet → **Family G**; F6 red-flags → **M9**; **every page → "Ask Datun" (B1) + "Find a Dentist" (C1)**; pages enriched with relevant **Datun Answers (Family O)** + reviews. Shared reusable template parts: breadcrumb, "medically reviewed by + date", answer-first H2 blocks, FAQ accordion, related-pages grid, CTA band, references block.

---

## F1 — Conditions hub `[WEB]`

**Purpose.** The browsable, searchable index of every dental condition (pillar page).

### Sections/features

- Intro (what this library is) · **A–Z list + search** · **grouped by area** (gums, teeth, jaw/TMJ, mouth/soft-tissue, children, etc.) · **condition cards** (name + 1-line + icon) · links to symptoms/treatments hubs · CTA band.
- **Charts/tables:** none (index).
- **Build:** SSR pillar; internal-links to all F2; `CollectionPage`/`Breadcrumb` + `MedicalWebPage` JSON-LD; → F2/F4/F6, B1, C1.

## F2 — Condition page `[WEB]` _(template → ~50–70 pages)_

_Cavities, gingivitis, periodontitis, halitosis, sensitivity, cracked/broken tooth, abscess, malocclusion, oral cancer, TMJ/TMD, gum recession, dry mouth, bruxism, impacted wisdom tooth, plaque/tartar, stained teeth, mouth ulcers, pulpitis, pericoronitis, enamel erosion, etc._

### Anatomy (each section = answer-first)

**Overview → Symptoms → Causes → Risk factors → Diagnosis → Treatment options → When to see a dentist → Prevention → Complications → FAQ → References.** Plus: **"Ask Datun" CTA** (primary, recurring) · related conditions/treatments grid · relevant Datun Answers (O) · **"medically reviewed by [Dr name, BDS/MDS] · [date]"** byline · breadcrumb · dentist quote + key stat.

- **Charts/tables:** **comparison table** where useful (e.g., gingivitis vs periodontitis); clean medical illustration; no graphs.
- **Build:** uniqueness-gated (no thin/duplicate); **`MedicalCondition` + `MedicalWebPage`(aspect, lastReviewed, reviewedBy) + `FAQPage` + `Breadcrumb`** JSON-LD; plain-language + multilingual; → B1 (Ask Datun), C1 (Find a Dentist), F4 (its treatments), G (its cost), M9 (if urgent).

---

## F3 — Treatments hub `[WEB]`

**Purpose.** The index of every dental treatment/procedure (pillar).

### Sections/features

- Intro · **A–Z + search** · **grouped** (restorative / cosmetic / surgical / preventive / orthodontic) · **treatment cards** · CTA band.
- **Build:** SSR pillar; internal-links to all F4; `CollectionPage`/`Breadcrumb` JSON-LD; → F4, C1, B1.

## F4 — Treatment / procedure page `[WEB]` _(template → ~50–60 pages)_

_Filling, root canal, crown, extraction, implant, dentures, braces, clear aligners, whitening, scaling/cleaning, root planing, gum/flap surgery, bone graft, sealants, veneers, bridges, bonding, inlay/onlay, apicoectomy, wisdom-tooth removal, full-mouth rehab, All-on-4, smile makeover, fluoride, night guard, etc._

### Anatomy (answer-first)

**What it is → How it's done → How to prepare → Risks → Results/recovery → Cost snippet (→ Family G) → Alternatives → When it's needed → FAQ → References.** Plus: **"Find a Dentist" + "Ask Datun" CTAs** · related treatments/conditions · medically-reviewed byline · breadcrumb · dentist quote + stat.

- **Charts/tables:** **material/option comparison table** (e.g., crown types: metal / PFM / ceramic / zirconia; aligners vs braces) — also machine-readable for agentic search; optional cost table (→ G).
- **Build:** uniqueness-gated; **`MedicalProcedure`(howPerformed, preparation, followup, bodyLocation) / `MedicalWebPage`(lastReviewed, reviewedBy) + `FAQPage` + `Breadcrumb`** JSON-LD; HowTo-style steps where apt; → G (cost), C1 (book), B1, F2.

---

## F5 — Symptoms hub `[WEB]`

**Purpose.** The index of "what does this feeling mean?" entry points (pillar; high Ask-Datun intent).

### Sections/features

- Intro · **A–Z + search** · **symptom cards** · prominent "Ask Datun" · CTA band.
- **Build:** SSR pillar; internal-links to all F6; `CollectionPage`/`Breadcrumb` JSON-LD; → F6, B1.

## F6 — Symptom page `[WEB]` _(template → ~30–40 pages)_

_Toothache, bleeding gums, jaw pain, swollen gums/face, bad breath, sensitivity to hot/cold, loose tooth, clicking jaw, mouth sores, dry mouth, tooth discoloration, gum recession, broken tooth, etc._

### Anatomy (answer-first; safety-first)

**What it means → Possible causes → When it's urgent (red flags) → What to do now → FAQ.** Plus: **prominent "Ask Datun" CTA** (highest-intent funnel — symptom → diagnosis) · related conditions/treatments · medically-reviewed byline · breadcrumb.

- **Charts/tables:** **causes table** (cause → typical signs → urgency); no graphs.
- **Build:** uniqueness-gated; **red-flag block routes to M9 Emergency**; `MedicalWebPage`(lastReviewed, reviewedBy) + `MedicalSignOrSymptom` + `FAQPage` + `Breadcrumb` JSON-LD; honest disclaimer; → B1 (Ask Datun), M9 (urgent), F2/F4.

---

## F.shared systems (apply to every F page)

- **Medical-review model (E-E-A-T):** every page has a named **NMC-registered dentist reviewer** (byline + credentials + profile link → A5) + author "Who/How/Why" transparency + **last-reviewed date** + a **review cadence** (YMYL = frequent; outdated = ranking risk). This is the same accountability moat as the doctor-backed diagnosis.
- **References:** authoritative citations (WHO/CDC/NICE/PubMed + IDA/ICMR), inline + a references block.
- **Internal linking:** condition ↔ symptoms ↔ treatments ↔ cost ↔ Q&A — dense, contextual, topical-authority-building.
- **Content ops:** quality-gated pipeline (uniqueness + review + schema + CWV gates → else noindex); gradual rollout; periodic audit/refresh; UGC enrichment (Datun Answers / reviews) for freshness + uniqueness.
- **GEO layer:** answer-first, question-H2s, dentist quotes + stats + citations, FAQ schema, machine-readable tables, entity clarity, multilingual, llms.txt-aware; track AI-citation share.

## F.research-basis (Part 6)

~100+ sources synthesized, including: medical-content **E-E-A-T / YMYL** (Google SQRG, "Who/How/Why" Dec-2025 helpful-content, Medic-update; physician authorship/review + named credentialed reviewers + profiles; citations to CDC/NHS/NICE/WHO/PubMed; freshness/last-reviewed + mandatory YMYL review cycles; Dec-2025 core-update damage to Healthline/WebMD/MNT; AI-platform YMYL — Perplexity 21+ sources, AI-Overview E-E-A-T sourcing), **GEO/AEO** (answer-first/TL;DR-first in first 40-60 words, question-based headings, Princeton GEO quotes +41%/stats +30%/citations +30%, FAQPage/MedicalCondition/HowTo schema, extraction-friendly lists/tables, entity clarity, machine-readable for agentic search, multilingual, citation-tracking, GEO-additive-on-SEO), **programmatic SEO at scale** (quality-over-quantity, "scaled content abuse" penalty, ≥50-60% uniqueness + ≥3 data points + 500+ words + noindex-gate, templates-add-variation-not-doorways, pillar-cluster + internal linking + topical authority, crawl-budget/canonical/IndexNow, gradual rollout + 60-day feedback loop + editor sampling, UGC enrichment), **best-in-class page anatomy** (Mayo/Cleveland: conditions = signs/symptoms/causes/diagnosis/treatment/prevention; procedures = what-it-is/how-it's-done/how-to-prepare/risks/results; symptoms = causes + find-by-letter; glossary; illustrations add clarity), and **health literacy / plain language** (CDC Clear Communication Index, AHRQ PEMAT, Flesch-Kincaid grade ~6-8, 15-20-word sentences, active voice, actionable headers, "Vital Signs" simple-summary-plus-depth, multiple formats, multilingual + low-literacy equity). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## F.interlink verification (Part 6)

- **Entries:** header **"Learn"** dropdown (Shell-1) → F1/F3/F5; A1 condition quick-links → F2/F6; C2 services / C3 price-table → F2/F4; cross-links between F pages. ✔
- **Exits:** **every F page → "Ask Datun" (B1) + "Find a Dentist" (C1)**; F4 cost snippet → **Family G**; F6 red-flags → **M9 Emergency**; pages enriched with **Family O** (Q&A) + **C5** reviews; glossary ties to **Family I**. ✔
- **E-E-A-T interlink:** every page's reviewer byline links to **A5 Our Doctors** (the credentialed humans = the same backing as the doctor-backed diagnosis). ✔
- **Design-system interlinks:** hub cards, comparison tables, FAQ accordion, breadcrumb, CTA band, medical illustrations, related-grid = tokens/reusable components; tables follow Part 19 (honest, label-led); a11y per Part 13. ✔
- **Compliance:** medically-reviewed + cited + dated; **medical disclaimer**; India ad-compliance (ASCI — no misleading claims); symptom red-flags → emergency; cost via ranges (Family G), no "free" price-claim (refined rule). ✔
- **Word checks:** "AI" absent (medically-reviewed / doctor-backed); "free" per refined rule (Design Part 12.5). **No regression to Parts 1–5:** "Learn" nav, A1 quick-links, C2/C3 service links, B1 Ask-Datun funnel all land exactly as specified. ✔

---

---

# PART 7 — FAMILY G: COST GUIDES `[WEB]`

## G.0 — Family principles (honest cost transparency = trust + mission)

_"How much does [treatment] cost in India / in [city]?" is one of the highest-intent dental queries — and India's dental cost is opaque + almost entirely out-of-pocket. Answering it honestly is both a huge traffic driver and a direct expression of the mission ("Healthcare is a Right" = affordability transparency). `[WEB]`-face, table-heavy, high-commercial-intent. Research-locked rules:_

- **Cost transparency builds trust + reduces fear.** Patients want to "know before you go" (40%+ delay care over cost uncertainty). Honest ranges + factors empower budgeting and reduce sticker-shock — exactly the trust Datun is built on.
- **The consult is never priced; treatment-cost education is honest; no "free" price-claim (refined rule, Design Part 12.5).** Costs shown as **ranges in ₹** (Indian grouping: ₹, thousand, lakh), with the honest caveat that final cost depends on a dentist's exam.
- **Educational, not upsell.** Explain _why_ prices vary (complexity, expertise, city tier, technology, material/brand, add-ons); be honest about cheaper-vs-premium trade-offs and that **lower-cost options exist** (dental colleges/government/charitable) — and the on-brand truth that _"delay is what's expensive"_ (a small problem ignored becomes a costly one; saving a natural tooth is cheaper long-term than extraction + implant).
- **Affordability is on-mission.** Surface **EMI / no-cost-EMI** honestly (the dominant India route for high-value treatment; Datun explains options + flags EMI-offering verified clinics — Datun is not a lender) and the **insurance reality** (dental is largely out-of-pocket in India; ~56% uninsured; some accident/surgical cover; cashless where available).
- **Factually accurate + maintained.** Ranges are realistic, reviewed, and **dated/refreshed** (prices drift; stale = distrust + ranking risk). Medically/factually reviewed like Family F.
- **GEO-native + table-first.** Answer-first (lead with the range), question-H2s, **price tables as the core asset** (by-city, by-material) — machine-readable for AI Overviews + agentic search. Funnels to **"Find a Dentist" (C1)** + estimator (G3) + **Ask Datun (B1)**.
- **Honest, non-misleading** (India ASCI): no fake "lowest price" claims; ranges reflect reality.

**Cost-guide system / entry points:** header **"Learn" → Cost guides** (G1); **F4 treatment-page cost snippet → G2**; C3 clinic price-table relates to G; G2 by-city rows tie to **Family H** local pages; every cost page → **estimator (G3) + "Find a Dentist" (C1)**; reassurance + EMI explainer throughout. Reuses: price-table component, range bar, factors list, FAQ accordion, CTA band, "reviewed/updated + date".

---

## G1 — Cost guides hub `[WEB]`

**Purpose.** The index + on-ramp for every treatment-cost guide + the estimator.

### Sections/features

1. Intro (honest framing: "real, transparent dental cost ranges for India — final cost depends on your exam").
2. **All treatment-cost guides** (cards, grouped restorative/cosmetic/surgical/ortho/preventive) + **search**.
3. **"Estimate your cost"** prominent entry → **G3**.
4. **EMI / payment-options explainer** (what no-cost EMI is, how it works, that many verified clinics offer it) + insurance reality (honest).
5. Reassurance + "Ask Datun" / "Find a Dentist" CTAs.

- **Charts/tables:** none (index).
- **Build:** SSR pillar; internal-links to all G2 + G3; `CollectionPage`/`Breadcrumb` JSON-LD; → G2/G3/C1/B1.

## G2 — Treatment-cost page `[WEB]` _(template → ~40 national, optionally × cities = hundreds)_

_Root canal cost, implant cost, braces cost, aligners cost, crown cost, veneers cost, whitening cost, extraction cost, dentures cost, bridge cost, scaling cost, filling cost, full-mouth rehab cost, All-on-4 cost, etc._

### Anatomy (answer-first)

1. **Price range up front** (₹ range for India; per-tooth/per-unit clarity where relevant — e.g., RCT per tooth).
2. **What affects the cost** — factors (tooth/complexity, dentist's expertise, **city tier**, technology, **material/type & brand**, add-ons like bone graft/sinus lift, number of units, sittings).
3. **By-city table** — ₹ range across metros / tier-2 / tier-3 (ties **Family H**).
4. **By-material / by-type table** — e.g., crown: metal / PFM / ceramic / zirconia; braces vs aligners; Indian vs imported implant brands — with honest trade-offs.
5. **EMI / payment options** — no-cost-EMI explainer + verified clinics that offer it (honest, not a lending pitch).
6. **Cheaper-vs-premium honesty** — quality trade-offs; lower-cost routes (college/govt) named honestly; "delay is what's expensive" + "saving the tooth is cheaper long-term."
7. **When to see a dentist** + **FAQ** + references + **medically/factually reviewed + date**.
8. CTAs: **"Find a Dentist" (C1)** + **estimator (G3)** + "Ask Datun" (B1).

- **Charts/tables:** **price tables (core)** — by-city + by-material; optional **range bar**.
- **Build:** uniqueness-gated (real ranges + city/material data = naturally unique, not thin); answer-first + question-H2s; machine-readable tables; honest (ASCI); dated/refreshed; `FAQPage` + `Breadcrumb` + `MedicalWebPage`(lastReviewed) JSON-LD (prices via honest editorial ranges, not deceptive Offer markup); → C1, G3, B1, F4 (the procedure), H (city pages).

## G3 — Cost estimator / calculator `[WEB]`

**Purpose.** A personalized, honest range in seconds — high trust + conversion. _(Entry CTA may use **"Get a free estimate"** — same honest, barrier-removing estimate category as the tourism N4 CTA; refined rule, Design Part 12.5.)_

### Sections/features

1. **Inputs (minimal):** pick **treatment** + **city** (+ **material/type** optional). No heavy personal data.
2. **Result:** **estimated ₹ range** as **stat-cards / range** + the factors that could move it.
3. **Disclaimer (essential):** "This is an estimate. Your final cost is decided after a dentist examines you and depends on your specific case." (Honest, expectation-setting.)
4. **CTAs:** **"Find a Dentist" (C1)** + "Ask Datun" (B1) + EMI note.

- **Charts/tables:** result **stat-cards / range bar**.
- **Build:** lightweight interactive; minimal inputs; mobile-first; honest disclaimer; no "free" price-claim (refined rule); feeds C1/B1; data shares the G2 range source (single source of truth).

---

## G.research-basis (Part 7)

~100+ sources synthesized, including: healthcare **price-transparency** behaviour & policy (know-before-you-go; 40%+ delay care over cost; transparency → budgeting + dispute + trust + competition; CMS hospital-price-transparency landscape; cost/price-estimator as a searched-for format; comparative/color-coded presentation), **real India dental cost data** (RCT ₹3-15k/tooth & +crown to ₹25k; implants ₹25-50k & full-mouth/All-on-4 ₹3-8L; crowns ₹3-30k by material; braces ₹30k → aligners ₹1L+; whitening ₹5-15k; veneers/bridges ₹5-30k; per-tooth/per-unit pricing) and **cost factors** (complexity, expertise, city tier, technology, material/brand incl. zirconia & imported implants, add-ons, sittings) + by-city patterns (metros higher, tier-2/3 lower), **EMI / financing** (no-cost/0% EMI as dominant India route — Bajaj Finserv Health card/Capital Float/Snapmint, 3-38 months, up to ₹3-4L, partner clinics, minimal KYC; covers 800+ treatments insurance doesn't) + **India insurance reality** (~56% uninsured, dental largely out-of-pocket, some accident/surgical cover, cashless where available), **cost-estimator/calculator UX** (personalized estimates → engagement + reduced financial stress, 79%/87% usability/reuse, 2× return; minimal inputs; estimated range + mandatory disclaimer; lead-gen to find-a-dentist), plus prior research on comparison-table & price-table UX (F-2/F-4, Baymard) and honest-content/ASCI compliance. Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## G.interlink verification (Part 7)

- **Entries:** header **"Learn" → Cost guides** (Shell-1, G1); **F4 cost snippet → G2**; C3 clinic price-table relates; cross-links between G pages. ✔
- **Exits:** every cost page → **estimator (G3)** + **"Find a Dentist" (C1)** + "Ask Datun" (B1); G2 by-city rows → **Family H** local pages; G2 links back to **F4** (the procedure detail). ✔
- **Affordability interlink:** EMI explainer references verified-clinic EMI availability (ties C3 clinic info / D booking); insurance reality stated honestly. ✔
- **Design-system interlinks:** price tables, range bar, factors list, stat-cards, FAQ accordion, CTA band, calculator widget = tokens/reusable components; tables follow Part 19 (honest, label-led); a11y per Part 13. ✔
- **Compliance:** ranges realistic + dated + factually reviewed; **India ASCI** (no misleading "lowest price"); honest cheaper-vs-premium + lower-cost-options; estimator disclaimer; Datun-not-a-lender on EMI. ✔
- **Word checks:** "AI" absent; **"free" per refined rule** — affordability shown via ranges + EMI + honest options, no "free" price-claim (incl. the EMI section: "no-cost EMI" is the lender's product name, used only when factually describing that option, never as Datun's own pricing claim). **No regression to Parts 1–6:** "Learn" nav, F4 cost snippet, C3 price-table all land exactly as specified. ✔

---

---

# PART 8 — FAMILY H: LOCAL PAGES `[WEB]`

## H.0 — Family principles (the biggest page-multiplier + the Practo/JustDial battleground)

_This family wins "[treatment] in [city]" and "dentist near me / in [area]" — the highest-volume, highest-intent local queries in Indian dental. Each page is a **local-organic landing page over Datun's verified clinics**, with map + local reviews + schema. `[WEB]`-face. Research-locked rules:_

- **Local-organic aggregator, not map-pack.** The Google map-pack shows individual clinic GBPs (clinics own those). Datun's H pages compete and win in **local organic** results + **AI "near me" answers** — exactly like Practo/JustDial, but with **verification as the differentiator**. Datun does not need a per-city GBP; it needs genuinely strong, schema-rich local-organic pages.
- **Genuine local uniqueness or nothing (anti-doorway).** City-name-swap templates = a doorway-page penalty (Google detects this easily in 2026; thin pages also get skipped by AI Overviews). Datun's structural advantage = **real verified-clinic data + real local reviews per city/area** = native uniqueness (not boilerplate) — the same "real, not AI-spun" moat as Family F. Each page additionally carries crafted local context (neighborhoods, landmarks, metro/pin-code references, local FAQ).
- **Built for how India actually searches:** **vernacular + Hinglish** (10 locales; natural bilingual phrasing in FAQ/intro) and **voice** (India = world's ~2nd-highest voice volume, ~45% of searches; conversational question queries like "mere paas best dentist kaun hai") → **answer-first, question-based FAQ + `Speakable` schema**. **Hyperlocal specificity** (neighborhood / landmark / metro / pin-code) — Indians search "dentist near [metro] / in [locality block]".
- **Schema + NAP are the technical moat.** Specific `Dentist` subtype (never generic LocalBusiness) with **`geo` (precise lat/long) + `hasMap` + `areaServed` + `sameAs` + `openingHoursSpecification` + `aggregateRating` (only if visible) + international `+91` phone**; one `Organization` parent (Datun) + per-clinic `Dentist` blocks on C3. **NAP consistent** across the site + Indian directories (JustDial/Practo/Sulekha presence for the entity). Schema = AI source-of-truth for "near me/open now."
- **Reviews recency + volume matter more in 2026** (fresh reviews beat old; reviews mentioning the service/area carry weight) → surface recent local reviews.
- **Tier-1 → Tier-2 → Tier-3 sequencing** (per brand GTM): launch metros, expand naturally; Tier-2/3 = higher-intent, lower-competition, strong ROI.
- **Mobile-first** (60%+ local searches mobile; local converts ~18% faster — high purchase intent); map + Call/WhatsApp/Book/Ask CTAs.
- **Honest + compliant:** verification-led, no "AI", "free" per refined rule; reviews ASCI/NMC/DPDP-compliant.

**Local system / URL + entry points:** clean URLs — `/dentists/[city]` & `/[area]` (H1), `/[treatment]/[city]` (H2), `/dental-care/[city]` city hub (H3). **A1 "Featured cities" grid → H1/H3**; **G2 by-city rows → H2**; **F pages** (treatment/condition) cross-link to relevant "[treatment] in [city]"; every H page → verified-clinic **C2/C3 profiles** → **Book (D)** + **"Ask Datun" (B1)**. Hub-and-spoke internal linking (H3 hub ↔ H1/H2 spokes ↔ C profiles).

---

## H1 — "Dentists in [City/Area]" `[WEB]` _(template → ~50–100+ cities/areas)_

**Purpose.** Win "dentist in [city/area]" + "dentist near me" local-organic + AI answers; route to verified clinics.

### Anatomy

1. **City/area intro** (genuinely local: about dental care in that city/area — answer-first).
2. **Verified clinics/dentists list** — cards (verified badge, area, rating, next-slot, Book) → C2/C3.
3. **Map** — pins of verified clinics (tap → mini-card → profile/book); list↔map.
4. **Top treatments in this city** → H2 "[treatment] in [city]" + F.
5. **Local reviews** (recent, area-mentioning).
6. **Areas / neighborhoods** — sub-links (hyperlocal: localities, landmarks, metro lines, pin codes).
7. **Local FAQ** (vernacular/voice-friendly, question-based) + **"Ask Datun" + Book CTAs**.

- **Charts/tables:** map + provider list. No graphs.
- **Build:** SSR; genuinely-unique local content (anti-doorway); `CollectionPage`/`ItemList` + `Breadcrumb` + `FAQPage` + `Speakable` JSON-LD; clinics carry `Dentist`+geo on C3; NAP-consistent; → C2/C3, D, B1, H2, H3.

## H2 — "[Treatment] in [City]" `[WEB]` _(template → ~40 treatments × cities = thousands)_

_e.g., "Root canal in Delhi", "Dental implants in Mumbai", "Braces in Bangalore"._
**Purpose.** Win the highest-commercial-intent local query (treatment + city) — the core Practo/JustDial battleground.

### Anatomy (answer-first)

1. **Treatment + city intro** (what it is + local context; lead with a direct answer).
2. **City-specific verified clinics** offering it — cards → C2/C3.
3. **Cost table for that city** — ₹ range (shares **Family G** data; single source of truth).
4. **Local reviews** (for that treatment/city) + **map**.
5. **FAQ** (vernacular/voice question-based) + **Book / "Ask Datun" CTAs**.

- **Charts/tables:** **cost table** + map.
- **Build:** SSR; uniqueness-gated (real clinics + real city cost data = native uniqueness); answer-first + question-H2s; `CollectionPage` + `FAQPage` + `Breadcrumb` + `Speakable` JSON-LD; clear intent split vs F4 (F4 = national/generic treatment; H2 = local intent) to avoid cannibalization; → C2/C3, D, B1, G2, F4.

## H3 — City hub / "Dental care in [City]" `[WEB]`

**Purpose.** The city's pillar + internal-link cluster (hub-and-spoke center).

### Sections/features

- City overview · **index of that city's pages** (Dentists in [city] H1, all "[treatment] in [city]" H2, city cost guides) · top areas/neighborhoods · featured verified clinics · local FAQ · CTAs.
- **Charts/tables:** none (hub).
- **Build:** SSR pillar; **internal-link cluster** to all H1/H2 for that city (topical-authority + crawl paths); `CollectionPage`/`Breadcrumb` JSON-LD; → H1/H2/C/B1.

---

## H.shared systems (apply across Family H)

- **Uniqueness engine (the #1 risk control):** every page = real verified-clinic data + real local reviews + crafted local context (neighborhoods, landmarks, metro, pin codes, local FAQ); intro + FAQ + CTA individually crafted; **quality-gate → noindex** any city/area with too few verified clinics (avoid thin/doorway), index as coverage grows (mirrors Family F discipline).
- **Schema architecture:** `Organization` parent (Datun, sitewide) + per-clinic **`Dentist`(medicalSpecialty)** on C3 with `geo`+`hasMap`+`areaServed`+`sameAs`+`openingHoursSpecification`+`aggregateRating`(visible-only)+`+91` phone; H pages = `CollectionPage`/`ItemList`/`FAQPage`/`Speakable`/`Breadcrumb`. Validate + monitor (fix errors ≤7 days).
- **NAP + citations:** consistent NAP sitewide; entity presence on **Indian directories** (JustDial, Practo, Sulekha, Bing Places) for authority + corroboration.
- **Internal linking (hub-and-spoke):** H3 city hub ↔ H1 + H2 spokes ↔ C2/C3 profiles ↔ F/G; A1 featured-cities → H; intentional, anti-cannibalization.
- **Vernacular + voice:** 10 locales; natural Hinglish/regional phrasing; question-based answer-first FAQ; `Speakable` for 2-3 key sections.
- **Content ops:** Tier-1→2→3 rollout; reviews recency surfaced; periodic audit (hours/NAP/clinic accuracy); refresh dates.

## H.research-basis (Part 8)

~100+ sources synthesized, including: **local SEO / local landing pages** (city/service-area pages, "near me", Vicinity proximity-weighting, doorway-penalty for city-swap templates, genuine local uniqueness — landmarks/neighborhoods/local team/local reviews/community, clean `/service/city` URLs, single-location-single-service focus, 500-800-word unique depth, hub-and-spoke, intentional internal linking + anti-cannibalization), **map-pack vs local-organic** (map-pack = top result 44-58% clicks but requires in-location GBP; aggregator/directory pages win local-organic — the Practo/JustDial model; relevance/distance/prominence signals; reviews weigh more + recency in 2026), **India-specific local search** (Hinglish/Hindi/regional + mixed-language queries; India ~2nd-highest voice volume, ~45% voice-initiated, conversational question queries; hyperlocal landmark/metro/pin-code specificity; Indian directories JustDial/Sulekha/Practo carry authority + consumers check their reviews; Tier-2/3 higher-intent/lower-competition/better ROI; mobile 60%+; local converts ~18% faster), **LocalBusiness/Dentist schema + AI-local** (specific `Dentist` subtype + `medicalSpecialty`; `geo`/`hasMap`/`areaServed`/`sameAs`/`openingHoursSpecification`/`aggregateRating`-visible-only/`+91` phone; Organization-parent + per-location pattern; schema → 20-30% CTR + 58% rich-result clicks + 30-50% more local-pack; AI engines read schema first for "near me/open now"; `Speakable` for voice; NAP-GBP match critical; stale-schema trust risk; validate/monitor), plus prior research on maps/geolocation/directory UX (Part 3 C1d), reviews systems (C5), and GEO/answer-first (Parts 1/6). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## H.interlink verification (Part 8)

- **Entries:** **A1 "Featured cities" grid → H1/H3**; **G2 by-city rows → H2**; **F** treatment/condition pages cross-link → relevant H2; cross-links within Family H (hub-spoke). ✔
- **Exits:** every H page → verified-clinic **C2/C3 profiles** → **Book (Family D)** + **"Ask Datun" (B1)**; H2 cost table shares **Family G** data; H links to **F** (treatment/condition detail); H1 areas → hyperlocal sub-pages. ✔
- **Entity/schema interlink:** Datun `Organization` parent ↔ per-clinic `Dentist` schema on **C3** (single source of clinic geo/NAP/hours/rating); NAP consistent with footer (Shell-2) + C profiles + Indian directories. ✔
- **Design-system interlinks:** provider cards, map↔list, review modules, cost table, FAQ accordion, breadcrumb, CTA band = tokens/reusable components (shared with C/G); a11y per Part 13; mobile-first. ✔
- **Compliance:** verification-led ranking (not pay-to-rank, per C.0); reviews ASCI/NMC/DPDP-compliant + recent; honest local content; schema accurate + maintained. ✔
- **Word checks:** "AI" absent; "free" per refined rule (cost via G ranges; Design Part 12.5). **No regression to Parts 1–7:** A1 featured-cities, G2 by-city, F cross-links, C profiles, D booking all land exactly as specified; H reuses C's verified-clinic + map + reviews systems and G's cost data as single sources of truth. ✔

---

---

# PART 9 — FAMILY I: CONTENT HUB `[WEB]`

## I.0 — Family principles (the editorial layer + freshness/authority engine on top of the libraries)

_Family F/G/H are the structured reference libraries. Family I is the **editorial layer** that wraps them: blog articles, comprehensive pillar guides, a glossary, a global FAQ, videos, and patient stories. Its job is (a) build **topical authority + freshness** that lifts the whole site (a network of interlinked content outranks isolated pages), (b) win **GEO/AEO citations** for the long-tail of questions Indians ask, and (c) carry **brand voice + emotional proof**. `[WEB]`-face. Research-locked rules:_

- **Medically-reviewed E-E-A-T is survival, not decoration.** Google's 2026 Medical Core update rewards physician-authored/reviewed content and demotes unattributed AI-spun material; **a credentialed, named reviewer byline + linked author page (→ A5) is table stakes** (AI engines cross-reference authors; faceless content is filtered out of AI citations). Same accountability moat as the doctor-backed diagnosis.
- **Authority-first, not volume.** Topical clusters + content hubs (pillar + spokes + dense internal links) signal depth. Quality-gated like Family F — no thin/AI-spun filler.
- **Answer-first + AI-extractable.** **TL;DR/summary at the TOP** (not bottom — AI extracts top-down, "grounding" plateaus ~540 words; put the direct answer in the first section), question-based H2s, concise self-contained passages, scannable formatting. GEO is now **separate from SEO** (AI engines overlap Google organic only ~12%; ~80% of users rely on zero-click in ≥40% of searches) — content must be eligible (crawlable) _and_ extractable.
- **Healthcare-content safety for AI.** AI can strip safety caveats or surface outdated info → **every content piece gets the same clinical review + citations + last-reviewed date** as Family F. Honest; no misleading claims (ASCI); never the word **"AI"** (doctor-backed/medically-reviewed); **"free" per refined rule** (cost → Family G ranges; Design Part 12.5).
- **Conversion is subtle.** A single, calm **"Ask Datun" (B1)** / "Find a Dentist" (C1) path — heavy-handed CTAs interrupt education and erode trust. Newsletter opt-in is gentle (no aggressive popups).
- **FAQ stance (precise, 2026-correct — supersedes earlier optimistic phrasing):** Google **fully removed FAQ rich results (May 7 2026)** for all sites (the health/gov exception also ended); FAQ Search-Console reporting is going away. **FAQPage stays a valid schema and the Q&A _content format_ is exactly what AI engines extract — but the AI-citation value comes from clear answer-first Q&A content, not from the markup as a "magic switch"** (evidence that FAQPage markup itself boosts AI Overviews is inconclusive; pages get cited without it). So: keep **FAQPage schema only where a genuine user-facing Q&A exists** (consistent with visible content), use **`QAPage` for the Family O community** (multi-answer), and invest in the _content_. (Likewise **`llms.txt` is not a Google-Search ranking factor** — fine to keep for other AI systems, no Google benefit assumed.)
- **Multilingual (10 locales) + mobile-first** (60-70% of content traffic is mobile).

**Content system / entry points:** header **"Learn" → Blog (I1), Glossary (I4), FAQ (I5)** (alongside F hubs + G cost); **A1 patient-stories teaser → I7** (+ J); newsletter opt-in (I1 + inline I2 + footer); every content page is **answer-first + medically-reviewed-byline (→ A5) + "Ask Datun" (B1)**; content **cross-links into F/G/H** libraries (topical authority) and **glossary terms bridge to F**. Reuses: FAQ accordion, CTA band, patient-stories carousel, breadcrumb, related-grid, references block, "reviewed by + date".

---

## I1 — Blog / Articles hub `[WEB]`

**Purpose.** The discoverable home + on-ramp for editorial content; freshness signal.

### Sections/features

- Intro · **categories** (grouped: oral-care tips, treatments explained, kids/pregnancy, myths, news) · **search** · **featured/latest** article cards (image + title + reviewed-byline + date + reading-time) · **newsletter opt-in module** (gentle).
- **Build:** SSR; `CollectionPage`/`Breadcrumb` JSON-LD; paginated; links to I2/I3; → newsletter (double opt-in).

## I2 — Article page `[WEB]` _(ongoing, hundreds)_

**Purpose.** Win long-tail + AI citations + build authority; the 2026 dual-audience (human + AI) article.

### Anatomy (research-locked order)

1. **H1 + intro + TL;DR summary at the top** (2-4 bullets / 3-5 sentences in a callout box — the direct answer, before the first H2).
2. **Medically-reviewed byline + date** ("Reviewed by Dr [name], BDS/MDS · [date]" → links to A5 author page; Person/MedicalWebPage signals).
3. **Scannable body** — single-column, descriptive question-H2/H3 every ~200-300 words, lead-in transition before each subhead, short paragraphs, bold key takeaways, non-stock visuals + alt text, **table of contents** (anchor + sticky-alongside) for long pieces, reading-time.
4. **Citations** (WHO/CDC/NICE/PubMed + IDA/ICMR) inline + references block.
5. **FAQ block** (3-7 real-query questions, answers ~40-60 words direct-first) — the highest-value AEO element.
6. **Related articles / what-to-read-next** + cross-links into F/G/H.
7. **Single "Ask Datun" CTA** (calm) + **share**.

- **Charts/tables:** as needed (comparison tables/diagrams), honest per Part 19.
- **Build:** SSR; `Article`/`BlogPosting` + `MedicalWebPage`(reviewedBy, lastReviewed) + `BreadcrumbList` + `FAQPage`(only if genuine Q&A) JSON-LD; 1,500-2,000 words default (500-800 for focused/news); **refresh every 6-12 months**; → B1, C1, F/G/H, A5.

## I3 — Guides / Pillar pages `[WEB]` _(~10-20)_

**Purpose.** Comprehensive, top-of-funnel **pillar hubs** that organize a broad topic and funnel into the F/G/H clusters (e.g., "Complete guide to braces", "Kids' dental care", "Pregnancy & oral health", "Caring for your teeth at every age").

### Anatomy

- Comprehensive high-level coverage (≈3,000-5,000 words) · **hyperlinked table of contents** · each major section = 200-400 word overview that **links to the deeper cluster page** (F condition/treatment, G cost, H local, I2 article) · **bidirectional internal linking** (pillar ↔ spokes) · comparison **tables + diagrams** · medically-reviewed byline + citations · FAQ · **"Ask Datun" + "Find a Dentist" CTAs**.
- **Charts/tables:** comparison tables; diagrams.
- **Build:** SSR pillar; `Article`/`MedicalWebPage` + `BreadcrumbList` (+ `FAQPage` if genuine) JSON-LD; every section provides value even without click-through (no thin sections); **refresh quarterly**; the hub-and-spoke center that lifts cluster rankings; → F/G/H/I2, B1, C1.

## I4 — Glossary / Dental terms A–Z `[WEB]` _(~200-300 terms)_

**Purpose.** Own "what is [term]" queries + featured snippets + AI "define" citations; a bridge into the libraries; reduces confusion.

### Structure

- **A-Z hub** (sticky alphabet bar + anchor-jump) + **search** (autocomplete + fuzzy/typo-tolerant) + **grouped by area** (gums, teeth, jaw/TMJ, soft-tissue, kids, procedures).
- **Per-term page:** term · **one-sentence plain-language definition (top)** · expanded explanation · example · (dentist quote/context for key terms — an AI-untouchable signal) · **related terms** · **link to the deeper condition/treatment page (F)** + "Ask Datun".
- **Charts/tables:** none (definitions; optional contextual comparison for tricky pairs).
- **Build:** SSR; clean `/glossary/[term]` URLs; **`DefinedTerm` + `DefinedTermSet` + `BreadcrumbList`** JSON-LD; each definition self-contained + independently extractable; **linked BOTH ways** (F/I pages → glossary terms as natural anchors; glossary → F deep pages — "a bridge, not a dead end"); curated (not a dumping ground); medically-reviewed; multilingual; → F2/F4, B1.

## I5 — FAQ (global) + per-page FAQ blocks `[WEB]`

**Purpose.** A concentrated answer resource for cross-cutting questions + the per-page Q&A that AI extracts.

### Sections/features

- **Global FAQ hub:** searchable, **categorized accordion** (About Datun · How the diagnosis works · Is it a real diagnosis? · Privacy & DPDP · Booking · Costs · Emergencies) — answer-first, ~40-60 word answers, real user phrasing, from real support/search data; reduces support load (**E10 Help → I5**).
- **Per-page FAQ blocks:** on F/G/H/condition/treatment/article pages — page-specific Qs tied to that page's intent.
- **Build:** SSR; **`FAQPage` schema only where genuine Q&A** (consistent with visible content); **`QAPage` reserved for Family O** community; the value is the clear Q&A content (AI-extractable), not markup-as-trick; `BreadcrumbList`; → relevant B1/C1/L (privacy) destinations.

## I6 — Video hub `[WEB]`

**Purpose.** Explain visually (procedure-demos cut patient anxiety + clinic call-backs ~50%; explainers lift authority + organic traffic), build trust, serve accessibility.

### Sections/features

- Categories (explainers, procedure demos, patient stories, quick tips) · search · video cards (thumbnail + title + length) · player.
- **Each video:** strong hook (first 3s), simple empathetic language, 60-90s (or 1-3 min explainers), end **CTA → "Ask Datun"/related F page**; **closed captions + full transcript + audio description** (a11y legally required + indexable SEO text + sound-off viewing); interactive links to F/B1 where apt.
- **Charts/tables:** none.
- **Build:** SSR; **`VideoObject` JSON-LD + video sitemap**; **host on owned site** (SEO accrues to datunai.com) with optional social distribution for reach; multilingual captions; mobile-first; consent (DPDP) for any patient-featuring video; → B1, F, I7.

## I7 — Patient stories / Testimonials `[WEB]`

**Purpose.** Authentic emotional proof that drives confident action (one video testimonial near a CTA can lift conversion materially).

### Sections/features

- **Outcome/experience-focused** real stories (challenge → Datun journey → result) · **filter by treatment** · cards (first name + photo) + **video** · short quote → full story · CTA → **"Ask Datun"/"Find a Dentist"** · addresses common fears ("was nervous, Datun made it simple").
- **Charts/tables:** none.
- **Build:** SSR; **rigorous consent system (non-negotiable):** specific **written, channel-specific authorization** (what may be shared: name/photo/video/outcome · where · duration · revocation), patient approves the final version, stored securely + audit log — **DPDP-compliant** (parallel to HIPAA; real penalties exist); **de-identified/first-name option** for lower-risk stories (still builds trust); **experience-not-medical-claims** + honest (**ASCI/NMC** — no misleading or guaranteed-outcome claims); **no incentives**; distinct from **C5** clinic/dentist reviews (I7 = Datun's curated consented success stories); `Review`-type markup only if genuinely applicable + consented; mobile-first; → B1, C1, A1/J teaser.

---

## I.shared systems (apply across Family I)

- **Medical-review model (E-E-A-T):** every editorial piece has a named **NMC-registered dentist reviewer** (byline + credentials + profile → **A5**) + last-reviewed date + review cadence; the same accountability as the doctor-backed diagnosis.
- **Internal-linking engine:** Family I is the **hub-and-spoke connective tissue** — pillar guides (I3) ↔ articles (I2) ↔ F/G/H libraries ↔ glossary (I4); dense, contextual, descriptive anchors; quarterly orphan/link audit; anti-cannibalization (editorial long-tail distinct from library intent).
- **GEO/AEO layer:** answer-first/TL;DR-top, question-H2s, dentist quotes + stats + citations, self-contained passages, honest schema (`Article`/`MedicalWebPage`/`DefinedTerm`/`VideoObject`/`FAQPage`-where-genuine/`Breadcrumb`), machine-readable tables for agentic search, entity clarity, multilingual; track **AI-citation share** (not just clicks).
- **Editorial calendar + freshness ops:** planned cadence (clusters fill on schedule), patient-intent keyword research (real queries/support tickets/"People Also Ask"), refresh cycle (articles 6-12 mo, pillars/glossary quarterly), editor + clinician review.
- **Newsletter (gentle, DPDP-first):** **double opt-in** (consent audit trail), **email-only** minimal field, clear value + frequency, reassurance microcopy (unsubscribe anytime + privacy-policy link, never "spam"-y, no promotional "free"), placement = **inline at article breakpoints + footer + blog-hub module (no aggressive popups)**, preference center + unsubscribe in every send, DPDP child-consent alignment; delivered via **Resend** (email) and complementary to the **WhatsApp `weekly_tip`** template (per-channel consent).
- **Honesty/compliance:** medically-reviewed + cited + dated; ASCI (no misleading); DPDP (consent for stories/videos/newsletter); never "AI"; "free" per refined rule.

## I.research-basis (Part 9)

~100+ sources synthesized across eight dense passes, including: **healthcare content marketing / topical authority 2026** (authority-first over volume, 2026 Medical Core update rewarding physician-authored/reviewed + demoting unattributed AI content, topic clusters/content hubs, GEO/AEO separate-from-SEO with ~12% ChatGPT-Google overlap + ~80% zero-click reliance, healthcare GEO safety/clinical-review risk, conversion subtlety, editorial calendars), **article/blog page anatomy** (2026 dual-audience structure, TL;DR-at-top + ~540-word grounding plateau, credentialed author byline as table stakes + faceless-content filtering, single-column scannability + 16-18px + line-height + descriptive H2/H3 + lead-in transitions, table of contents, reading-time, FAQ as highest-value AEO element, 1,500-2,000 default length, 6-12 month refresh), **pillar/cluster architecture** (hub-and-spoke, 3,000-5,000-word pillars + 8-15 spokes, bidirectional internal linking + descriptive anchors, hyperlinked TOC + 200-400-word section overviews, pillars ranking 5-10× more keywords, "20 interconnected articles beat one superior guide", quarterly refresh, anti-cannibalization, informational→commercial pathway), **glossary + DefinedTerm** (term-page scaffold with top one-sentence definition + example + related + deeper link, `DefinedTerm`/`DefinedTermSet` schema for "what is X" + AI citation, A-Z + fuzzy search + grouping, clean URLs, bidirectional linking "bridge not dead-end", curation, future-proofing against zero-click with AI-untouchable context, Mailchimp/Personio glossary traffic scale), **FAQ + FAQPage** (full May-2026 rich-result deprecation incl. end of health/gov exception, FAQPage still valid but AI-citation benefit from Q&A _content_ not markup-as-magic-switch, FAQPage vs QAPage, dedicated-FAQ-page vs per-page-blocks, 40-60-word direct answers, ~38% of AIO citations now from top-10 down from 76%, llms.txt not a Google factor), **healthcare video** (explainer/demo/testimonial/short-form ROI incl. procedure-demos cutting call-backs ~50% and 157% organic lift, 60-90s lengths + 3-sec hook, closed-captions/transcripts/audio-descriptions legally required + SEO, `VideoObject` + video sitemap, host-on-owned-site, interactive elements, DPDP consent), **patient stories/testimonials** (specific written channel-specific consent as PHI under HIPAA/DPDP with real penalties, de-identification alternative, experience-not-medical-claims + ASCI/NMC, no incentives, video-near-CTA conversion lift, authentic-over-polished, distinct from reviews), and **newsletter opt-in** (permission-based + double opt-in + 4×/6× engagement vs purchased, minimal field, clear value/frequency, reassurance microcopy, inline+footer non-intrusive placement, preference center, GDPR/DPDP + child-consent), plus prior E-E-A-T/GEO/health-literacy research (Family F). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## I.interlink verification (Part 9)

- **Entries:** header **"Learn" → Blog (I1) / Glossary (I4) / FAQ (I5)** (Shell-1); **A1 patient-stories teaser → I7**; F/G/H pages cross-link → relevant I2/I3; **F glossary references → I4**; **E10 Help → I5**; newsletter entries (I1 + inline I2 + footer Shell-2). ✔
- **Exits:** every content page → **"Ask Datun" (B1)** + **"Find a Dentist" (C1)**; content **cross-links into F/G/H** (topical authority); **glossary terms → F2/F4** (bridge); I3 pillars → F/G/H clusters; I6 videos → B1/F + I7; I7 stories → B1/C1; bylines → **A5**; FAQ privacy Qs → **Family L**. ✔
- **Schema/entity interlink:** `Article`/`MedicalWebPage`(reviewedBy → A5 author entities) + `DefinedTerm`/`DefinedTermSet` (I4) + `VideoObject` (I6) + `FAQPage` (only where genuine) + `QAPage` reserved for **Family O**; `BreadcrumbList` throughout; consistent author/entity graph for GEO. ✔
- **Design-system interlinks:** article/guide layout, TOC, FAQ accordion, CTA band, patient-stories carousel (shared with A1), video player, glossary index, related-grid, references block = tokens/reusable components; tables per Part 19; a11y per Part 13 (incl. video captions/transcripts); mobile-first. ✔
- **Compliance:** medically-reviewed + cited + dated (E-E-A-T); ASCI (no misleading); **DPDP** (consent for stories/videos/newsletter; child-consent); patient-story consent system (written/channel-specific/revocable/audited); honest healthcare-content review for AI-citation safety. ✔
- **Word checks:** "AI" absent (doctor-backed/medically-reviewed); **"free" per refined rule** (newsletter + cost framing avoid promotional "free"; cost → Family G ranges). **Precise FAQ/llms.txt stance noted — supersedes earlier optimistic phrasing in Parts 1/6 (genuine Q&A content + honest schema, not a GEO magic switch; health-site FAQ exception ended; llms.txt not a Google factor); prior FAQ build-notes remain valid where the Q&A is genuine.** **No regression to Parts 1–8:** "Learn" nav, A1 stories teaser, F glossary tie, E10 Help, footer newsletter all land exactly as specified. ✔

---

---

# PART 10 — FAMILY J: TRUST / BRAND / COMPANY `[WEB]`

## J.0 — Family principles (trust is Datun's entire currency; this family makes it explicit)

_Family A already carries the brand surface (A2 How-it-works, A3 Why/Trust&Safety, A4 About/Mission, A5 Our Doctors). Family J **completes and deepens the trust + brand layer**: the full verification story (the moat), platform-wide social proof, press, careers, community, and the partner program. In a YMYL category, **trust > price > features** — a cautious patient (or a journalist, or a future hire) decides based on credibility before anything else. `[WEB]`-face. Research-locked rules:_

- **Trust is the advertised differentiator.** Marketplaces win by making "every provider is verified" a headline (PwC: 89% say the sharing economy runs on trust). Datun's verification moat is exactly this — and J1 makes it explicit, transparent, and provable (generic directories like JustDial/Practo list largely **unverified** providers; Datun cannot match them on volume, only beat them on **trust**).
- **Transparency builds trust.** Explain the verification process **step-by-step**, show what the badge means, and be honest about its limits. A clickable "how we verify" page behind every verified badge = live evidence, not a claim.
- **Realistic claims, never guarantees.** Overstated promises raise short-term clicks but **weaken long-term trust** (and breach ASCI/NMC). Datun states outcomes cautiously, says "varies by patient" where true, and avoids guarantee-style language. Trust depth matches decision risk.
- **Honest, real proof only.** Every statistic is real + verifiable (no fabricated numbers — locked brand rule); every story is consented; media logos appear only when earned. **Authenticity is the 2026 trust signal** (audiences detect — and punish — fake: balanced reviews, real people not stock, specific outcomes, fresh-not-stale).
- **No pressure tactics.** A health-trust brand does **not** use FOMO popups, fake scarcity, live-visitor counters, or countdowns — they erode trust in care contexts (A1 lock: high-pressure language reduces trust). Calm, evidence-led proof only.
- **Never "AI" (doctor-backed/medically-reviewed); "free" per refined rule.** Multilingual (10 locales), mobile-first.

**Trust/brand system / entry points:** header **"Company" → About (A4) / Our Doctors (A5) / How we verify (J1) / Careers (J4) / Press (J3) / Contact (A7)**; footer **"Legal & Trust"** column + trust micro-row (Shell-1/2); **A3 → J1** (summary → deep); **A1 "Why Datun" trust block → A3 → J1**; **C2/C3 verified badge → J1** (what the badge means); **A1 patient-stories teaser → I7 + J2**; **J6 "Verified on Datun" → external clinics.datunai.com / "For Clinics."** Reuses: trust strip, trust micro-row, patient-stories carousel, stat cards, CTA band, verification diagram.

---

## J1 — Verification process: "How we verify every dentist & clinic" `[WEB]`

**Purpose.** Make Datun's **#1 moat** explicit, transparent, and provable — the page a cautious patient (or partner clinic) reads to trust the verified badge. (A3 carries the summary; **J1 is the deep, authoritative version.**)

### Sections/features (research: transparency + step-by-step + honest limits)

1. **Answer-first headline + promise** — "Every dentist and clinic on Datun is verified against official government registries before they ever appear."
2. **Why it matters** — fake/unqualified practitioners are a real problem in India; verification protects patients (the trust floor before any care decision).
3. **The step-by-step process (diagram + steps):**
   - **Collect credentials** — qualification (BDS/MDS), registration/council number, identity, clinic details.
   - **Primary-source verification** — checked against the **official government registry**: the **Dental Council of India / National Dental Commission — Indian Dentists Register** and the relevant **State Dental Council** (state-first registration syncs to central DCI; both checked). _Primary-source = verified against the authority, not marketing claims._
   - **Confirm** — name as registered, active license/good standing, qualification, council.
   - **Verify the clinic** — clinic registration/establishment + that practicing dentists are themselves verified.
   - **Ongoing re-verification** — status is re-checked over time (credentials/standing can change).
   - **Issue the verified badge** — only after all checks pass.
4. **What the verified badge means (honest)** — confirms the dentist/clinic is **registered, licensed, and qualified** (the trust floor). Honestly states the limit: registration confirms credentials, **not** that a provider is best for a specific procedure — that's why **verified-patient reviews (C5)** + specialty info complement the badge.
5. **What we check vs what we don't** — plain table (credentials/license/identity/clinic ✓; we're transparent about scope).
6. **FAQ** (verification-focused) + **CTAs** → "Find a verified dentist" (C1) / "Ask Datun" (B1).

- **Charts/tables:** verification-flow diagram + "what we verify" table.
- **Build:** SSR; `MedicalOrganization` + `FAQPage` + `Breadcrumb` JSON-LD; the source of the verified-badge meaning referenced by **C2/C3** + **A3** + **J6**; honest + non-guarantee language (ASCI/NMC); → B1, C1.

## J2 — Reviews / Social-proof hub `[WEB]`

**Purpose.** Platform-wide trust narrative — aggregate proof + curated real stories — for visitors weighing whether to trust Datun at all.

### Sections/features (research: authentic, balanced, fresh, specific; no pressure gimmicks)

1. **Honest impact stats** — real, verifiable counters (consultations delivered · verified clinics · cities covered · average rating). No fabricated numbers.
2. **Aggregate rating + rating-distribution bar** — overall score + 5★→1★ breakdown (balanced; verified-patient only).
3. **Curated patient stories** — consented, real people (photo + specific outcome), pulled from **I7**; filterable by treatment.
4. **Verified-patient reviews aggregate** — surfaced from **C5** (verified-only, anti-fake, recency-weighted, balanced — not only positives).
5. **Media mentions / "As featured in"** — logos + links, **only as earned** (ties **J3**).

- **Charts/tables:** rating-distribution bar; honest stat cards (per Part 19).
- **Build:** SSR; aggregates **C5** (clinic reviews) + **I7** (curated stories) into a platform-wide view (single sources of truth, not duplicated); authentic (real/fresh/balanced/verified); **no FOMO/urgency/live-counter gimmicks**; ASCI/NMC/DPDP; → B1, C1.

## J3 — Press / Media `[WEB]`

**Purpose.** A credibility tool (journalists, bloggers, partners, investors, patients) + earned-media showcase. (~70% of journalists self-serve.)

### Sections/features (research: lead with coverage, effortless, current)

1. **Media-coverage logos + recent coverage** — _lead with this_ (third-party "borrow trust"), as earned.
2. **Boilerplate + mission** — concise who/what/why (Datun = India's verified dental platform; "Healthcare is a Right").
3. **Founder / leadership bios + headshots.**
4. **Fact sheet** — founding, milestones, **real key stats** (verified clinics, consultations, cities).
5. **Brand assets** — logo variations (PNG/SVG, horizontal/vertical/mono) + approved photos, **ZIP download + usage guidelines** ("how to refer to Datun; never alter/impersonate").
6. **Press releases** — 2-3 recent, categorized (as they exist).
7. **Press contact** — email + response-time expectation.

- **Charts/tables:** none.
- **Build:** SSR; `Organization` JSON-LD; effortless (no gates, ZIP, clearly-labelled files); kept current (stale = stale brand); **at launch (~15 Jul) coverage is thin → start with boilerplate + fact sheet + assets + contact, grow the coverage section as earned (honest — no faked logos)**; → A4, A5.

## J4 — Careers `[WEB]`

**Purpose.** Employer brand + hiring (67% of candidates check careers before applying); attract mission-driven talent. Ties to **Prasanth (joining 15 Jul)** + team growth.

### Sections/features (research order: EVP → culture → stories → benefits → roles → process → CTA)

1. **EVP hero** — a bold, mission-tied headline (not "Join Our Team"): "Build the platform that gives every Indian a dentist."
2. **Culture + values** — patient-first, verified-trust, honesty, access (same as A4); why the work matters.
3. **Real team stories** — authentic (founder + early team; real photos, human voice — "prove it, don't say it"; no stock).
4. **Benefits** — icons/cards, scannable.
5. **Open roles** — filterable by team (engineering/clinical/ops/design) + location; clean job cards (title/team/location/type) for self-selection.
6. **Hiring process timeline** — transparent steps (reduces friction + builds trust).
7. **Final CTA + "Notify me of new roles"** (passive-candidate capture).

- **Charts/tables:** none.
- **Build:** SSR; `Organization`/`JobPosting` JSON-LD (per live role); painless apply (test from mobile); findable (Company nav + footer); **at launch (small team) → lead with mission + culture + "join the journey / notify me" even with few or no live roles (honest)**; keep current (remove filled roles); → A4.

## J5 — Community / Awareness `[WEB]`

**Purpose.** Show the mission in action ("Healthcare is a Right") — real oral-health outreach, measured by what changed.

### Sections/features (research: outcomes over outputs; depth not breadth; authentic not performative)

1. **Mission-tied intro** — Datun's commitment to oral-health access.
2. **Programs** — oral-health camps, school/community education drives, awareness campaigns (focused themes, not scattered).
3. **Real stories + photos** — actual people/events (consented; no stock; no staged "performative" imagery).
4. **Outcomes** — what actually changed (people screened, follow-through, awareness) — **measured outcomes, not just "camps held"** (the 2026 CSR standard; honest — only real activities).

- **Charts/tables:** optional honest impact stats.
- **Build:** SSR; `Organization` JSON-LD; authentic + outcome-measured (not output-counting); on-mission; **can start small/aspirational and grow** (honest — never inflate); India CSR context (Companies Act Sec-135 if/when applicable); → A4, B1.

## J6 — Partners / "Verified on Datun" `[WEB]` _(clinic-outbound)_

**Purpose.** The public explainer for the **"Verified on Datun"** program — how clinics/dentists join Datun's verified network + display the co-branding badge. (Patient-side page is light; the detailed clinic onboarding lives on **clinics.datunai.com**, out of patient-side scope.)

### Sections/features

1. **What "Verified on Datun" means** — the verified badge a clinic earns + displays (in-clinic + online) so patients can validate legitimacy; extends Datun's trust layer.
2. **Why join** — verified-patient demand + discovery + a verified profile (C3) + bookings (D).
3. **How to join** — the verification path (→ **J1**) + apply.
4. **Co-branding / badge usage** — guidelines (correct usage, no alteration; protects brand integrity).
5. **Partner recognition** — partner logos / "trusted by" (as earned).

- **Charts/tables:** none.
- **Build:** SSR; `Organization` JSON-LD; **honest** (verified = credential legitimacy, **not** an outcome guarantee); primarily a cross-link to **clinics.datunai.com / "For Clinics"** (B2B detail is out of patient-side scope); authentic visuals; → external clinics site, J1.

---

## J.shared systems (apply across Family J)

- **Trust consistency:** the verification moat (J1) is the single source for what "verified" means everywhere (C2/C3 badges, A3 summary, J6 program, A1 trust block); trust strip/micro-row reused (Shell-3); design-consistent (signals operational maturity).
- **Honest proof discipline:** every number real + verifiable (no fabricated stats); every story consented (DPDP); media logos only as earned; **balanced + fresh + real-people** social proof (authenticity = the 2026 trust signal); realistic, non-guarantee claims (ASCI/NMC).
- **No pressure:** no FOMO/scarcity/urgency/countdowns/live-counters anywhere (calm health-trust brand; high-pressure reduces trust in care — A1 lock).
- **Honesty at launch:** Press (J3) coverage, Careers (J4) roles, Community (J5) programs all **start small and grow as earned** — never inflated or faked.
- **Compliance:** ASCI (no misleading), NMC (no guaranteed outcomes), DPDP (consent for stories/photos), never "AI"; "free" per refined rule.

## J.research-basis (Part 10)

~100+ sources synthesized across seven dense passes, including: **marketplace trust & "how we verify" pages** (trust as advertised differentiator + PwC 89% "sharing economy runs on trust" + 64% peer-regulation, verified badge as visible fraud-deterring signal clickable to a transparency page, credential verification for sensitive marketplaces = identity+license+qualifications+ongoing re-verification with "friction warranted when stakes high", transparency-builds-trust, Trust Center concept, healthcare trust-first ordering credentials→process→communication→action with realistic-claims-no-guarantees, membership/certification "borrow credibility" badges), **India dentist verification** (dual registration — doctors→NMC, **dentists→DCI/National Dental Commission + State Dental Councils** under the Dentists Act 1948; DCI's searchable **Indian Dentists Register** at dciindia.gov.in by reg-number/name/qualification/state; state-first→central sync; **primary-source verification = gold standard**; honest nuance that registration confirms licensed+qualified but not procedure-specific skill; no-registration = serious red flag; NABH/JCI clinic accreditation), **press/media pages** (`/press` as credibility tool for journalists+partners+investors, 70% self-serve, lead-with-coverage-logos, boilerplate + bios + fact sheet + brand-asset ZIP + usage guidelines + 2-3 categorized releases + contact-with-response-time, effortless + kept-current, grow-coverage-as-earned), **careers pages** (employer brand, 67% check before applying + 46% culture "very important", lead-with-mission/EVP not job-wall, EVP→culture→authentic-employee-stories→benefits→filterable-roles→hiring-process→CTA/job-alerts, authentic-over-polished "prove it don't say it", mission-driven magnet, findability, painless apply + passive capture, lead-with-mission-when-small), **CSR/community** (2026 shift to **outcome-measurement over spend/output** — "camps that treat once then disappear ≠ impact", depth-not-breadth + multi-year, healthcare CSR via mobile units/camps/screenings/awareness/telemedicine — SBI Sanjeevani/ICICI examples, India Companies Act Sec-135 2% CSR, authentic-not-performative, aspirational-district geographic gap), **partner programs** (partner badge = official designation validating legitimacy + trust symbol + extends brand reach, co-branding guidelines protect brand integrity "branch of the tree", simple/scalable/restrained badge design, partners-page two-audiences + searchable directory + authentic visuals, healthcare higher-reassurance bar, honest "verified ≠ outcome guarantee"), and **social-proof/trust hubs** (aggregate star rating + rating-distribution bar + honest impact stat-counters + wall-of-love + media-mention logos + filterable story hub, authenticity paramount — balanced-not-only-positive [95% suspect fake when no negatives] + real-people-not-stock [+35% trust] + specific-outcomes-over-vague + fresh [74% trust only <3-month] + verified-buyer badges, "a brand is what consumers tell each other it is", **avoid FOMO/urgency/live-counters for a calm health-trust brand**), plus prior trust/E-E-A-T/verification/reviews research (Parts 1/3/6/9: A3/A5, C5, the verification moat). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## J.interlink verification (Part 10)

- **Entries:** header **"Company" → About(A4)/Our Doctors(A5)/How we verify(J1)/Careers(J4)/Press(J3)/Contact(A7)**; footer "Legal & Trust" + trust micro-row; **A3 → J1** (summary→deep); **A1 "Why Datun" → A3 → J1**; **C2/C3 verified badge → J1** (badge meaning); **A1 stories teaser → I7 + J2**; **J6 → clinics.datunai.com / "For Clinics."** ✔
- **Exits:** J1 → B1 (Ask Datun) + C1 (Find a Dentist); J2 → B1/C1 (+ aggregates C5 reviews + I7 stories); J3 → A4/A5; J4 → A4; J5 → A4/B1; J6 → external clinics site + J1. ✔
- **Single-source-of-truth integrity:** J1 = the canonical definition of "verified" used by C2/C3 badges + A3 + J6; J2 aggregates C5 + I7 (does not duplicate them); A4/A5 (Part 1) own About/Mission/Our-Doctors, J deepens trust without overlap. ✔
- **Design-system interlinks:** verification diagram, trust strip, trust micro-row, stat cards, rating-distribution bar, patient-stories carousel, press-asset cards, role cards, CTA band = tokens/reusable components; tables/charts per Part 19; a11y per Part 13; mobile-first. ✔
- **Compliance:** realistic/non-guarantee claims (ASCI/NMC); honest real-stats-only (no fabricated numbers); consent for stories/photos (DPDP); verification = credential legitimacy honestly scoped (not a skill/outcome guarantee). ✔
- **Word checks:** "AI" absent (doctor-backed/medically-reviewed); **"free" per refined rule**. **No pressure tactics** (no FOMO/scarcity/urgency/live-counters — health-trust brand). **No regression to Parts 1–9:** Company nav, A3→J1, C2/C3 verified-badge sourcing, A1 trust block + stories teaser, A5 E-E-A-T, C5 reviews, I7 stories all land exactly as specified; J reuses them as single sources of truth. ✔

---

---

# PART 11 — FAMILY K: ENGAGEMENT `[BOTH]`

## K.0 — Family principles (engagement that serves health, monetization that never gates care)

_Family K is the **monetization + growth + support + light-tools** surface. The notification/reminder **engines already exist** (E9 notification center, E10 preference center, D6 reminder cadence) — Family K does **not** rebuild them; it adds the optional Pro plan (K1), referral (K2), the help center (K3), and light health tools (K4). `[BOTH]`-face (pricing + help are public marketing **and** in-app; referral + tools are in-app + shareable). Research-locked rules:_

- **Core care is never paywalled; "free" follows the refined rule (Design Part 12.5)** — not a promotional shout, but the included tier may carry a **"₹0"** label and the mission-truth **"always free for patients"** (stated with the funding model) is allowed. Datun's mission ("Healthcare is a Right") + India's monetization reality (Indians use health apps but resist paying monthly subscriptions; pure consumer-subscription is very hard here) mean the **core diagnosis/guidance is always unpriced** (may carry a "₹0" label per the refined rule). **Primary revenue = B2B clinic subscriptions (₹2,000/mo)**; the patient **Pro tier (₹99/mo) is a secondary, optional** stream of genuine convenience/value-adds that must **never gate diagnosis, safety, records, or routing.**
- **Engagement serves the patient's health, not vanity metrics.** Dental is **episodic + preventive** — Datun does **not** manufacture fake daily-engagement (that breeds notification fatigue = #1 uninstall). Honest engagement = preventive recall, oral-health-score progress (E2), a brushing habit (K4), records continuity (E3), and returning when a real need arises.
- **Ethical, value-first, no dark patterns.** Prove value before any ask (value-staging, not "basic vs paywall"); "earn without feeling like selling." Dignified gamification **tied to real outcomes** (real brushing, real check-ups — never fluff/badges-as-noise). Respectful, user-controlled notifications (the E9/E10 engine). No FOMO/scarcity/manipulation (health-trust brand; wellbeing-first per the constitution).
- **Growth via genuine value + trust** (referral framed on-mission, never incentivizing unnecessary care — ASCI/NMC). **Never "AI"** (doctor-backed/human support); mobile-first; 10 locales.

**Engagement system / entry points:** Pricing **"Plans"** (footer/Settings, public) → **K1**; **"Invite friends"** (in-app, post-value) → **K2**; **"Help"** (Shell-1/footer + **E10 Settings → K3 + I5**) → **K3**; **health tools** (dashboard E1 / Settings) → **K4**. Reminders/notifications = **E9/E10 + D6** (engine, not rebuilt here). WhatsApp support = the locked manual-support number (A6/A7). Tools deep-link → **B1** (Ask Datun) / **F** (education) / **E2/E3** (score/records) / **D** (booking).

---

## K1 — Pricing / Plans `[BOTH]` _(the optional Pro tier)_

**Purpose.** Present the optional **Datun Pro (₹99/mo)** upgrade honestly — while making unmistakably clear that **core dental care is not behind the paywall.**

### Sections/features (research anatomy: value-headline → objection → toggle → tiers → table → FAQ → CTA)

1. **Value-proposition headline** (not "Pricing"/"Our Plans" — reduce anxiety, reinforce value): e.g., "Datun works for you. Pro adds more."
2. **Objection-handling subheadline** — "Cancel anytime. No lock-in." + an explicit honesty line: **core dental guidance is always included for everyone.**
3. **Billing toggle** — monthly/annual, **annual default + "Save X%"** (annual = far lower churn; show the monthly-equivalent transparently — no hidden math).
4. **Tier cards (2–3)** — the **included Datun** (its real capabilities described; may carry a **"₹0"** label — refined rule, Design Part 12.5) + **Datun Pro** (highlighted/recommended with a badge + distinct color) + optional **annual/family** card. Named by outcome, not size.
5. **Comparison table** — ✓/– per capability, sticky subheaders, tooltips; **transparent "what Pro adds" + what's always included** (no hidden fees). Pro = genuine value-adds (e.g., richer records history, family profiles, advanced insights, priority support) — _never_ diagnosis/safety/routing.
6. **FAQ** — **directly above the final CTA** (not footer): "Is core care behind Pro?" (no), "Cancel anytime?" (yes), billing, etc.
7. **Final CTA** + a small honest trust line (real, no fake urgency).

- **Charts/tables:** plan **comparison table** (Part 19 styling).
- **Build:** SSR (public) + in-app upgrade; charm pricing (₹99); mobile-first (stack vertically, recommended-first, table→accordion, sticky toggle, 44-48px buttons); minimal nav on the page + anchor-TOC; social proof near CTA; **no FOMO/coercion**; no promotional "free" shout ("₹0" label allowed — refined rule); honest value-staging; payments per infra; → E10 billing.

## K2 — Referral / Invite `[BOTH]`

**Purpose.** Grow through trusted word-of-mouth — ethically, on-mission ("help someone you care about get a dentist"), never incentivizing unnecessary care.

### Sections/features (research: double-sided, India-true, a flow not a button)

1. **The offer (shown up front)** — **double-sided, equal reward** ("Invite a friend — you both get \_\_\_"); reward = a **Datun Pro credit / non-cash perk** (not cash — non-cash converts ~25% better, is on-brand, and avoids any incentive to over-consult). Shown **before** sign-up, not in a post-signup modal.
2. **Share mechanics** — unique link/code + **one-tap WhatsApp share (pre-filled message) + copy-link** (where Indians share; not email-first); on-brand, stays on Datun's surface.
3. **Status tracker** — invites sent / joined / reward earned (clear, simple).
4. **Rules (simple + honest)** — **flat per-referral** (no confusing tiers), **no expiry** (urgency → negative WOM in India), plain terms.

- **Charts/tables:** simple status list.
- **Build:** ask at **peak enthusiasm — day-3 / post-first-value** (after a completed consult/report), not day-1; **fraud-gated** (phone-OTP + a genuine first action before reward releases); **healthcare ethics — reward is for _joining Datun_, never for driving a paid consult/treatment** (ASCI/NMC); DPDP-safe; WhatsApp via approved template; → E9 (reward notification), K1 (Pro credit).

## K3 — Help Center / Support `[BOTH]`

**Purpose.** Let patients self-solve (deflection) and reach a human easily when needed. (Distinct from **I5** marketing-FAQ; they cross-link.)

### Sections/features (research: searchable KB + visible escalation + maintained)

1. **Prominent search** — plain-language, typo-tolerant, **multilingual**; common tasks surfaced below it.
2. **Top-level categories (few, shallow, intent-organized)** — Getting started · Ask Datun (the diagnosis) · Finding & booking a dentist · Your records & Oral Health Score · Plans & billing · Privacy & data (DPDP) · Account · Troubleshooting.
3. **Article pages** — **short keyworded titles** (match what users search), plain-language explanation first → steps; **related articles** sidebar; **"Was this helpful?"** feedback.
4. **"Still need help?" → contact (visible on every page)** — **WhatsApp manual-support (primary, India) + email** (phone clickable on mobile); honest **response-time expectation**; context-preserving human handover (no repeating).
5. **System status** (uptime/incidents) — honest.

- **Charts/tables:** none.
- **Build:** public + in-app; intent-organized shallow IA; **maintained as infrastructure** (owner + review cadence + analytics: deflection/search-success/dead-end-queries; stale = trust loss); zero-distraction; mobile-first; **distinct from I5** (marketing-FAQ) but cross-linked; **E10 Settings "Help" → K3 + I5**; never "AI" (human/doctor-backed support presented); → A6/A7 (contact), M11 (WhatsApp).

## K4 — Health tools `[APP]` _(optional, light + useful)_

**Purpose.** Small, genuinely useful preventive-care tools that build a healthy habit — dignified, not childish.

### Sections/features (research: oral-health gamification works; keep it dignified + outcome-tied)

1. **Brushing timer** — a calm 2-minute guided timer (optional technique tips) — evidence-backed for improving brushing.
2. **Check-up / recall reminder setup** — set a dental check-up reminder (ties **E9/E10 + D6**; user-chosen, honest, not nagging) → book via **D**.
3. **Oral-health quiz / self-assessment** — a short, educational self-check → routes to **Ask Datun (B1)** or **education (F)**; quiz format lifts engagement + awareness.
4. **Optional brushing/habit streak** — **dignified, non-competitive, no-shame** (missed days = gentle "signals," never penalties; endowed-progress encouragement) — ties **E.0 dignified light gamification + E2 score**.

- **Charts/tables:** optional gentle streak/progress (Part 19; honest, never color-only).
- **Build:** real client-side tools (timer/quiz) + reminders via the E9/E10/D6 engine (no faked features — locked rule); **Headspace/Habitify-style dignified** (not childish; no leaderboards/social-comparison); **outcome-tied** (real brushing/check-ups, not fluff); honest; a11y; → B1, F, E2/E3, D, E9/E10.

---

## K.shared systems (apply across Family K)

- **Engagement ethics:** value-first, no dark patterns, no FOMO/manipulation; dignified gamification **tied to real outcomes**; respectful + user-controlled notifications via the **E9/E10 + D6 engine** (Family K never rebuilds the engine); wellbeing-first (constitution); honest about dental being **episodic/preventive** (no manufactured daily-engagement).
- **Ethical monetization:** **core care never paywalled**; no promotional "free" shout ("₹0" label + mission-truth allowed — refined rule); Pro = optional value-staging; **B2B (₹2,000/mo) is primary**, patient Pro (₹99/mo) secondary; transparent (show prices, what's-in/out, no hidden fees, no coercion).
- **Growth ethics:** referral is on-mission, double-sided, **never rewards a medical act** (ASCI/NMC), fraud-gated, no-expiry.
- **Support:** self-service-first + easy human backstop (**WhatsApp-primary** + email); context-preserving handover; honest response times; maintained KB.
- **Compliance:** ASCI (no misleading/coercion), NMC (no incentivized care), DPDP (consent for referral/notifications; preference center), never "AI"; "free" per refined rule. Mobile-first; 10 locales.

## K.research-basis (Part 11)

~150+ sources synthesized across eight dense passes, including: **pricing-page design** (3-tier optimal — 1.4× vs 2-tier, 4+ converts 31% worse/decision-paralysis, center-stage→middle; anatomy value-headline→objection-subheadline→annual-default-toggle-with-savings→tier-cards-with-recommended-highlighted→comparison-table-with-sticky-subheaders-and-tooltips→FAQ-directly-above-final-CTA; highlight-recommended-not-cheapest-not-priciest as top conversion lever; name-by-outcome-not-size; annual default churn 5-10% vs 30-50% monthly + worth 25-30% more; honest anchoring no-fake-anchors; charm pricing; transparency-builds-trust; mobile-first 58-60% stack-vertical + accordion + sticky-toggle + 44-48px + test-on-real-phone; social-proof near CTA +10-20%; minimal-nav + anchor-TOC), **health-app monetization in India** (Indians use health apps freely but resist monthly subscriptions — healthcare subsidized/negotiated/insured → pure consumer subscription very hard; models that work = B2B2C / transactional / insurance-integration / condition-specific [chronic ₹500-1500/mo]; freemium→paid 2-5%; **ethical value-staging not basic-vs-paywall, prove-value-before-paywall, "earn without feeling like selling", never gate basic care**; localized India pricing +15-40%; iOS-ARPU>Android; Headspace compassionate/never-abrasive + family/student/corporate bundles; subscription-fatigue/refund-fraud/high-CAC risks; ABHA/ABDM + insurer outcome-linked future scale — validating Datun's B2B-primary + unpriced-core architecture), **referral programs** (double-sided dominates 90%+ + "gift not selling out a friend" + 74% won't refer without reward [Yale/Berkeley/Harvard], Dropbox 3900%/15mo mutual-product-benefit, Tesla status/non-cash, non-cash perks ~24-25% better than cash + store-credit/loyalty-points, reward<CAC-but-feels-substantial, ask-at-peak-enthusiasm post-purchase/post-5★/repeat, "a flow not a button," keep-on-brand/on-site, fraud = 21% of e-comm + OTP/verification/first-action gate balanced against 15-20% legit-loss) and **India referral specifics** (Meesho 50M via "get ₹X + ₹Y per friend NOW" instant-UPI honest economics; single-sided fails at scale; double-sided +40-60% K-factor; show-incentive-before-signup; ask-day-3-post-first-value-not-day-1; flat-per-referral-not-tiered; no-expiry-trap; WhatsApp+clipboard not email; K-factor 0.5-1.2 realistic/target 0.8-1.2/>1 cuts CAC 30-40%; Groww "refer your parents" real-social-structure; healthcare-ethics = never reward unnecessary care), **help center / knowledge base** (public self-service KB for ticket-deflection distinct from short FAQ + from internal KB; 84% try self-solve first + 91% would use a good KB but only ~20% rate own KB very-accurate; quality+findability>quantity — 50 well-organized + good search beat 200 broken; intent-organized few-shallow-categories + prominent-search + lifecycle-IA + related-article-links; short-keyworded-titles matching search + plain-language-first + steps + "was-this-helpful"; visible contact path on every page reduces contact rates; maintained-as-infrastructure with owner+cadence+analytics — deflection/search-success/dead-end-queries; zero-distraction [Linear] + tab-split-for-breadth [Revolut]), **customer support / WhatsApp** (omnichannel one-continuous-conversation no-repeating-no-lost-context — 90% expect cross-channel consistency + 60% switch after poor support; WhatsApp-primary for India handling voice-notes/images/PDFs; escalation/handover quality = full-transcript + structured-summary so customer never repeats + channel-aware; visible-contact + honest-per-channel-response-times; self-service-first + human-backstop), **health-app engagement tools / oral-health gamification** (peer-reviewed: brushing-frequency 67.3% twice-daily vs 42.1% control p<0.001 + tele-dentistry +34.8% preventive-visits + gamification/personalized-feedback/progress-tracking/quizzes/integrated-appointments effective; habit = systems-problem [cues/rewards/friction-reduction/identity] not willpower; **dignified non-childish gamification** — Headspace non-competitive-badges + endowed-progress + gentle + no-leaderboards/shame, Habitify/Atoms professional-restraint + missed-days-as-signals-not-failures + psychologically-safe, Calm personalized-reminders→3×-retention; avoid guilt/shame/penalties/social-comparison/excessive-gamification-fatigue), and **retention / engagement ethics** (retention>acquisition post-ATT CAC-spike + Day-30 avg 6-7%/top-22%; "aha-moment"-fast + habit-loops + first-week-habit-building; **tie gamification to real outcomes not fluff/noise**; notifications double-edged +88%-done-right-vs-uninstalls-done-poorly + respectful/user-controlled/context-aware/human-voiced; **ethical "treat users like people not datapoints" + no dark patterns**; episodic-vs-fake-daily-engagement honesty), plus prior engagement research already in this doc (D6 reminder cadence ~100 sources, E9/E10 notifications + preference-center + DPDP ~100 sources, I newsletter double-opt-in). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## K.interlink verification (Part 11)

- **Entries:** Pricing "Plans" (footer/Settings, public) → **K1**; "Invite friends" (in-app, post-value) → **K2**; "Help" (Shell-1 + footer + **E10 Settings → K3 + I5**) → **K3**; health tools (E1 dashboard / Settings) → **K4**. ✔
- **Exits:** K1 → E10 billing; K2 → E9 (reward notification) + K1 (Pro credit) + WhatsApp share (M11); K3 → A6/A7 (contact) + WhatsApp (M11) + cross-link I5; K4 → B1 (Ask Datun) + F (education) + E2/E3 (score/records) + D (booking) + E9/E10/D6 (reminders). ✔
- **Engine ownership (no duplication):** the notification/reminder **engine is E9 + E10 + D6** (built in Parts 4–5); Family K **uses** it (K2 reward alerts, K4 recall reminders) but does **not** rebuild it. ✔
- **Source-of-truth integrity:** **I5** = marketing-FAQ (answer-first/GEO, Part 9); **K3** = deeper support KB — distinct, cross-linked, both reachable from E10 Help. Pro-tier billing/consent self-service lives in **E10** (Part 5); K1 is the marketing/upgrade surface. ✔
- **Design-system interlinks:** comparison table, tier cards, billing toggle, share sheet, status list, KB search + article + accordion, brushing-timer, quiz, gentle streak = tokens/reusable components; tables/charts per Part 19; a11y per Part 13; mobile-first stack/accordion. ✔
- **Compliance & ethics:** **core care never paywalled**; Pro never gates diagnosis/safety/records/routing; referral never rewards a medical act (ASCI/NMC); DPDP (referral/notification consent + preference center); dignified gamification (no shame/penalty); respectful notifications (user-controlled). ✔
- **Word checks:** **"free" per refined rule** (core care unpriced; included tier may show "₹0"; mission-truth "always free for patients" allowed with the funding model; no promotional "free" shout); **"AI" absent** (human/doctor-backed support). **No dark patterns / no FOMO / no manufactured daily-engagement.** **No regression to Parts 1–10:** E9/E10 notifications + D6 reminders + I5 FAQ + I newsletter + E.0 dignified-gamification + A6/A7 WhatsApp support all land exactly as specified; K reuses them as single sources of truth. ✔

---

---

# PART 12 — FAMILY L: LEGAL / COMPLIANCE / UTILITY `[WEB]`

## L.0 — Family principles (mandatory India compliance = legal protection + trust)

_Family L is the legal/compliance/utility backbone — mandatory in India, where **health data is high-risk under the DPDP Act** (penalties up to ₹250cr) and teleconsultation is governed by **NMC**. These pages are `[WEB]`-face (public, SSR, crawlable), reached from the **Shell-2 footer "Legal & Trust" column**, **E10 Settings**, **A7 Contact**, and the consent/disclaimer points across **B/D/F/G**. Research-locked rules:_

- **Compliance is a trust-builder, not just a checkbox.** Transparent, plain-language legal pages reduce patient disengagement and build trust; treat them with the same design care as the product (transparency = a core design pillar).
- **Every L page carries:** a **plain-language summary at top**, a visible **"Last updated" date + change-log/version history**, a **table-of-contents / anchor links**, **scannable sections**, plain-language link labels, how-users-are-notified-of-changes, and a **contact**. Plain language throughout (not legalese), **multilingual (10 locales)**, **accessible (WCAG 2.2 AA — ties L8/Design 13)**, mobile-first, lightweight, no pop-ups. **No graphs/tables.**
- **Standalone, separate pages — never bundled.** DPDP Rule 3 requires the privacy notice to be standalone + independently understandable; each policy lives at its own clean URL (`/privacy`, `/terms`, …), all surfaced in the footer.
- **Honest doctor-backed framing** (the diagnosis is a real clinician-backed clinical service; the educational libraries are information-not-advice — the disclaimer distinguishes them). **Never "AI"** (doctor-backed/clinician-reviewed) and **no "free"** in legal copy (per the refined rule, Design Part 12.5). Maintained + reviewed as law evolves (DPDP full compliance **May 13, 2027**).

**Legal system / entry points:** **Shell-2 footer "Legal & Trust"** → all L1–L10; **A7 Contact → L5** (grievance officer); **B2a / D2 / D5 consent → L1 + L4**; **B5 PDF + F/G content + footer one-liner → L3**; **E10 Settings DPDP self-service → L1 / L4 / L5 / L9**; **I5 privacy FAQs → L1/L7**; cookie banner (site-wide) → **L7**. Reuses: legal-page template (summary + last-updated + TOC + sections + contact), footer column, consent components.

---

## L1 — Privacy Policy `[WEB]` _(DPDP Act 2023 + Rules 2025)_

**Purpose.** The standalone, DPDP-compliant privacy notice — the trust anchor for health data.

### Sections/features (research: DPDP Rule 3 + layered privacy-by-design)

1. **Plain-language summary** (top) + last-updated + change-log + TOC.
2. **Itemized data we collect** (account, health intake from B2a, photos, usage) + **specific purposes** + **what each enables** (DPDP Rule 3 minimums).
3. **Legal basis** — consent (+ limited legitimate uses); consent is **free, specific, informed, unconditional, affirmative**.
4. **Your rights** — access · correction · **erasure** · **data portability** · **nominate a nominee** · grievance — _with how to exercise each_ (→ **L9 / L5**).
5. **Withdraw consent** — **as easy as giving it** (→ E10 consent dashboard); withdrawing one consent doesn't break unrelated services.
6. **Complain to the Data Protection Board** — how + when (after exhausting Datun's grievance, → L5).
7. **Retention** — purpose-specific; deleted when no longer needed / on withdrawal; **48-hour pre-erasure notice**; logs ≥1 year.
8. **Security (privacy-by-design)** — encryption, minimization, least-privilege, audited disclosures/access-log, verifiable deletion, screenshot-block on sensitive views, processor contracts.
9. **Breach approach** — notify Board + affected without delay; 72-hour detailed report.
10. **Children & persons with disabilities** — verifiable parental/guardian consent; **no profiling/targeted-ads of minors** (Datun applies parental consent for dependent profiles conservatively, even though healthcare has a narrow carve-out).
11. **Cookies** (→ L7), **third parties / clinics** (consent-based sharing), **contact / Data Protection Officer / point-of-contact**.

- **Build:** SSR; standalone clean URL; **layered + plain-language + multilingual (10 locales / 22-language-ready)**; honest description of automated processing (truthful, DPDP-compliant; framed clinician-reviewed — never the "AI" brand word); **architected for SDF obligations** (DPO/DPIA/audit) if later designated; in-app self-service lives in **E10**, public rights-request in **L9**. → L4/L5/L7/L9, E10.

## L2 — Terms of Service `[WEB]`

**Purpose.** The master agreement — honest about Datun's doctor-backed role, with reasonable, enforceable limits.

### Sections/features (research: CPA 2019; reasonable enforceable limits; honest middle, not pure-facilitator)

1. Acceptance & **eligibility** (18+; minors via verifiable parental consent).
2. **Description of services** — doctor-backed diagnosis + directory/booking + records; **honest role**: registered dental practitioners provide the clinical diagnosis; Datun is responsible for platform + service standards (_not_ the pure-facilitator "doctor solely liable, platform has no role" language that would contradict the brand).
3. Account & registration; **acceptable use**.
4. **Diagnosis-service terms** + **prescriptions** (NMC scope — Lists O/A/B, never Schedule X).
5. **Payments & subscription** (Pro — → K1 / L6).
6. **No-emergency** clause (→ M9 / L3).
7. IP; **third-party clinics** (verified network; Datun's role honestly scoped).
8. **Disclaimers (→ L3)**; **limitation of liability** — _reasonable + enforceable; cannot exclude liability for negligence causing injury/death_ (CPA 2019).
9. Indemnity; termination (survival of disclaimer/IP/liability clauses).
10. **Governing law + jurisdiction (India)**; **grievance (→ L5)**; changes (notice + change-log); contact.

- **Build:** SSR; plain-language; last-updated + change-log; **honest doctor-backed liability stance** (not boilerplate facilitator disclaimer); → L1/L3/L5/L6, K1, M9.

## L3 — Medical Disclaimer `[WEB]`

**Purpose.** Set scope + emergency limits honestly — distinguishing educational content from the real clinical diagnosis.

### Sections/features (research: 9 standard sections; emergency clause indispensable; honest content-vs-diagnosis distinction)

1. **No medical advice (educational content)** — articles/guides/cost-info (F/G/I) are **general information, not a substitute** for professional advice or a clinical diagnosis.
2. **The diagnosis is different** — when you use **Ask Datun**, a **registered dental practitioner reviews and provides your diagnosis** (a real clinical service, governed by **L4**) — _this honest distinction protects the doctor-backed brand._
3. **Seek professional advice**; **use at own risk**; **no warranties**; **limitation of liability** (+ exceptions — can't exclude negligence-injury/death).
4. **Medical emergencies (indispensable)** — for emergencies, Datun is not the resource → **contact local emergency services** (→ **M9**; matches footer one-liner).
5. **Third-party content**; **changes**; **contact**.

- **Build:** SSR; plain-language; **displayed prominently** — footer one-liner (Shell-2) + at the start of F/G/I content + on the B5 PDF; last-updated; honest; → M9, L4, F/G/I.

## L4 — Telemedicine Consent `[WEB]` _(NMC Telemedicine Practice Guidelines)_

**Purpose.** The NMC-compliant consent for the teleconsultation / doctor-backed diagnosis.

### Sections/features (research: NMC 2020, governs 2026 "as amended")

1. **Patient identification** — photo ID or **ABHA ID** (ABDM-ready).
2. **Explicit informed consent** to teleconsultation (recorded where applicable; explicit for sensitive cases).
3. **What the service is / isn't** — doctor-backed diagnosis by an **RMP enrolled with NMC/state council**; same standard as in-person; **not for emergencies** (→ M9); **within India only** (relevant to Family N tourism).
4. **Prescription scope** — Lists O/A/B; **never narcotics/psychotropics/Schedule X**; secure e-Rx sharing.
5. **Records ≥ 3 years** (NMC); **data handling per DPDP (→ L1)**.
6. **RMP registration disclosed**; **right to in-person referral** where indicated.

- **Build:** SSR consent page/flow; referenced at **B2a / D2 / D5** consent steps; ABDM/ABHA-integration-ready (consent-based record sharing — ties E3 portability); → L1, M9, B/D.

## L5 — Grievance Redressal `[WEB]` _(consolidated: DPDP + IT Rules + Consumer Protection)_

**Purpose.** One clear, accessible grievance page satisfying all three Indian regimes.

### Sections/features (research: DPDP S.8(10)/13 + IT Rules 2021 + CP E-Commerce Rules 2020)

1. **Named Grievance Officer (India-resident)** + **published contact** (name, designation, email, postal address) — on website **and** app, not buried.
2. **How to file** (form / email) + what to include (identifier).
3. **Timelines (clear + published)** — **acknowledge within 24–48 hours** (tracking number + point-of-contact + expected resolution window); **resolve** within the prescribed period (DPDP grievances/rights handled promptly — analyses cite ~7 working days; IT-Rules 15 days; consumer 1 month — Datun publishes its committed timeline).
4. **DPO contact** for data-protection grievances (DPDP Article 13).
5. **Escalation** — internal appeal → then **Data Protection Board** (data) / **consumer forums + e-Daakhil + National Consumer Helpline 1915** (consumer); **exhaustion-of-remedies** (Datun first).

- **Build:** SSR; dedicated accessible page; **grievance log** (date/nature/resolution — compliance record); ties **A7 Contact**, **E10 Settings** (tracking-ID + DPO + status), **L1** (privacy grievance), **L6** (refund grievance).

## L6 — Refund / Cancellation `[WEB]`

**Purpose.** Honest, RBI-compliant refund/cancellation rules — no subscription traps.

### Sections/features (research: CPA 2019 + RBI/UPI-Autopay + SaaS best practice)

1. **Pro subscription** — billing cycle, renewal, **cancellation (self-service, as easy as enrolment)**, refund window/stance (a ~14-day-style window where applicable; **credit-as-option, never forced**).
2. **Auto-renewal compliance** — **24-hour pre-debit notification** (RBI/NPCI UPI Autopay); price + frequency disclosed before; **pre-renewal reminders (7-day + 1-day)**; modify/revoke mandate anytime; **no "subscription trap"** (CCPA Dark Patterns 2023).
3. **Clinic-booking cancellation** — fair, pre-shown policy (ties **D4**); refunds per clinic terms.
4. **Consultation stance** — honest refund position (core care is unpriced; this covers any paid consult/Pro).
5. **How to request** + timeline + **account-termination effects** (access/data — can download records, → E3/L9) + **grievance (→ L5)**.

- **Build:** SSR; plain-language; accessible separately + referenced at checkout; **easy self-service cancel** (hard-to-cancel → chargebacks, not retention); **no "free trial" wording** (per the refined rule — frame the trial without the promotional word); honest, no dark patterns (ties K.0); → K1, D4, L5, E3/L9.

## L7 — Cookie Policy `[WEB]` _(+ consent banner)_

**Purpose.** DPDP-aligned cookie transparency + ethical consent.

### Sections/features (research: DPDP + MeitY BRDCMS + ASCI; no dark patterns)

1. **What cookies we use** — categorized: **Essential** (no consent) · **Analytics/Performance** · **Functional** (advertising minimized — health-trust brand) — each with data, purpose, duration.
2. **Consent banner** — **Accept / Reject / Customize**, **equally prominent** (no big-green-accept + tiny-gray-reject), **granular opt-in**, plain-language, **multilingual (10 locales)**, link to this policy + L1; **no cookie-walls / no dark patterns**.
3. **Manage / withdraw anytime** (preference center → E10) + **single-click withdrawal**; **consent logged** (what/when/how) + **auto-expiry**.

- **Build:** SSR policy + site-wide banner; DPDP/BRDCMS-aligned; consent-manager-integration-ready (Nov 2026 framework); → L1, E10.

## L8 — Accessibility Statement `[WEB]` _(WCAG 2.2 AA + IS 17802 + RPwD Act)_

**Purpose.** Declare accessibility commitment honestly (legal under RPwD/IS-17802; ties Design Part 13.2).

### Sections/features (research: W3C + IS-17802/GIGW + honest-conformance)

1. **Commitment** to inclusive access.
2. **Conformance + standards** — **WCAG 2.2 AA + IS 17802**, RPwD-Act-aligned; **honest status** ("we aim to conform / partial / X% met" — legally safer than false "fully compliant").
3. **Scope** — datunai.com website + PWA app + PDFs + videos.
4. **Specific measures** — screen-reader support (NVDA/JAWS/VoiceOver/TalkBack), keyboard navigability, 4.5:1 contrast, captions + transcripts (I6), resizable text, semantic HTML/ARIA, **multilingual + voice-input** (low-literacy — ties B/voice + Design 13).
5. **Known limitations + remediation timeline** (honest, no "no barriers" claim).
6. **Feedback & grievance contact + response time** (→ **L5 / A7**).
7. **Testing methods** (automated + manual screen-reader + user testing + audit) + **last-reviewed + next-review** date.

- **Build:** SSR; plain-language; reflects what's actually built (Design Part 13.2); honest; → L5, A7, Design 13.

## L9 — Data request / export / delete `[WEB]` _(DPDP self-service — public entry)_

**Purpose.** The public rights-request entry point (mirrors the in-app E10 self-service).

### Sections/features (research: DPDP rights + single-DSAR pipeline)

1. **Request types** — access · correction · **erasure** · **portability (export all records)** · nominate-nominee · grievance.
2. **How to submit** — published mechanism + **identifier** (DPDP Rule); identity verification.
3. **Timeline** — within the prescribed period (90-day outer bound; rights handled promptly); status/tracking; denial reasons cite the legal basis.
4. **Single pipeline** — authenticate → search all systems + processors → fulfill → record proof.

- **Build:** SSR public page + form; **mirrors E10 in-app DPDP self-service** (single source of truth — same backend pipeline); → L1, L5, E10, E3 (records export).

## L10 — HTML Sitemap `[WEB]`

**Purpose.** A human-readable structural map (users + crawlers) — complements the XML sitemap (infra, 80 URLs).

### Sections/features

1. **Curated structural map** — top-level families + key pages: Home · How it works · Find a Dentist · Learn (Conditions/Treatments/Symptoms/Cost/Blog/Glossary/FAQ) · Company (About/Our Doctors/How we verify/Careers/Press/Contact) · Legal & Trust (all L1–L10) · Featured cities (local hub) · Datun Answers (Q&A).
2. **Clean, scannable, linked**; reinforces IA; navigation redundancy.

- **Build:** SSR; human-readable (curated, not every programmatic page); footer-linked; complements XML sitemap + robots.txt (infra); → all families.

---

## L.shared systems (apply across Family L)

- **Legal-page UX (every page):** plain-language (not legalese) · **last-updated + change-log/version history** · **plain-language summary at top** · **TOC/anchor links** · scannable sections · plain-language link labels · how-changes-are-notified (banner/email/in-app) · contact · **standalone clean URLs (never bundled — DPDP Rule 3)** · all in **Shell-2 footer "Legal & Trust"** · accessible (WCAG 2.2 AA) · multilingual (10 locales) · mobile-first · lightweight · no pop-ups · maintained/reviewed as law evolves.
- **Compliance coverage:** **DPDP Act 2023 + Rules 2025** (L1/L7/L9 — full compliance May 13 2027) · **NMC Telemedicine Guidelines** (L4) · **Consumer Protection Act 2019 + E-Commerce Rules 2020** (L2/L5/L6) · **IT Rules 2021** (L5) · **RPwD Act 2016 + IS 17802** (L8) · **ASCI** (no misleading — across L2/L6) · **RBI/NPCI UPI-Autopay** (L6).
- **Brand discipline:** **never "AI"** (doctor-backed/clinician-reviewed) · **"free" per refined rule** (no promotional "free" in legal) · honest doctor-backed framing · no dark patterns (L6/L7) · honest accessibility conformance (L8).

## L.research-basis (Part 12)

~150+ authoritative sources synthesized across eight dense passes, including: **DPDP Act 2023 + DPDP Rules 2025** (MeitY notification Nov 13 2025 + phased rollout to full compliance May 13 2027 + Data Protection Board live + consent-manager framework Nov 2026; **Rule 3 privacy-notice requirements** — standalone + independently-understandable + clear-plain-language + itemized-data + specific-purposes + what-data-enables + how-to-exercise-rights + withdraw-consent-as-easy-as-giving + complain-to-DPB + communication-link/DPO-contact + English-or-22-Eighth-Schedule-languages; consent free/specific/informed/unconditional/affirmative; rights access/correct/erase/**nominate-nominee**/portability/grievance via published-mechanism+identifier within 90 days; **breach notify-Board+affected-without-delay + 72-hr-report + report-ALL-breaches**; retention purpose-specific + delete-when-done + **48-hr-pre-erasure-notice** + logs-≥1yr + certain-large-fiduciaries-delete-after-3yr; **children <18 verifiable-parental-consent + no-profiling/targeted-ads** with healthcare-essential-service carve-out; persons-with-disability guardian-consent; no-explicit-sensitive-category-but-health-high-risk; **SDF** DPO-in-India+independent-auditor+annual-DPIA+algorithmic-fairness+Board-reporting; penalties up to ₹250cr/₹200cr-children/₹50cr-other; Data-Fiduciary-accountable-even-via-processor + valid-contracts+security-provisions — sources incl. PIB/MeitY, EY, DLA Piper, Lexology/Fox Mandal, Securiti, CookieYes, Fisher Phillips, Recording Law, indiadpdpa.com), **privacy-policy UX + health-data** (layered-policy [essential-upfront+details-in-sections+icons-for-data-flows], transparency-reduces-patient-disengagement, privacy-by-design [privacy-by-default/minimal-collection/encryption+tokenization/least-privilege/audited-disclosures/verifiable-deletion/screenshot-block/processor-contracts], consent-integrity-across-systems, single-DSAR-pipeline authenticate→search-all→fulfill→record, scoping-review on plain-language+layered+visual), **Terms of Service for telemedicine/health-apps India** (CPA-2019-governs; liability-limits-reasonable+enforceable + **cannot-exclude-negligence-injury/death**; standard telemedicine clauses [platform-vs-RMP roles, no-emergency, no-Schedule-X, indemnity, jurisdiction-India, survival]; **Datun-must-not-copy pure-facilitator "doctor-solely-liable" language** — honest doctor-backed middle; sections acceptance/eligibility/services/account/acceptable-use/diagnosis-terms/payments/prescriptions/no-emergency/IP/third-party/disclaimers/liability/indemnity/termination/governing-law/grievance/changes/contact — CMS/Cloudnine/Included-Health examples), **medical disclaimer** (informational-not-advice + not-a-substitute + **emergency-clause-indispensable** + own-risk + no-warranties + limitation-of-liability + 9-standard-sections; **disclaimer-can't-exclude-negligence**; consumer-facing-simpler-phrasing-ok; display-prominently-footer+content-start; **nuance: disclaimer covers educational content, the Ask-Datun diagnosis is a real doctor-backed clinical service** — seqlegal/Termly/TermsFeed/WebsitePolicies), **NMC Telemedicine Practice Guidelines 2020 (govern 2026)** (RMP-NMC/state-council-enrolled, identity photo-ID/ABHA + explicit-informed-consent [implied-if-patient-initiates/explicit-for-sensitive], first-consult-via-telemedicine-ok, medicine-Lists-O/A/B + Prohibited/Schedule-X, records-≥3yr, secure-Rx, liability-physician's-clinical-decisions, **not-for-emergency**, **within-India-only**; ABDM/ABHA 840M+ IDs increasingly-mandatory-for-govt-schemes + consent-based-record-sharing/UHI = future; DPDP-governs-health-data — Doccure/Adrine/CMS), **grievance redressal (three regimes)** (**DPDP S.8(10)+13** named-Grievance-Officer + published-contact + ack-24-72hr-with-tracking + resolve-within-prescribed-period [~7-working-days-cited / 90-day-for-some] + exhaustion-of-remedies + log + internal-appeal + SDF-senior-DPO; **IT Rules 2021** Resident-Grievance-Officer-India-resident + publish-details + **ack-24hr-resolve-15-days** + significant-intermediary-CCO/Nodal/monthly-report; **Consumer Protection E-Commerce Rules 2020** Grievance-Officer + prominent-display + **ack-48hr-redress-1-month** + display-refund/return/grievance + no-unfair-trade + CCPA-enforcement + NCH-1915-17-languages + e-Daakhil — NLIU/KS&K/WatchDog/Blutic/consumerprotection.in/PIB), **refund/cancellation India** (**CPA-2019 + E-Commerce-Rules-2020** clear-accessible-policy + can't-refuse-defective + ~15-day-goods-return + cooling-off; **SaaS/subscription = license-not-goods** → policy-best-practice-not-auto-mandatory + must-refund-if-faulty; **RBI-Framework + NPCI-UPI-Autopay** 24-hr-pre-debit-notice + AFA-first-debit + revoke-anytime + undisclosed-auto-renewal=violation+subscription-trap [CCPA-Dark-Patterns-2023]; auto-renewal-legal-only-if disclosed-before+price/frequency-visible+pre-debit-reminder+cancel-as-easy-as-enrol; SaaS-clauses refundable-items/how-to-request/timeline/account-termination-effects/trial; **14-day-window-sweet-spot**; **credit-as-default-never-forced** [30-40%-accept]; **pre-renewal-reminders-7d+1d**; easy-self-service-cancel; fraud-flag->2-3-refunds/12mo; NCH-1915/e-Daakhil/chargeback — righttoinformation.wiki/Dodo/TermsFeed/legalserviceindia), **cookie policy + consent (India)** (DPDP-doesn't-name-cookies-but-personal-data-cookies-need-consent; **MeitY BRDCMS Apr-2025 + ASCI** require granular-consent + explicit-opt-in + auditable-logging + auto-expiry + preference-center/dashboard + no-dark-patterns/cookie-walls; banner **Accept/Reject/Customize-equally-prominent** + plain-language + **multilingual-22-languages + single-click-withdrawal**; classify Essential/Analytics/Functional/Advertising; enforcement Google-€325M/Amazon-€35M; Consent-Managers-India-incorporation-₹2cr — consent.in/CyberPeace/Secure-Privacy/Leegality/Ardent), **accessibility statement (India)** (**RPwD Act 2016** Sec-40-46 barrier-free-digital-access-for-private-entities-serving-public + healthcare-explicitly-named; **IS 17802** BIS-national-ICT-standard legally-enforceable-via-RPwD-Amendment-2023 + WCAG-aligned + India-multilingual; **GIGW 3.0**; **WCAG 2.2 AA**; statement = commitment + **honest-conformance** [aim/partial/X%-met-legally-safer-than-false-fully-compliant] + scope-web/app/PDF/video + **specific-measures** [screen-reader/keyboard/4.5:1-contrast/captions/resizable/ARIA/multilingual] + **honest-known-limitations+remediation** + **feedback/grievance-contact+response-time** + testing-methods + last-reviewed/next-review; CCPD-fined-₹10k-repeat-₹5L; SEBI-mandate-direction — DigitalA11Y/Continual-Engine/Pivotal/BrowserStack/AllAccessible/india.gov.in-GIGW), and **legal-pages UX + footer + HTML sitemap** (legal-pages-are-UX-not-checkboxes + transparency-core-design-pillar; **plain-language + last-updated + change-log + summary-at-top + TOC/anchors + scannable + plain-link-labels + notify-on-change + contact**; **don't-bundle-policies-separate-clean-URLs-conspicuous-in-footer**; **footer = home-for-legal/compliance-links** [sitemap-lite/fat-footer reflects-IA + crawlability + fallback-nav]; **HTML-sitemap** = human-readable-curated-structural-map complementing-XML-sitemap + navigation-redundancy + crawlability; SSL/HTTPS + maintained — TermsBox/Eleken/medium-design-bootcamp/CookieYes/accessiBe/DesignPowers). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## L.interlink verification (Part 12)

- **Entries:** **Shell-2 footer "Legal & Trust"** → L1–L10; **A7 Contact → L5**; **B2a / D2 / D5 consent → L1 + L4**; **B5 PDF + F/G content + footer one-liner → L3**; **E10 Settings DPDP self-service → L1 / L4 / L5 / L9**; **I5 privacy FAQs → L1/L7**; site-wide cookie banner → **L7**. ✔
- **Exits / source-of-truth integrity:** **L1** = the canonical privacy notice; **E10** = in-app DPDP self-service; **L9** = public rights-request entry — all share **one backend pipeline** (no duplication). **L3** medical disclaimer is the single source referenced by footer + F/G/I + B5 PDF. **L4** is the single NMC-consent source referenced by B2a/D2/D5. **L5** consolidates DPDP+IT-Rules+Consumer grievance (referenced by A7/E10/L1/L6/L8). **L6** ties D4 (booking cancellation) + K1 (Pro billing). **L10** complements the infra XML sitemap. ✔
- **Design-system interlinks:** shared legal-page template (summary + last-updated + change-log + TOC + sections + contact), footer "Legal & Trust" column, consent components, cookie banner — all tokens/reusable; accessible (WCAG 2.2 AA, Design Part 13.2); multilingual; mobile-first; no graphs/tables (per map). ✔
- **Compliance coverage (complete):** DPDP (L1/L7/L9, May-2027) · NMC (L4) · CPA-2019 + E-Commerce-Rules (L2/L5/L6) · IT-Rules-2021 (L5) · RPwD + IS-17802 (L8) · RBI/UPI-Autopay (L6) · ASCI (L2/L6). Penalties-awareness (DPDP up to ₹250cr). ✔
- **Word checks:** **"AI" absent** (doctor-backed/clinician-reviewed; L1 describes automated processing truthfully + DPDP-honestly without the brand word) · **"free" per refined rule** (L6 frames any trial without the promotional word; no "free" in legal copy). **No dark patterns** (L6 cancellation as-easy-as-enrol + L7 equally-prominent-reject). **No regression to Parts 1–11:** the consent points (B2a/D2/D5), the B5 PDF disclaimer, E10 DPDP self-service, A7 grievance, footer "Legal & Trust", and Design Part 13 a11y all land exactly as previously specified; Family L is their canonical destination. ✔

---

---

# PART 13 — FAMILY M: PWA APP-SHELL UTILITY `[APP]`

## M.0 — Family principles (the app's connective tissue)

_Family M is everything that holds the `[APP]`-face together — the global app-shell (the bottom tab-bar + chrome + offline + push + install that Part 1 deferred from the website-face shell), the way a new patient gets in (onboarding + phone-OTP auth + profile + permissions), the utility/error/empty states, the safety-critical **Emergency** screen, the **WhatsApp** channel, and the **medication-safety** layer. Research-locked rules:_

- **Warm, anxiety-aware tone everywhere** (dental fear is real; a stressed patient needs a calm, reassuring, plain-language space — never cold, harsh, or alarming). Healthcare empty/error/emergency states are _not_ the place for jokes; match the emotional tone.
- **Value-first, low-friction entry.** Onboarding shows value before asking for anything; **account creation is deferred** (explore / start a consult before signing up); **auth is phone-OTP passwordless**; permissions are asked **contextually, never on screen 1**.
- **Premium-native PWA feel + honest reliability.** App-shell cached for instant repeat loads; offline degrades gracefully; **push is one of several channels** (Android-reliable; iOS 16.4+ but flaky) so **WhatsApp + SMS carry the dependable load** — this is _why_ D6/E9 are WhatsApp-primary.
- **Safety-first.** M9 Emergency is the escalation destination for every red-flag in the product; it routes life-threatening cases to emergency services, never pretends to handle them.
- **Brand discipline:** **never "AI"** (the WhatsApp bot is a structured assistant + doctor-backed diagnosis stays in the proper flow), **"free" per refined rule**, no dark patterns, accessible (WCAG 2.2 AA — Design Part 13), multilingual (10 locales). `[APP]`-face (the website-face Family A has **no** tab-bar).

**Shell / entry map:** the **bottom tab-bar** (Home/E1 · Find/C1 · Records/E3 · Profile/E8 + a persistent **Ask Datun**/B1) is present on every app-face screen; **install** comes from A8 + header + footer; **M9** is reached from B2c/B4/B6 red-flags + E3 emergency-info + F6 symptom red-flags + A7 pointer; **M11 WhatsApp** carries D6 reminders + B5 report delivery + C5 review collection + K2/K3 share/support; **med-safety** is referenced by B6 + E5; permissions manage → E10.

---

## The global APP-shell _(deferred here from Part 1; the APP-face counterpart to the website-face Shell-1/2)_

**Purpose.** Make datunai.com's product surface feel like a premium, reliable, installable native app.

### Components (research: PWA app-shell + iOS caveats + bottom-nav + push)

1. **Web App Manifest** — name "Datun", **icons 192 + 512 + maskable**, `start_url`, **`display: standalone`**, theme/background color (design tokens), shortcuts, screenshots. (A8 already ships a valid manifest.)
2. **Service worker (Workbox via next-pwa)** — **app-shell precached cache-first** (sub-1s repeat load) · **network-first for API / records** · **stale-while-revalidate for HTML** · offline fallback (M8). HTTPS (already live).
3. **iOS handling (Datun is iOS-tested)** — `apple-mobile-web-app-capable` / `-status-bar-style` / `-title` + `apple-touch-icon` + `apple-touch-startup-image` (splash); **`env(safe-area-inset-*)`** for notch/Dynamic Island; **custom in-app back navigation** (no system back button in standalone); detect standalone via `matchMedia('(display-mode: standalone)')` / `navigator.standalone`; **design to work even without standalone** (treat install as enhancement); camera + GPS via MediaDevices + Geolocation (B2d photo, C geolocation); plan for ~50MB cache + eviction (don't depend on long-term offline storage).
4. **Bottom tab-bar** — **4 top-level destinations** (Home/E1 · Find/C1 · Records/E3 · Profile/E8), each **icon + short label**, equal weight, Home leftmost; **active state = filled icon + label + color (never color-alone** — a11y; VoiceOver announces destination + selected) + **a persistent, prominent "Ask Datun" (B1)** primary action (FAB-style/distinct — the core conversion path, justified as the app's primary action). **44-48px targets, 3:1 icon contrast**, consistent icon family, no truncated labels, no fancy slow transitions, persistent across screens. Settings is **not** a tab (lives under Profile → E10).
5. **App-chrome (top)** — greeting + **notification bell → E9** (badge = meaningful unread count only, never a promo ornament).
6. **Push notifications** — **Android reliable; iOS 16.4+ but unreliable** (SW listeners may not fire after restart, unexpected unsubscribes) → **push is one channel; WhatsApp (M11) + SMS are the dependable reminder rails** (validates D6/E9). Permission asked contextually (M5), never on launch.
7. **Offline (M8)** — cached records/content readable + queued actions + reassuring offline UI.

- **Build:** Next.js 16 + next-pwa/Workbox; tokens/components from Design system; a11y (Design Part 13); Lighthouse PWA audit (informational; iOS tested on real device). PWA business case: 2-3× repeat-load, Pinterest +60%, Alibaba +76%, 68% cheaper.

---

## M1 — Onboarding `[APP]` _(3–5 value screens)_

**Purpose.** Get a new patient to value fast, warmly, without friction.

### Sections/features (research: value-first, skippable, light personalization)

1. **3–5 benefits-oriented screens** — the real capabilities: _describe a dental problem → a doctor-backed diagnosis + report_ · _find & book verified dentists_ · _your records + Oral Health Score_. Welcome matches the app look.
2. **Skippable** (clear "Skip"); **progress indicator**.
3. **Optional light personalization** — 1–2 questions that **visibly change** the experience (not decorative).
4. **Value before signup** — explore / start Ask Datun before an account; **OTP at the save/book point** (forced signup before value → +56% abandonment; value-in-60s → 3-5× retention).
5. **Data-context builds trust** (a short "your details are private" line — DPDP).
6. **NO permission asks on screen 1** (deferred to M5 / just-in-time).

- **Build:** APP-shell; warm/anxiety-aware copy; defers auth; → B1 (Ask Datun) / explore; M5 for permissions.

## M2 — Login / Phone-OTP `[APP]`

**Purpose.** Passwordless entry with the lowest friction.

### Sections/features (research: phone-OTP passwordless)

1. **+91 phone entry** + **"Send OTP"** + **trust line** ("we'll send a one-time code; your number stays private").
2. **Passwordless** (no password to remember/app to install).
3. Alt-paths (resend, voice fallback after retries — see M3).

- **Build:** **MSG91 SMS-OTP** (per stack) + **own JWT** session; APP-shell; DPDP consent; → M3.

## M3 — OTP verify `[APP]`

**Purpose.** Verify the code with near-zero typing.

### Sections/features (research: OTP input + autofill best practices)

1. **OTP input** — single field **or hybrid** (styled as multiple boxes, backend single — avoid true-multiple cursor complexity) + **`autocomplete="one-time-code"`** (Safari autofill) + **domain-bound SMS** (`@datunai.com #123456` → anti-phishing) + **WebOTP API** (Android Chrome, listener started after submit).
2. **Resend timer/countdown** + retry-with-timeout (deter abuse) + **voice fallback** after retries.
3. **Real-time error feedback** (wrong/expired code); **treat codes as strings** (preserve leading/trailing zeros); 6-digit, 5-min expiry.

- **Build:** MSG91; SMS-OTP is India-appropriate (email/authenticator less used) but paired with a strong own-JWT session; → M4 (first-time) / app home.

## M4 — Profile setup `[APP]`

**Purpose.** Minimal profile, mostly skippable.

### Sections/features

1. **Name + basics**; **optional dental history**; **"Skip for now"** (progressive profiling — collect later).
2. Becomes the **prefill source** for B2a intake + D2 booking.

- **Build:** single-column; APP-shell; → app home / B1; ties E8 profile.

## M5 — Permission priming `[APP]`

**Purpose.** Earn each OS permission with context, at the right moment.

### Sections/features (research: soft pre-permission ask + just-in-time)

1. **Contextual soft-ask before the native dialog**, tied to a feature the user requested (+30-40% grant / +50-70% opt-in):
   - **Notifications** — primed at a value moment ("get appointment reminders + your report") — _but push is secondary; WhatsApp/SMS primary_.
   - **Camera** — primed at the **B2d photo** step ("add a photo so our dentist can see the issue").
   - **Location** — primed at **C "find near me"** ("find verified dentists near you").
2. **iOS soft-prompt before the native prompt** (once "Don't Allow", re-enabling is a painful settings trip).
3. **Graceful decline fallback** (explain the effect + benefits forgone + easy re-enable).

- **Build:** just-in-time; manage anytime → **E10**; → B2d, C, E9.

## M6 / M7 / M8 — Utility & error states `[APP]`

**Purpose.** Never a dead end; always calm + recoverable.

### Sections/features (research: error/empty/offline UX, healthcare emotional tone)

1. **M6 — 404 / Not-found** — calm, on-brand, friendly headline + recovery (go Home / Ask Datun / Find a Dentist). Warm, not jokey (health context).
2. **M7 — 500 / Error** — clear cause + reassurance + **retry** + contact support (WhatsApp); conversational microcopy (not "Error 500").
3. **M8 — Offline (PWA fallback)** — show **cached records/content** + **queued-action** state + reassure ("you're offline — your saved records are here; we'll sync when you're back"); appropriate offline UI, not a browser error page (service worker, see app-shell).

- **Build:** a11y (not color-alone); plain-language; tokens/components; → recovery destinations.

## M9 — Emergency / Urgent dental `[APP]` _(safety-critical)_

**Purpose.** Recognize a dental emergency and route the patient to the _right_ care — fast, calm, honest.

### Sections/features (research: dental-emergency clinical red-flags + crisis UX)

1. **"Is this an emergency?" red-flag checklist** — severe throbbing pain unrelieved by painkillers · **facial/jaw swelling** · **difficulty breathing or swallowing** · high fever with swelling · **knocked-out (avulsed) tooth** · trauma (loose/displaced tooth, broken jaw) · **uncontrolled bleeding** · signs of spreading infection/sepsis.
2. **Two-tier triage (the core safety logic):**
   - **Life-threatening** (breathing/swallowing difficulty, airway swelling, uncontrolled bleeding, sepsis signs, severe trauma) → **"Call emergency services / go to the nearest hospital now"** (India **108**) — _not_ a dental booking. This routing is the most important thing on the screen.
   - **Urgent dental** (avulsed tooth, abscess, severe toothache, broken tooth) → calm first-aid + **nearest emergency/open dental clinics + map** + urgent CTA.
3. **Calm "what to do now" first-aid** (conservative, widely-accepted, always "seek professional care"): avulsed tooth → hold by crown, milk/saliva storage, reposition + ~30-min window; pain → OTC, **avoid aspirin on the gum**; bleeding → gauze + pressure; swelling → cold compress + salt-water rinse.
4. **Calm urgency, not alarm** — **soft-urgency color, not siren-red everywhere; red reserved for the genuine life-threatening tier; a second visual encoding beyond color** (icon + text — a11y, never color-alone); reassuring tone; large targets; **multilingual** (elders/low-literacy); progressive disclosure (action first).
5. **Verified, accurate nearest-care** info (trust > features); honest disclaimer — Datun is **not a substitute for emergency services** (ties L3/L4).

- **Build:** Design Part 12.6 styling; reached from B2c/B4/B6, E3, F6, A7; uses C geolocation + directory; a11y; calm/non-alarming.

## M10 — Empty states `[APP]` _(per surface)_

**Purpose.** Turn every blank screen into a warm onboarding moment.

### Sections/features (research: empty-state-as-onboarding; healthcare tone)

1. **Per-surface, warm + directional** (not jokey): records empty → "Your dental records will appear here after your first consultation. Start with **Ask Datun**" + CTA; appointments empty → "No appointments yet — find a verified dentist" + CTA; meds/score/history likewise.
2. **5 elements:** on-brand illustration + friendly headline + **clear primary CTA** + secondary path + plain-language motivating microcopy. Personalized (name).
3. **Never blank / never "No data."** Most-seen screens (every new user) → 2-3× retention when done well.

- **Build:** tokens/components; a11y; warm/anxiety-aware; ties E1 cold-start, C4 no-results, dashboard.

## M11 — WhatsApp bot `[APP]`/channel _(the highest-leverage India channel)_

**Purpose.** Meet patients where they already are — WhatsApp (98% open, >85% India penetration, the default channel of trust).

### Sections/features (research: WhatsApp Business + Meta 2026 structured-bot policy)

1. **Structured, task-oriented bot** (Meta's Jan-2026 policy **bans open-ended AI bots** — this _fits_ Datun perfectly): **in-chat menu** — _book / reschedule_ · _my reports_ · _talk to support_ · _health tips_. **The diagnosis is NOT done here** → **"For a diagnosis, use Ask Datun in the app; book for serious concerns"** (Meta-compliant + keeps doctor-backed diagnosis in its proper flow + the never-"AI" rule).
2. **Opt-in (mandatory + DPDP)** — explicit WhatsApp opt-in (not pre-checked / not reused SMS consent), frequency stated, consent stored; link/unlink in **E10**.
3. **6 approved templates** (business-initiated): consultation_complete, internal_alert, 3day_followup, 7day_followup, appointment_reminder, weekly_tip; replies handled in the 24-hr service window.
4. **Human handover** to manual support (**+91 87960 64170**) with **full transcript + context** (no repetition) on "talk to support"/complex/emotional.
5. **Verified business account** (green tick); **quality-rating discipline** (relevant/wanted messages only — no spam).

- **Build:** **Meta Cloud API** (the only option; sender **+91 70184 64796** per stack; internal-alert backup **+91 99531 35340**); carries B5 report delivery, D6 reminders/follow-ups, C5 review collection, K2/K3 share+support; PHI-safe; never "AI"; → all of those families.

## med-safety `[APP]` _(referenced by B6 + E5)_

**Purpose.** A patient-facing medication-safety layer for the doctor-backed prescription.

### Sections/features (research: drug-interaction / allergy / duplication, dental drugs)

1. **Allergy check (critical)** — cross-check the prescribed medicine against **allergies captured in B2a** (penicillin / local-anaesthesia / latex); the RMP owns the clinical decision, the surface **flags** it; severe allergic-reaction symptoms (hives/swelling/breathing) → **M9**.
2. **Interaction check** — flag interactions with the patient's current meds + conditions (e.g., amoxicillin + warfarin/blood-thinners; NSAID + blood-thinner; amoxicillin reducing birth-control efficacy) — clinician/pharmacist-reviewed source, patient-friendly language.
3. **Duplication check** (no double-dosing of a class).
4. **How-to-take + side-effects to watch + when to seek help** (severe reaction → M9); short-course framing (E5).

- **Build:** medicine list is **NMC List O/A only** (never Schedule X — ties B5/B6/L4); clinician-reviewed (never "AI"); DPDP; → B6 (medicine-in-consult safety notes), E5 (medications), B2a (allergy/meds/conditions source), M9 (severe reaction).

---

## M.shared systems (apply across Family M)

- **The app-shell** (manifest + Workbox service worker + iOS handling/safe-areas/splash/custom-back-nav + bottom tab-bar + app-chrome + offline) is the single APP-face frame; website-face (Family A) has no tab-bar.
- **Channel hierarchy (locked):** **WhatsApp (primary, M11) + SMS (MSG91) > push (Android-reliable, iOS-flaky) > email (Resend)** — because iOS web-push is unreliable and SMS faces DLT volatility, WhatsApp is the dependable spine; every reminder/notification (D6/E9) honors this + per-channel consent (E10) + quiet-hours.
- **Tone:** warm, calm, anxiety-aware, plain-language, multilingual (10 locales); empty/error/emergency states never jokey.
- **Brand discipline:** never "AI" (structured WhatsApp bot + doctor-backed diagnosis in-flow) · "free" per refined rule · no dark patterns · a11y (WCAG 2.2 AA, never color-alone) · honest (M9 not a substitute for emergency services).

## M.research-basis (Part 13)

~100+ sources synthesized across nine dense passes, including: **PWA app-shell architecture 2026** (service-worker + Web-App-Manifest [name/icons-192+512-maskable/start_url/display=standalone/theme] + HTTPS; **app-shell cache-first → sub-1s repeat-load** + network-first-API + stale-while-revalidate-HTML + Workbox/next-pwa; install `beforeinstallprompt`-Android + appinstalled-tracking; **iOS-Safari NO-auto-prompt → manual A2HS-instructions**; **iOS caveats** — push-16.4+-only-+-reliability-issues [SW-listeners-may-not-fire-after-restart/unexpected-unsubscribes/wrong-URL], **no-background-sync**, **~50MB-cache-+-aggressive-7-day-eviction**, **no-system-back-button → custom-nav**, safe-area-insets-+-apple-meta-tags-+-splash, matchMedia-standalone-detection, **design-to-work-without-standalone**, camera+GPS-via-MediaDevices+Geolocation, in-app-browsers-can't-install; business case Pinterest-+60%/Twitter-Lite-−70%-data/Alibaba-+76%/2-3×-repeat-load/68%-cheaper; Lighthouse-PWA-audit-doesn't-test-iOS — MagicBell/MobiLoud/DigitalApplied/Vinova/Scandiweb), **app onboarding + permission priming** (value-first + 3-5-screens [healthtech-can-be-longer-but-savable-sessions+progress] + skippable + light-personalization-that-visibly-changes-experience + progress-bar + **defer-account-creation** [forced-signup-before-value-+56%-abandonment / value-in-60s-3-5×-retention / effective-onboarding-50%-better-retention]; benefits+contextual-tooltips-beat-5+-tutorial-walls; Calm/Spotify/Headspace/Duolingo examples; **permission priming — NEVER-screen-1** [no-context→iOS-opt-in-<30%→deny-all], **soft-pre-permission-ask-tied-to-requested-feature** [+30-40%-grant / notifications-+50%-opt-in], just-in-time, **iOS-soft-prompt-before-native-dialog**, graceful-decline-fallback; Headspace/Babbel/Starbucks/Zova — VWO/UXCam/Lowcode/Appcues/UserOnboard/OneSignal), **phone-OTP passwordless auth** (passwordless-no-password-no-separate-app-lower-friction; **autofill** = `autocomplete="one-time-code"`-[Safari-iOS-14+]-+-**domain-bound-SMS**-`@domain #code`-[anti-phishing]-+-WebOTP-API-[Chrome-Android-listener-after-submit]-+-Android-SMS-Retriever/User-Consent; **input** single-or-hybrid-styled-multiple-avoid-true-multiple; **treat-codes-as-strings**-[leading/trailing-zeros]; **resend-timer-+-retry-timeout-+-voice-fallback-+-real-time-error-feedback**; 6-digit/5-min; SMS-OTP-vulnerable-SIM-swap/SS7/phishing-[passkeys-first-by-2027/SMS-fallback]-but-India-common-[email/authenticator-less-used]-pair-with-strong-session — Twilio-iOS/Android/HTML/MDN/Chrome-WebOTP/Clerk/Authsignal/MojoAuth), **error/empty/offline states** (**empty-states = most-seen-screens-every-new-user-day-1 + 80%-treat-as-afterthought + well-designed-2-3×-retention** [NN/g-"teachable-moment"-not-error-states]; **3-types** first-use/onboarding-+-no-results-+-network/permission/error; **5-elements** illustration-on-brand-not-generic-+-friendly-headline-+-clear-primary-CTA-+-secondary-path-+-plain-language-motivating-microcopy; **voice-test** sounds-like-error→rewrite/sounds-like-a-friend→good; **match-vertical's-emotional-tone** — _retail-empty-cart-FAILS-for-healthcare → warm/calm/reassuring-NOT-jokey_; 404-calm-on-brand-+-recovery; 500-clear-+-reassuring-+-retry-+-support; offline-show-cached-+-queued-+-reassure-not-browser-error; a11y-not-color-alone — UXPin/Toptal/Eleken/Raw.Studio/UserOnboard/AppyPie/PencilPaper/Setproduct/Mobbin), **dental-emergency clinical** (**red-flags** severe-pain-unrelieved/disrupts-sleep + facial/jaw-swelling-spreading-to-neck/eye + **difficulty-breathing/swallowing** + high-fever+swelling + **avulsed-tooth-30-60-min** + trauma-loose/displaced/broken-jaw + uncontrolled-bleeding + sepsis-signs + **Ludwig's-angina-life-threatening-hours**; **two-tier** life-threatening→ER/108-not-dental-appt vs urgent-dental→first-aid+nearest-clinics; **first-aid** avulsed-tooth-handle-by-crown-milk/saliva-reposition-30-min / pain-OTC-**avoid-aspirin-on-gums**-[chemical-burn/bleeding] / bleeding-gauze+pressure / swelling-cold-compress+salt-rinse; ADA-delay-increases-cost-5×; 22M-US-ER-visits/yr — amazingfamilydental/StrongRoots/TransformDental/JPDental/WHMC/Grokipedia/DDCLR), **emergency/crisis UX** (clarity-over-complexity-[stress-shrinks-working-memory→minimalist/single-dominant-action/reduce-options]; **calm-reassuring-tone-NOT-panic-inducing** [empathetic-microcopy/soft-palette; harsh-colors→anxiety]; fast-visible-feedback; large-targets+high-contrast+voice-[compromised-states]; progressive-disclosure-[life-saving-action-first]; **color — red-signals-urgency-reserve-for-genuine-emergencies** [over-use-desensitizes="most-dangerous-failure-mode"] + **soft-red-vs-siren-red+neutral-messaging** + **second-visual-encoding-beyond-color** [icon+text-colorblind]; **trust>features** [78%-abandon-apps-with-outdated-hospital-data→verified-real-time-nearest-clinic] + **multilingual+simple** [elders-40%-of-emergencies-struggle-with-complex/English-only]; smart-triage-chatbots-route-ER-vs-urgent-vs-telehealth — Eleken/UXCentury/FuseLab/Orangesoft/Wonderment/Artonest/Blackthorn/911-emergency-app-case-studies), **WhatsApp Business India 2026** (**98%-open/45-60%-CTR/3.3B-MAU/>85%-India-penetration/"default-channel-of-trust"**; **Cloud-API-only**-[on-premise-deprecated-Oct-2025]-via-BSP/Meta-direct [Gupshup/Wati/Twilio India]; **business-initiated=pre-approved-templates / customer-initiated=24-hr-service-window**; 🔴 **Meta-Jan-15-2026-policy BANS-open-ended-AI-bots → STRUCTURED-task-oriented-bots-only** [booking/order/support/notifications/FAQ; out-of-scope→standardized-response+human-handover] — _aligns-with-Datun's-diagnosis-stays-in-app-+-never-"AI"_; **opt-in-mandatory** [explicit-WhatsApp-opt-in-not-pre-checked/not-reused-SMS-consent+frequency+DPDP]; **human-handover-with-full-transcript+context-no-repetition** [keyword/sentiment/tier/explicit-request]; verified-business-account-green-tick; quality-rating-[low→reduced-limits/high-block→tanks-rating]; healthcare-reminders-24h+2h→−35%-no-shows; review-collection-3-day-5-10×-email; multi-channel-WhatsApp+SMS+email-reduces-drop-offs->60%-+-SMS-DLT-volatility-makes-WhatsApp-dependable; rich-messages-buttons/lists — Robylon/MessageCentral/MessageBot/CampaignHQ/GMCS/Ojiva/AlibabaCloud/Turn.io/Infobip/Ainisa), **medication safety / drug-interaction / allergy** (patient-facing-interaction-checking-pharmacist-reviewed+patient-friendly+"consult-provider-before-changing"; **dental-drugs** amoxicillin/penicillin-first-choice-interacts-with-**warfarin/blood-thinners**[bleeding]/allopurinol/probenecid/alcohol/**birth-control**[reduced-efficacy]/methotrexate + **penicillin-allergy→don't-prescribe**[hives/swelling/breathing=emergency→M9]/cephalosporin-cross-sensitivity/renal-dose-reduction; **NSAIDs+blood-thinners**=dangerous-bleed; clindamycin-C.diff-risk; sedation-stacking; **penicillin-allergy-over-reported**[many-side-effects-not-true-IgE]; patient-education-how-to-take+side-effects+contact-if-reaction+shortest-duration-3-7-days+follow-up — WebMD/CDC-dental-antibiotic/GoodRx/DOCS/Drugs.com/Healthline/MSF), and **mobile bottom-tab-bar navigation 2026** (**3-5-tabs/4-sweet-spot**-top-level-destinations-not-actions-[<3-segmented/>5-drawer]; **thumb-zone**-[75%-thumb-driven/bottom-third-most-accessible-Steven-Hoober/Vitaly-Friedman-gold-standard]-top-priority-leftmost; **icon+label**-[icons-alone-−30-40%-comprehension/"mystery-meat"]-standard-recognizable-consistent-family-short-literal-labels-no-truncation; **active-state-filled-icon+label+color-NEVER-color-alone**-[a11y/VoiceOver-destination+selected]; **badges-meaningful-only**-[dot/counter-pending/unread-NOT-growth-ornament-"once-everything-has-urgency-nothing-does"]; **FAB**-Material-650-participant-research-[liked-centered-embedded-aesthetic+ergonomic]-for-primary-action-don't-obscure; **persistent-across-screens**; **custom-back-nav-PWA-no-system-back**; platform-conventions-[iOS-tab-bar+swipe-back/Android-bottom+system-back]; 44-48px-targets+3:1-contrast; settings/help-NOT-a-tab; avoid-too-many/vague-icons/mixed-hierarchy/hidden-behind-FAB/fancy-slow-animations/scrollable-bar/stateful-visibility — PhoneSimulator/UXDworld/Material/UIUXDesigning-iOS/Medium/Nitrous/DevEntia/Rafli/DesignStudio/UXPlanet). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## M.interlink verification (Part 13)

- **Entries:** **bottom tab-bar** (Home/E1 · Find/C1 · Records/E3 · Profile/E8 + persistent Ask-Datun/B1) on every app-face screen; **install** from A8 + header + footer; **M9** ← B2c/B4/B6 red-flags + E3 emergency-info + F6 symptom red-flags + A7 pointer + L3/L4 no-emergency; **M11 WhatsApp** ← D6 reminders + B5 report delivery + C5 review collection + K2/K3 share+support + A6/A7 support; **med-safety** ← B6 + E5; onboarding/auth (M1-M4) precede the app-face; permissions (M5) ← B2d/C/E9. ✔
- **Exits / source-of-truth integrity:** the **app-shell** is the single APP-face frame (website-face Family A has no tab-bar — two-faces architecture intact); **M9** is the single Emergency destination for all red-flags (B/E/F/A); **M11** is the single WhatsApp surface (Cloud API + 6 templates) reused by D6/B5/C5/K2/K3; **med-safety** is the single med-safety layer reused by B6/E5; **channel hierarchy** (WhatsApp+SMS > push > email) is the single rule honored by D6/E9; permissions manage → **E10** (single preference center). No duplication. ✔
- **Design-system interlinks:** app-shell/bottom-tab-bar, OTP input, empty/error/offline states, M9 emergency styling (**Design Part 12.6**), badges/toggles/forms = tokens/components; **a11y per Design Part 13 (WCAG 2.2 AA, never color-alone)**; multilingual; safe-area-insets; 44-48px targets. ✔
- **Compliance & safety:** M9 routes life-threatening cases to emergency services (108/hospital), honest "not a substitute" (L3/L4); M11 = DPDP opt-in + Meta-2026 structured-bot policy + PHI-safe; med-safety medicine restricted to **NMC List O/A** (B5/B6/L4); auth/OTP + DPDP consent; push/notifications consent (E10). ✔
- **Word checks:** **"AI" absent** (the WhatsApp bot is a _structured assistant_; the doctor-backed diagnosis stays in the proper app flow; med-safety is clinician-reviewed) · **"free" per refined rule** (onboarding/auth/utility copy uses no promotional "free"). **No dark patterns** (skippable onboarding, contextual permissions, honest empty/error states). **No regression to Parts 1–12:** the bottom tab-bar (deferred from Part 1), A8 install, B red-flag escalations, B5 WhatsApp delivery, D6 reminder channels, E3 emergency-info, E5 med safety-notes, E9/E10 notifications + preferences, F6 red-flags, and Design Part 12.6/13 all land exactly as previously specified — Family M is their canonical home. ✔

---

---

# PART 14 — FAMILY N: DENTAL TOURISM `[WEB]` + `[APP]`

## N.0 — Family principles (an adjacent vertical, built on the verification moat)

_Family N opens Datun to a second audience — **NRIs + international patients** travelling to India for dental care — as an **asset-light layer over Datun's already-verified clinics** (Family C/J). The hook is real: **65–80% savings** vs US/UK/Canada/Australia/Gulf, with the same implant brands, same labs, same protocols (savings from lower overhead, not lower quality). Research-locked rules:_

- **Verification is the entire edge.** The #1 fear in dental tourism is "what if it goes wrong?" — and the documented truth is **"the safety risk is not the country, it is the specific clinic."** Datun's answer is exactly its moat: **NABH + MDS + implant-manufacturer certificate + DCI registration** (J1) + pre-travel assessment + written warranty + records. This turns the "what if?" into a managed system and differentiates Datun from "slick brochure" facilitators.
- **Trust-first, conversion-aware.** International patients commit _before_ they fly, often from the website alone → lead with accreditation, real before/after, video testimonials, transparent bundled cost, and quick cross-timezone response.
- **Honest, never hype.** Real savings ranges (not guarantees), realistic timelines + healing/flight-timing, candidacy + expectations, and an honest risk + recourse disclosure (CDC-aligned). **No guaranteed outcomes** (ASCI/DCI). Per the refined "free" rule (Design Part 12.5), the **tourism estimate CTA may use "Get a free estimate"** (honest, category-standard, conversion-positive for international patients who are explicitly comparing cost) — **"Request an estimate"** stays a premium-toned alternative to A/B test; the brand **never says "AI"**.
- **The compliance spine (locked):** NMC teleconsultation is **within-India only** (L4) → **N4 is a pre-arrival ESTIMATE, not a teleconsult or diagnosis**; the real doctor-backed clinical diagnosis + treatment happens **in person in India**. **GDPR + UK GDPR** apply to EU/UK patients (explicit consent + SCCs/UK-IDTA + TIA for the cross-border transfer of X-rays/records to India; secure in-app upload, never raw WhatsApp for clinical data) — alongside **DPDP** (L1). Datun is a **platform/facilitator**: it _coordinates_ visa documentation; the **verified clinic issues the invitation letter, the Government decides the visa** (no approval promises). DCI ethics: Datun's **B2B-subscription model (not per-patient commission) + relevance-not-pay-to-rank** keeps it clear of "paid canvasser" concerns.
- `[WEB]`-face for the marketing/SEO hub + `[APP]`-face for the tools (N4 case-evaluation, N5 itinerary, N13 concierge).

**Tourism entry / source-of-truth map:** N ← A1 tourism teaser (day one) + Shell-1 header "Product"; N **reuses** verified clinics (**C2/C3 + J1**), India cost data (**G**, extended with home-country comparison), accreditation (**J1** NABH/MDS), stories (**I7** parallel), treatments (**F4**), booking (**D**, timezone-aware IST/multi-tz), concierge WhatsApp (**M11**), and legal (**L1/L4/L6**) — Family N does not duplicate these, it layers an international face over them.

---

## N1 — Dental Tourism landing (hub) `[WEB]`

**Purpose.** Convert an international searcher into a confident enquiry.

### Sections/features (research: medical-tourism conversion + trust signals)

1. **Savings hero** — honest "Save 65–80% on world-class dental care in India, at verified clinics" + **"Get a free estimate"** CTA (honest + category-standard; or "Request an estimate" as the premium A/B variant — refined rule, Design Part 12.5).
2. **Why India** — same implant brands (Straumann/Nobel/Dentsply) + same labs + same protocols + CBCT/CAD-CAM/same-day-crowns; **savings from lower overhead, not lower quality**; no waiting (vs NHS); English.
3. **How it works** — request estimate (N4) → plan + itinerary (N5) → travel (N7/N8) → treatment at a verified clinic → follow-up after return (N11).
4. **Verified clinics** — "the risk is the clinic, not the country" → Datun's verification (→ C2/C3 + J1).
5. **Trust row** — NABH · MDS · certified implants · written warranty.
6. **Destinations** — top hubs (→ N6). **Savings bar** chart.

- **Build:** SSR; `MedicalOrganization` + `FAQPage` + `Breadcrumb` JSON-LD; multilingual + international-patient languages; single clear CTA; mobile-first; blue/calm trust palette; → N2/N3/N4/N6/C/D.

## N2 — Cost comparison (home-country vs India) `[WEB]`

**Purpose.** Make the savings concrete and honest.

### Sections/features (research: cost transparency builds confidence)

1. **Per-treatment comparison** with a **country selector** (UK/US/Australia/Canada/Gulf) — implant, All-on-4, full-mouth, veneers, crown, root canal.
2. **What's included** (consultation, CBCT, surgery, crown, lab, follow-up) vs not.
3. **Total-with-travel honesty** — treatment + flights ($700–1,400) + hotel ($50–100/night) + food — _still 50–70% below home-country treatment alone_ (don't hide travel cost).

- **Charts/tables:** **savings bar + cost comparison table.** **Build:** SSR; extends Family **G** with home-country figures; ranges not guarantees (ASCI); → N3/N4/N13.

## N3 — Treatment package pages `[WEB]` _(implants, All-on-4, full-mouth, veneers, smile makeover…)_

**Purpose.** Give each major treatment an honest, bookable package page.

### Sections/features

1. **What's included** (bundled, transparent) · **timeline / visits** (single-visit immediate-loading 7–10 days _or_ two-trip 5–7d + 3–5d after 3–6mo healing) · **price range** · **before/after** (→ N9) · **"Request an estimate"** CTA.

- **Charts/tables:** **package table + before/after gallery.** **Build:** SSR; ties **F4** treatments; honest timelines + healing; → N4/N5/N9/C.

## N4 — Virtual case evaluation `[APP]` _(pre-arrival estimate — NOT a diagnosis/teleconsult)_

**Purpose.** Help a patient plan the trip with an indicative plan + cost before flying.

### Sections/features (research: virtual = preliminary assessment only + L4 within-India limit)

1. **Secure upload** of X-rays / photos / reports (encrypted, consented — GDPR/DPDP).
2. **Indicative treatment options + cost estimate + candidacy/expectation flags** (not every case fits a short window; multi-phase cases flagged) → **contact concierge** (N13).
3. **Explicit framing:** "This is a pre-travel **estimate**, not a diagnosis or a medical consultation. Your clinical diagnosis and treatment happen in person at a verified clinic in India." (NMC within-India only — L4; this is **not** Ask Datun/B and **not** D5 teleconsult.)

- **Build:** `[APP]`; secure in-app upload (NOT raw WhatsApp for clinical data); explicit consent (GDPR Art-9 / DPDP); → N5/N13/C; honest, compliance-clean.

## N5 — Treatment plan / itinerary `[APP]`

**Purpose.** Turn the plan into a realistic day-by-day trip.

### Sections/features

1. **Day-by-day schedule** · **length-of-stay** · **number of visits** · **rest day after arrival** (jet lag + dental work) · **healing windows between stages** · **"treatment mornings + sightseeing afternoons"** on low-intensity days · **flight-home buffer** (no long travel within ~48h of surgery; wait ~2 weeks after sinus-lift/bone-graft).

- **Charts/tables:** **itinerary table.** **Build:** `[APP]`; timezone-aware (→ D); honest healing/flight-timing; → N6/N7/N8/D.

## N6 — Tourism city guides `[WEB]` _(Delhi/Mumbai/Bangalore/Hyderabad/Chennai/Kochi/Goa/Chandigarh/Jaipur)_

**Purpose.** Help an international patient choose a hub.

### Sections/features

1. Verified clinics in the city (→ C) · international-airport access · hospitality/hotels · local support · sightseeing · **map.**

- **Build:** SSR; ties Family **H** (local) + **C**; uniqueness-gated; → C/N8.

## N7 — Visa & travel guide `[WEB]`

**Purpose.** De-mystify entry, honestly.

### Sections/features (research: India e-Medical Visa + MVT regulations 2026)

1. **e-Medical Visa (M-Visa)** — 60-day stay / triple-entry, extendable to 1yr; **24–72hr** processing; apply ≥4 days ahead (up to 120 days); eligibility **varies by nationality**; documents (passport, photo 5×5cm, bio-page, return proof).
2. **Tourist vs Medical visa (honest):** minor/outpatient dental → a tourist visa often suffices; major/surgical/in-patient → **e-Medical Visa**.
3. **Invitation letter** — system-generated by the **verified clinic via the FRRO Medical & Ayush Visa Portal** (Medical Reference Number; NABH/JCI accreditation number shown). **Datun coordinates the documentation; the clinic issues it; the Government of India decides the visa** (no approval promises).
4. **Medical Attendant Visa (MX)** — up to 2 attendants.

- **Build:** SSR; honest + official-portal pointer (indianvisaonline.gov.in); Datun is not an immigration authority; → N13/N8.

## N8 — Accommodation & logistics `[WEB]`/`[APP]`

**Purpose.** Remove travel friction.

### Sections/features

1. **Hotels near the clinic** · **airport transfer** · local support · SIM · currency exchange · **map.**

- **Build:** ties N6/N13; → N5.

## N9 — Before/after gallery `[WEB]`

**Purpose.** Show real results, compliantly.

### Sections/features (research: ASCI/DCI before-after rules)

1. **Real, unedited** images (consistent lighting; no filters/cherry-picking), **written patient consent**, **no minors**, **clear "individual results vary" disclaimer** (ASCI: disclaimer font ≥ claim) · **filter by treatment.**

- **Build:** SSR; ASCI + DCI compliant; consent-governed (DPDP/GDPR); → N3/N10/C.

## N10 — International patient stories `[WEB]`

**Purpose.** Let prospective patients hear from people like them.

### Sections/features (research: video testimonials + consent)

1. **Same-procedure video testimonials** with **rigorous written consent** + **honest "individual results" framing** (no guaranteed outcomes) · **country filter.**

- **Build:** SSR; parallels **I7**; consent-governed; aware of cross-border testimonial rules (honest/consented); → N3/N9.

## N11 — Trust & accreditation `[WEB]`

**Purpose.** The trust substance that answers every documented dental-tourism risk.

### Sections/features (research: warranty/redo + continuity-of-care + honest risk)

1. **Accreditation & verification** — NABH · MDS · Class-B sterilization protocols · implant-manufacturer certificates (box + lot numbers) · DCI registration (→ J1).
2. **Written warranty / redo policy** — honest, per-clinic (typically 2–5 yrs on implants/crowns; what it covers + how post-return complications are handled); **no "lifetime" myths.**
3. **Continuity of care after return** — **digital records / "implant passport"** (brand, lot numbers, CBCT, intraoral scans, surgical notes → any dentist can identify the work) + **home-country partner-clinic coordination** + follow-up ("message us if a crown chips / screw loosens"; minor re-cementing any local dentist can do).
4. **Honest risk disclosure** — "the risk is the clinic, not the country"; proper pre-travel assessment + realistic timelines + flight-timing + candidacy; rights & recourse (CDC-aligned).

- **Build:** SSR; ties **J1** verification + **E3** records (the implant-passport) + **L** consumer-protection; honest; → N4/N5/C.

## N12 — FAQ (tourism) `[WEB]`

**Purpose.** Answer the international patient's real questions.

### Sections/features

1. Safety · timelines · **payment** (cards/UPI/wire/EMI) · follow-up · visa · warranty. **FAQPage** schema (answer-first, GEO-friendly).

- **Build:** SSR; ties Family I FAQ discipline; → N13/N7/N11.

## N13 — International concierge / contact `[APP]`/`[WEB]`

**Purpose.** A single, responsive point of contact across time zones.

### Sections/features (research: international-patient desk + cross-border payment)

1. **Dedicated international desk** (single coordinator/liaison) + **WhatsApp** (→ M11, primary + cross-timezone) + **response-time promise** (quick acknowledgment reassures).
2. **Payment guidance** — cards (Visa/MC/Amex, charged in INR; **choose a no-FX-fee card**; **decline Dynamic Currency Conversion**) · **wire transfer** (~7 days) · **UPI** (NRIs) · forex cards · **EMI/installment** (≈20–30% upfront + 6–12 mo) · keep a 15–20% buffer.
3. **Coordinates** report review (N4) + visa/invitation-letter (N7) + accommodation/airport (N8) + home-country follow-up (N11); interpreters/SIM as needed.

- **Build:** `[APP]`+`[WEB]`; WhatsApp via M11 (coordination, not clinical-data upload); honest CDC-aligned (rights/recourse + accreditation data + records-transfer); → N4/N7/N8/N11.

## N14 — "[Treatment] in India for [country] patients" `[WEB]` _(programmatic → ~10 treatments × ~8 countries)_

**Purpose.** Win search/AI-citation for "dental implants in India for UK patients" etc.

### Sections/features

1. The treatment + **savings vs that specific country** + verified clinics + package + trust + FAQ.

- **Charts/tables:** **cost comparison table.** **Build:** SSR; **quality-gated programmatic** (reuses Family **F/H** discipline — ≥50–60% uniqueness + real data + noindex-gate; no doorway pages); `MedicalWebPage` + `FAQPage` + `Breadcrumb`; → N2/N3/N13/C.

---

## N.shared systems (apply across Family N)

- **Asset-light over verified clinics:** every clinic shown is verified via **C2/C3 + J1**; Family N is an international face, not a second clinic database. Cost data extends **G**; stories parallel **I7**; treatments tie **F4**; booking is **D** (timezone-aware).
- **Compliance spine:** NMC within-India teleconsult (L4) → **N4 = estimate, not diagnosis** (real diagnosis + treatment in person); **GDPR + UK GDPR** (explicit Art-9 consent + SCCs/UK-IDTA + TIA + secure in-app upload, encrypted) **+ DPDP** (L1); visa = clinic-issued invitation letter + Government decision (Datun coordinates only); ASCI/DCI (no misleading claims, no guaranteed outcomes, no paid-canvasser model — B2B-subscription + relevance-not-pay-to-rank).
- **Trust-first + honest:** verification, real before/after + video, transparent bundled cost, written warranty, records/implant-passport, honest risk + recourse, quick cross-timezone response.
- **Brand discipline:** **"free" per refined rule** ("Get a free estimate" now permitted for the tourism CTA — honest, category-standard; "Request an estimate" is the A/B alternative) · **"AI" absent** (doctor-backed; N4 is an estimate) · accessible (WCAG 2.2 AA, Design Part 13) · multilingual.

## N.research-basis (Part 14)

~100+ sources synthesized across eight dense passes, including: **dental-tourism India market & savings** (India #1 destination; dental ~$1.1B-2023 → ~$4.6B-2030 ≈18-22% CAGR; implants top service; 400k+ Americans/yr + 50+ countries; **65-80% savings** — single implant $4,500-NY→$400-900-India, full-mouth $40-80k→$5-12k [saves $20-35k], full-mouth-rehab £25k-London→£4-6k, root-canal $1,200→$100-200; **even with flights+hotel total 50-70% below home-country-treatment-alone**; same brands [Straumann/Nobel/Dentsply] + same labs + same protocols, **savings from lower-overhead-not-quality**; NABH=Indian-JCI + CBCT/CAD-CAM/same-day-crowns/computer-guided-surgery; MDS-dentists [30k grads/yr]; no-waiting-24-48hr-vs-NHS; English; hubs Delhi/Gurgaon/Noida+Mumbai+Bangalore+Chennai+Hyderabad+Chandigarh+Jaipur+Kochi+Goa; **timelines** surgical-10-14d / two-stage-2-trips-[5-7d+3-5d-after-3-6mo] / All-on-4-10-14d / immediate-loading-7-10d — Neo/SmileJet/ToothFirst/Tricity/Chandigarh/Medikaya/MedicalTourismCo/DrMotiwala/Esthetica/DrSuman), **India e-Medical Visa + MVT regulations 2026** (**M-Visa 60-day/triple-entry**, extendable-1yr-via-FRRO+NABH-cert, **24-72hr**, apply-≥4-days/up-to-120; **system-generated Medical Invitation Letter MANDATORY [Apr-2025] via FRRO Medical-&-Ayush-Visa-Portal → Medical-Reference-Number + NABH/JCI-accreditation-number**; **Medical-Attendant-Visa-MX up-to-2-attendants**; eligibility-varies-by-nationality [US/UK/AU/UAE-eligible / Bangladesh-Pakistan-paper]; **tourist-vs-medical** minor-outpatient→tourist-often-suffices / major-surgical-in-patient→e-Medical-Visa; documents passport-6mo-2-blank-pages/photo-5×5cm/bio-page/return-proof/English/yellow-fever-if-endemic/33-designated-airports; **facilitator coordinates-documentation-Govt-decides-visa** — bharatdesha/VFS/IndiaInGreece/Karetrip/Afiya/indianvisaonline.gov.in/Innayat/India-eVisa/HCI-PortOfSpain), **medical/dental-tourism website + conversion** (international-patients-commit-before-flying-website-often-only-pre-visit-experience; **trust signals = the conversion lever** — JCI/NABH/ISO + real-patient-photos+names + credentials + **before/after** + **video-testimonials-+80%-vs-text** + **virtual-clinic-tours** + doctor-explainer-videos; sequence credentials→reviews→visuals→outcomes; **transparency** — hidden-costs-create-doubt→clear-ranges/bundled-packages; dedicated-international-section; **quick-cross-timezone-response-reassures**; multilingual + per-location-pages [validates N6/N14]; single-clear-CTA + short-lead-form-[12→6-fields-+89%] + CTA-3×/page + mobile-first-<3s + blue=trust; E-E-A-T/schema/Lighthouse; conversion-3-5%-avg→8-15%-top — ResultCalls/LassoMD/DentalMarketingGuy/Medkeon/Threems/GrowthFriday/ProSites/Pixlogix/Azuro/Weave), **dental-tourism risk/warranty/continuity** (**#1-fear="what-if?"**; biggest-risks-unverified-clinic+no-pre-travel-assessment+no-aftercare-plan-all-preventable→complication-rates-match-domestic [accredited=95-98%-Western]; **written-2-5yr-warranties** [ask-what-covered+post-return-handling+travel-cost]; **"lifetime"=marketing-myth**; **continuity-gap** local-dentists-may-refuse-complications-from-abroad [liability+unfamiliar-parts]→**digital-records/implant-passport** [brand/lot-numbers/scan-files]+**home-country-partner-clinic-coordination**+aftercare; **honest-risks** sterilization-variance→NABH / rushed-diagnostics→proper-CBCT+realistic-timelines / **post-op-air-travel-wait-2wks-after-sinus-lift+DVT-risk→itinerary-buffer** / limited-legal-recourse-abroad→verification+warranty+grievance / candidacy; **"the-risk-is-the-clinic-not-the-country"** — MyDentalFly/DentalSavingsTravel/Better.MedicalTourism/Trinity/EllicottMills/Innova/ClearChoice/Geach/Meza), **virtual-case-evaluation + cross-border-teleconsult-compliance** (**virtual=PRELIMINARY-assessment-NOT-full-diagnosis** [no-physical-exam; full-diagnostic-accuracy-needs-in-person-X-rays/probing/clinical-exam; serious-cases-require-in-person-imaging]; **pre-travel-pattern** — share-recent-X-rays+photos+history-ahead→preliminary-plan+written-estimate+clear-expectations-before-boarding→in-person-clinical-diagnosis+treatment-on-arrival; **locks Datun-N4=pre-arrival-ESTIMATE-not-diagnosis/teleconsult** [NMC-within-India-only-L4]; candidacy+expectations [not-every-case-fits-short-window; biological-timelines; flag-multi-phase]; **documentation=continuity** [complete-file-so-home-dentist-understands]; smile-simulations-OK — DeJesus/PocketDentistry/Peppermint/Crossings/Thantakit/WeareFamily/Reimels/HHS-telehealth/MedicalTourismMag), **ASCI/DCI cosmetic-advertising + before-after** (cosmetic-marketing-closer-to-medical-than-retail; **before/after real-unedited-no-filters/lighting-tricks/cherry-picking + written-consent + no-minors + clear-"results-vary/not-typical"-disclaimer** [ASCI disclaimer-font≥claim]; **testimonials written-consent + honest-non-guaranteeing** [AHPRA-AU-restricts-clinical-outcome-testimonials → keep-honest/consented/results-vary]; **no-guaranteed-outcomes** ["20-shades"/"100%"/"#1/best"-without-verifiable-evidence; success-rates-substantiated]; **DCI-Code prohibits-paying-agents/canvassers-for-bringing-patients → Datun-B2B-subscription-not-per-patient-commission + relevance-not-pay-to-rank-keeps-it-clean**; written-consent-all-patient-media-DPDP/GDPR — DentalRank/AHCRA/EBCWebstore/RAMP/CDHO/DCI-DentistFriend/ASCI), **international-patient concierge + cross-border-payment** (**dedicated-coordinator/liaison** + pre-arrival-report-review/estimate + visa/invitation-letter + **airport-pickup** + **accommodation-booking** + **currency-exchange** + SIM + **interpreters** + home-country-doctor-liaison + discharge-reports; **payment** cards-[Visa/MC/Amex-charged-INR-**choose-no-FX-fee-card**-**decline-Dynamic-Currency-Conversion**] + **wire-transfer**-~7-days + **UPI**-NRIs + forex-cards + cash-INR-small + **EMI/installment**-20-30%-upfront-6-12mo-some-interest-free + medical-loans + cross-border-financing; multi-currency; 15-20%-buffer; **cross-timezone-quick-response/WhatsApp-reassures**; **CDC-gold-standard** pre-travel-coordinate-home-follow-up+financing-for-continuity + inform-patients-of-rights+legal-recourse + arrange-licensing+accreditation+outcome-data + records-transfer-HIPAA-consistent[→DPDP/GDPR] + disclose-surgery+travel-risks; dental=most-common-US-medical-tourism — TravellerMD/Neo/Symbiosis/GetWellGo/HealthAndHopes/Esthetica-financing/Shifam/Dentzz/CDC-Yellow-Book/Wikipedia), and **GDPR cross-border health-data for EU/UK patients** (**GDPR+UK-GDPR-apply-extraterritorially-Art-3(2)** [marketing-to+processing-EU/UK-residents'-data→subject-regardless-of-HQ]; **health-data=special-category-Art-9 → explicit-consent + Art-6-lawful-basis + heightened-safeguards**; **cross-border-transfer-Chapter-V** India-no-adequacy-decision → **SCCs[EU]/IDTA-UK-Addendum[UK] + Transfer-Impact-Assessment[post-Schrems-II] + supplementary-measures[encryption/access-control]** + DPIA-for-high-risk; consent-explicit/specific/informed/documented/retractable/per-purpose + inform-of-third-country-transfer+safeguards; **consumer-grade-platforms[Zoom/WhatsApp]-rarely-acceptable-for-clinical-data-unless-compliance-configured → secure-in-app-upload-for-N4-NOT-raw-WhatsApp**; penalties-€20M/4%-global; multi-jurisdiction-GDPR+DPDP-both; country-specific-consent-forms+translation; EHDS-future — Kiteworks/Censinet/EDPS/DPO-Consulting/Retrev/PatientPartner/GA4GH/GDPRRegulation). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## N.interlink verification (Part 14)

- **Entries:** A1 tourism teaser (day one) + Shell-1 header "Product" → **N1**; N1 → N2/N3/N4/N6; programmatic search/AI-citation → **N14**. ✔
- **Exits / source-of-truth integrity:** verified clinics are the single source **C2/C3 + J1** (N layers an international face, no second clinic DB); India cost = **G** (N extends with home-country comparison); accreditation = **J1**; stories parallel **I7**; treatments tie **F4**; booking = **D** (timezone-aware IST/multi-tz); concierge WhatsApp = **M11** (coordination, not clinical upload); records/implant-passport = **E3**. No duplication. ✔
- **Compliance & safety:** **N4 = pre-arrival estimate, NOT a teleconsult/diagnosis** (NMC within-India only — L4; real diagnosis + treatment in person); **GDPR + UK GDPR** (explicit Art-9 consent + SCCs/UK-IDTA + TIA + secure encrypted in-app upload) **+ DPDP** (L1); visa invitation letter clinic-issued via FRRO portal + Government decides (Datun coordinates only — not an immigration authority); **ASCI/DCI** (real/consented before-after + disclaimers, no guaranteed outcomes, **B2B-subscription + relevance-not-pay-to-rank not paid-canvasser**); honest risk + recourse (CDC-aligned). ✔
- **Design-system interlinks:** savings-bar + cost-comparison + package + itinerary tables follow **Design Part 19** data-viz; before/after gallery, cards, maps = tokens/components; a11y per **Design Part 13**; multilingual. ✔
- **Word checks:** **"free" per refined rule** ("Get a free estimate" permitted here — honest + category-standard + conversion-positive; "Request an estimate" = premium A/B variant) · **"AI" absent** (doctor-backed; N4 is an estimate, real diagnosis in person). **Honest** (ranges-not-guarantees, realistic timelines, risk + recourse disclosure). **No regression to Parts 1–13:** C/J verification, G cost data, I7 stories, F4 treatments, D timezone booking, M11 WhatsApp, E3 records, L1/L4/L6 compliance all land exactly as specified — Family N is their international layer, not a fork. ✔

---

---

# PART 15 — FAMILY O: Q&A COMMUNITY ("DATUN ANSWERS") `[BOTH]`

## O.0 — Family principles (the UGC + GEO + doctor-acquisition engine, built on verified trust)

_Family O is Datun's question-and-answer community — Reddit/Quora/Practo-"ask-a-question" mechanics, but with one decisive difference: **only verified Datun dentists answer — never random people, never AI.** This is the whole point. The 2026 evidence is overwhelming that open or AI-generated health answers are unsafe (BMJ Open: ~half of chatbot health answers problematic, ~20% potentially harmful; ERS: "Reddit and Wikipedia don't meet the ethical/peer-review standards needed to verify health information"). Datun's verified-dentist-only model is the safety net those models can't provide, and it doubles as a growth engine: every question becomes a long-tail page that AI engines cite, and every answer builds a dentist's reputation and feeds the booking funnel. Research-locked rules:_

- **Verified-dentist-only answers (the moat + the safety net).** The authority of every answer comes from a real, DCI-verified dentist (badge + BDS/MDS + registration number + profile link). No AI-authored answers, no random/unverified contributors — this protects the doctor-backed-trust brand and avoids the spam/misinformation problems of open platforms.
- **Warm + anxiety-aware tone (deliberately the anti-Stack-Overflow).** Stack Overflow's own new-question volume fell ~78% (2024→2025), attributed to a "hostile moderation culture" + AI. Datun's askers are **never downvoted, never shamed, never made to feel stupid** — anxious patients asking about pain or a scary symptom must feel safe. This warmth is a design decision, not an afterthought.
- **General guidance, never a public diagnosis or prescription (NMC).** Public Q&A answers are educational/general only. **No prescriptions, no dosages, no definitive diagnosis without an exam** — every thread routes anything clinical to **"For a proper diagnosis, Ask Datun" (→ B1)**, because real patients ask emotional, context-thin questions and an answer can be "technically correct but medically inappropriate without context." **Medical disclaimer on every thread.** Emergencies → **M9**.
- **No pay-per-answer — reputation, not cash (evidence-based + DCI-clean).** Rigorous research (Information Systems Research) shows monetary "gifts" _crowd out_ doctors' intrinsic motivation and reduce engagement, while non-monetary recognition improves it. So Datun motivates dentists with **reputation + recognition + the patient-acquisition funnel + non-monetary badges** — never a per-answer fee (which would also raise DCI "paid canvasser" concerns). This keeps the relevance-not-pay-to-rank integrity (C/J) intact.
- **Privacy-first: anonymous by default (DPDP).** Asking is anonymous by default; PII is minimised + scrubbed before publishing; photos handled carefully. Anonymity-by-default is necessary (re-identification is real) and paired with moderation.
- **Cold-start is already solved — O is a layer, not a standalone app.** Because Datun already delivers value through Ask Datun (B), the directory (C), booking (D), and records (E), Family O doesn't face the empty-room problem of a standalone social product. It launches **seeded with real, anonymised/consented Q&A + verified-dentist-authored answers**, with Datun's pre-connected verified-dentist network as the answer supply.
- **QAPage is reserved here.** Multi-answer community questions use **`QAPage` JSON-LD** (vs `FAQPage` used elsewhere for single-author Q&A) — the schema distinction locked in Parts 9/I. `[BOTH]` faces: a public `[WEB]` reading/SEO surface + the `[APP]` asking/answering/notification experience.

**Q&A entry / source-of-truth map:** O ← A1 "Datun Answers" teaser (day one) + Shell-1 header "Product" + footer/L10 HTML-sitemap; O → **C2** (the dentist's answers live in one place — the O7 tab on their profile — feeding the booking funnel); O **enriches F + I** (relevant Q&A surfaced on condition/treatment/article pages — the pillar-cluster tie: condition ↔ symptoms ↔ treatments ↔ cost ↔ Q&A); O3 clinical CTA → **B1**; reputation/badges reuse the **K** dignified-gamification philosophy (adapted for professional contributors); moderation reuses the **C5** report+ML/human precedent; notifications via **M11/E9**; anonymity/consent tie **L1**.

---

## O1 — Community / Q&A home `[BOTH]`

**Purpose.** The front door to Datun Answers — invite a question, surface great answered ones.

### Sections/features (research: Q&A platform structure + warm tone)

1. **"Ask a question" CTA** (primary, warm, inviting — "Ask a verified dentist") → O2.
2. **Tabs:** Recent · Popular · **Unanswered** (the unanswered tab also drives the answer-supply loop → routed to relevant dentists).
3. **Categories** by condition/treatment (→ O4) · **search** (→ O6) · **top-contributors strip** (→ O8).
4. **Trust + disclaimer banner** — "Answered by verified dentists. General guidance, not a diagnosis." (sets expectations).

- **Build:** SSR (publicly readable); `CollectionPage` + `Breadcrumb` JSON-LD; warm/calm tokens; → O2/O3/O4/O6/O8.

## O2 — Ask a question (composer) `[APP]`

**Purpose.** Make asking easy, safe, and high-quality — _without_ Stack-Overflow intimidation.

### Sections/features (research: Stack Overflow Ask-Wizard + duplicate detection + anonymity)

1. **Concise title** + **detail field** (describe the concern) — gentle, friendly guidance (not a mandatory gate); descriptive-not-clickbait.
2. **Optional photo attach** (careful: consent + no identifying faces; reviewed before publishing).
3. **Tags** (condition/treatment — power grouping + de-dupe + related-questions).
4. **Anonymity toggle — default ANONYMOUS** (DPDP); gentle inline reminder: "avoid details that could identify you."
5. **Answer-guideline tip** (warm: "a verified dentist will answer; for a diagnosis we'll guide you to Ask Datun").
6. **Similar-questions surfacing** as the title is typed — reduces exact duplicates + lets the asker see existing answers immediately (legitimate variants still allowed → better coverage).
7. **Post** (with a light, friendly pre-post review/suggestion — never punitive).

- **Build:** `[APP]`; PII-minimisation + composer guidance; secure photo handling; warm microcopy; → O3.

## O3 — Question detail page `[BOTH]` _(the SEO/GEO asset — programmatic → thousands)_

**Purpose.** The page AI engines cite and patients land on — a real question, answered by verified dentists.

### Sections/features (research: QAPage + verified-answer + answer-first GEO)

1. **The question** (title + detail + optional photo + tags + asked-by **anonymous** by default) + **medical disclaimer**.
2. **Verified-dentist answers** — each: **verified-dentist badge + name + BDS/MDS + registration number + link to profile (→ C2)** · the answer (answer-first, scannable, plain language) · **citations where relevant** (CDC/NHS/Datun condition pages) · timestamp.
3. **Upvote / "helpful"** on answers (no downvote on askers — warm) · **best/verified-answer mark** (medically-reviewed + helpful — _not_ pure popularity, since popular-but-wrong is dangerous).
4. **Follow-ups / comments** (asker can ask for clarification; dentist responds) · **related questions** (by tag/topic) · **"For a proper diagnosis, Ask Datun" CTA (→ B1)** · **report** + **share**.

- **Build:** **`QAPage` JSON-LD** (question + multiple verified answers + accepted-answer + upvote counts); **SSR, publicly readable without login** (asking needs an account; _reading is public_ for SEO/GEO); answer-first + scannable; **quality-gate → noindex** thin/unanswered questions until a substantive verified answer exists (mirrors F/H discipline); → B1, C2, O4.

## O4 — Category / topic pages `[WEB]` _(by condition/treatment)_

**Purpose.** Browse Q&A by topic + tie the community into the content pillar-cluster.

### Sections/features

1. Q&A grouped by condition/treatment · **link to the matching condition/treatment page (→ Family F)** — the pillar-cluster tie (condition ↔ symptoms ↔ treatments ↔ cost ↔ Q&A) · **"Ask a question" CTA**.

- **Build:** SSR; `CollectionPage` + `Breadcrumb`; internal-linking to F + I; → O3/O2/F.

## O5 — Tag pages `[WEB]` _(programmatic)_

**Purpose.** One page per tag — long-tail coverage + crawl paths.

### Sections/features

1. Tag description · question list · related tags.

- **Build:** SSR; quality-gated (index only tags with enough substantive content); canonical discipline; → O3/O4.

## O6 — Search results (Q&A) `[BOTH]`

**Purpose.** Find an existing answer fast.

### Sections/features

1. Query + **filters** (answered / unanswered · tag · recency) · result cards (question + best-answer snippet + verified-dentist + helpful count).

- **Build:** content-based (works from day one via tags/text — no interaction history needed); → O3.

## O7 — Dentist answers tab (on Doctor profile, C2) `[BOTH]`

**Purpose.** A dentist's body of answers — credibility that converts to bookings.

### Sections/features (research: answering → authority → patient-acquisition funnel)

1. This dentist's answers + **reputation + badges** · **"Book" / "Consult" CTA** → the booking funnel (Family D).

- **Source-of-truth:** this is the **single place** a dentist's Q&A activity is shown (the C2 tab — already specified in Part 3, lines 426/479); O does not fork a second dentist surface. NMC/DCI-compliant (educational answers, no misleading claims, no per-patient commission). → C2/D/O3.

## O8 — Leaderboard / Top contributors `[BOTH]`

**Purpose.** Recognise the dentists who help most — the engine that keeps answers flowing.

### Sections/features (research: reputation motivates experts + anti-gaming + dignified)

1. **Reputation ranking** + **badges** ("Verified Dentist", "Top Contributor", quality milestones) — **dignified, professional gamification** (unlike the patient-facing surfaces in Family K, a leaderboard _is_ appropriate for professional contributors).
2. **Reward quality, not speed/volume** — reputation is driven by **helpful-voted + medically-reviewed + best-answer** marks, not by answering first or flooding (the explicit fix for Stack Overflow's speed-rewarding flaw); anti-gaming safeguards.

- **Build:** `[BOTH]`; non-monetary recognition only (no pay-per-answer — evidence-based); ties O7/C2; → O3/C2.

## O9 — Community guidelines + report / moderation `[WEB]`/`[APP]`

**Purpose.** Specific, visible rules + a real moderation pipeline = safety + trust.

### Sections/features (research: hybrid moderation + clear escalation + specific rules)

1. **Specific, actionable rules (not "be nice"):** verified-dentists-only answer · **no prescriptions/dosages/definitive-diagnosis in public** (route to Ask Datun; NMC) · **evidence-based, no misinformation** · **no self-promotion / no solicitation / no off-platform contact-sharing** (DCI no-canvasser; protects relevance-not-pay-to-rank) · **no PII** (yours or others') · respectful + warm (no harassment/shaming) · no spam/duplicate-flooding · emergencies → M9.
2. **Report flow** on every question + answer → **hybrid moderation: ML (volume/pattern + PII detection) + human (context/empathy) + medical-review (clinical/compliance)** → action (edit/redact/remove/warn/suspend) with **clear escalation paths** (who handles a PHI exposure, a misinformation claim, a harmful/threatening post) and **fast handling of sensitive content**.

- **Build:** SSR (guidelines public); moderation reuses the **C5** report+ML/human precedent + medical-review; documented + consistent (inconsistency erodes trust); → O3, M9.

---

## O.shared systems (apply across Family O)

- **Verified-dentist-only + never AI:** every answer is authored by a DCI-verified dentist (badge + credentials + C2 link); no AI-authored answers, no unverified contributors. This is the safety net + the moat.
- **Safety spine:** general guidance only — **no public Rx/dosage/definitive-diagnosis** (NMC; route clinical → B1) · **medical disclaimer on every thread** · emergencies → **M9** · **hybrid ML + human + medical-review moderation** with clear escalation + fast sensitive-content handling.
- **Privacy spine (DPDP):** **anonymous by default** · PII minimised + scrubbed before publishing · careful photo handling (consent, no identifying faces) · no commercial misuse · ties **L1**.
- **Doctor-acquisition engine, ethically:** dentists are motivated by **reputation + recognition + the booking funnel (O7→C2/D) + non-monetary badges (O8)** — **never pay-per-answer** (crowds out motivation + DCI "paid canvasser"). Unanswered questions are routed to relevant dentists by specialty/tag.
- **GEO engine:** QAPage JSON-LD · publicly-readable SSR · answer-first + scannable + citations · **quality-gate (noindex thin/unanswered)** · pillar-cluster internal linking (O4 → F) — Q&A is the highest-value AI-citation format, and real patient questions are perfect long-tail/conversational matches.
- **Cold-start solved:** O is a layer on a product that already has utility (B/C/D/E); seeded with real anonymised/consented Q&A + verified-dentist answers at launch.
- **Brand discipline:** **"AI" absent** (verified human dentists answer; the contrast with unsafe AI answers is the selling point) · **"free" per refined rule** · warm + anxiety-aware (askers never downvoted) · accessible (WCAG 2.2 AA, Design Part 13) · multilingual.

## O.research-basis (Part 15)

~100+ sources synthesized across nine dense passes, including: **health Q&A community platforms & UGC mechanics** (Cleveland-Clinic-Health-Q&A 10k-physician-reviewed; **Practo "ask health questions"** 20k+-verified-doctors-25+-specialties-incl-dentist-5min-response-verification-recently-answered-surfaced [India precedent — uses "free"; Datun uses "free" only per the refined rule, not as a hook]; iCliniq-4,500-doctors-80-specialties-7M-cases; WebMD-community+100-doctor-medical-review; generic Q&A [Quora/Reddit/Stack/Brainly] voting+reputation-surface-best+build-trust, contributor-rules answer-in-expertise/comprehensive/no-self-promotion-spam/respond-to-follow-ups; skeptic "anyone can answer maybe ignorantly" → verified-only wins — Cleveland/Practo/iCliniq/WebMD/Quora/McKbytes), **medical Q&A safety + moderation + expert-verified models** (**2026 evidence AI health answers unsafe** — BMJ-Open 49.6%-problematic/19.6%-harmful, npj-HealthAdvice 21.6-43.2%-problematic/5-13%-unsafe-_serious-harm-potential_, ChatGPT-Health-under-triaged-52%-emergencies, Google-AI-Overviews-harmful-cancer/liver-advice; chatbots-pattern-match-lack-clinical-context/history/gestalt-rarely-express-uncertainty; **Duke studies Reddit-r/AskDocs verified-clinician answers as gold-standard**; **ERS "Reddit-user-moderation + Wikipedia-open-editing neither meet ethical/peer-review standards for health info"**; **disclaimers critical-but-declining-in-AI 26.3%-2022→0.97%-2025**; **moderation=brand-governance hybrid ML+human "AI-scales-human-judgment-keeps-you-safe"** + clear-escalation + fast-PHI-handling + inconsistency-erodes-trust; context-blind "answers-a-slightly-different-question" → route-to-consult — TeleDirectMD/WGContent/GetStream/npj-Nature-HealthAdvice/Paubox/PMC-NIH/ERS/AnnotationBox/npj-disclaimer-decline/Duke), **UGC SEO/GEO + AI-citation + QAPage** (**QAPage=multiple-answers-from-different-people [Stack-Overflow/Quora] vs FAQPage=one-author-answer → QAPage-reserved-for-Family-O confirmed**; **GEO=citations-not-rankings**; **Q&A=highest-performing-AI-citation-format** [ChatGPT/Perplexity/AI-Overviews-rely-heavily]; AI-queries-long/conversational-23-words-vs-4 → real-patient-Q&A-perfect-long-tail; cited-content=evidence-backed-authority+credentials+citations+answer-first+scannable+transparency-signals; **technical** SSR+publicly-readable-no-login-to-read+AI-crawlers-allowed+schema; **thin/duplicate=#1-UGC-SEO-risk → similar-questions-surfacing-de-dupe + quality-gate-noindex** [mirrors F/H]; fan-out-sub-queries; only-38%-AIO-citations-from-top-10 — Digidop/Jasper/LLMrefs/Frase-FAQ/Frase-AEO), **question-composer / ask-a-question UX** (**asking-is-intimidating-even-for-veterans + post-publishing-anxiety** [fear-of-duplicate/snide-remarks/not-fitting-standards]; **Stack-Overflow Ask-Wizard** guided-steps-for-first-timers → quality+avoids-duplicates+"approachable-even-fun"; **title descriptive-not-clickbait**; **duplicate-detection** surface-similar-as-you-type+tags-group+merge-without-losing-answers, **but subtle-variants-valuable** "people-search-in-different-words→better-coverage"; pre-post-review-with-suggestions; **the cautionary tale: SO-newcomer-experience-"deleted/downvoted/closed=hostile" → Datun-warm-anxiety-aware-askers-never-downvoted** — SO-blog-research/Ask-Wizard/Asking-Better-Questions/Handling-Duplicates/Medium), **answer-display / question-detail UX** (**verified-badge+credentials** [Quora-badges-experts→"context-about-who's-answering"] → Datun-verified-dentist-badge+BDS/MDS+reg-number+C2-link; rich-formatting+citations; engagement upvote/helpful [Datun-no-downvote-on-askers]+follow+comment-threads+follow-ups+Spaces≈categories; **best/verified-answer-mark medically-reviewed+helpful-NOT-pure-popularity** [popular-but-wrong-dangerous]; **cautionary: SO-new-questions-fell-78%-2024→2025 from "hostile-moderation-culture"+AI → SO-pivots-to-"human-to-human-connection"=Datun's-verified-dentist-moat**; **unanswered-Q's-often-fail-to-attract-expert → route-to-relevant-dentists-by-specialty** — Gizmodo-Quora/Wikipedia-SO/SO-blog-March-2026/Quora/StackShare), **expert-engagement + reputation + incentives** (**why-dentists-answer** professional-reputation+authority+thought-leadership "go-to-expert-in-specialty/area" → **patient-acquisition-funnel** [answering-builds-credibility→patients-book; doctors-who-educate-outperform-advertisers; 81%-check-reviews-before-choosing]; India-doctor-influencers-rising [dentists-YouTube-smile-makeovers]-MCI/NMC-compliant-plain-language+consent+no-misleading; **CRITICAL monetary-incentives-BACKFIRE** [Information-Systems-Research: paid-"gifting"-NEGATIVELY-affected-doctor-responses-"crowding-out-of-intrinsic-motivation"; **non-monetary-recognition-better-carryover+relationship**] → **Datun-no-pay-per-answer-reputation/recognition/funnel/badges-instead** [+DCI-paid-canvasser-clean]; **O8-leaderboard-for-dentists-appropriate** [professional-contributors-unlike-patient-facing] but **reward-quality-not-speed/volume** [SO's-flaw]; verified-credential-gate Sermo/Doximity-model — Datun-dentists-pre-verified-DCI/J1 — Sermo/ClinicManager/OrangeGlobal/Sermo-reputation/Doximity/Calcium-gamification/Sermo-mobile/Redwud-India/Informa-Systems-Research-crowding-out/HMS-doctor-influencers), and **anonymity + privacy + community guidelines** (**anonymity-by-default-necessary-but-not-sufficient** [re-identification-real: Sweeney-87%-with-gender+DOB+zip; 99.98%-with-15-attributes; "data-either-useful-or-anonymous-never-both"] → **anonymous-default + PII-minimisation + composer-guidance + ML+human-moderation-to-detect/redact-PII**; **photos-carry-re-identification+sensitive-content-risk** → consent+review+no-identifying-faces; **confidentiality=ethical-obligation** [AMA: no-third-party-commercial-use-without-consent] + **DPDP-health-high-risk**; **cold-start solved-as-a-layer** [single-user-utility + niche-saturation + seed-real-Q&A-at-launch — Datun-not-standalone-social-app, layer-on-B/C/D/E + pre-connected-verified-dentist-network]; surface-relevant-Q&A-content-based-day-one [tags/text] + popular/recent/unanswered + search; **pillar-cluster-taxonomy** O4→F-pillars; Q&A-page-set-confirmed [listings/threads/profiles/categories/tags/notifications/admin] — PatientPrivacyRights/Censinet/PMC-PHSM/Lifebit/PMC-privacy-engineering/PMC-data-ownership/SCP-Health/AMA-Code/FPF/AndrewChen-cold-start/AdminLTE-Disilab/cold-start-recsys/Brafton-topic-clusters). Decisions above are the FAANG-grade, 2031-forward synthesis — not options.

## O.interlink verification (Part 15)

- **Entries:** A1 "Datun Answers" teaser (day one) + Shell-1 header "Product" + footer/L10 HTML-sitemap → **O1**; F/I content pages surface relevant Q&A → **O3**; C2 doctor profile → **O7** tab. ✔
- **Exits / source-of-truth integrity:** a dentist's Q&A activity lives in **one place** — the **O7 tab on C2** (already specified in Part 3); O does not fork a second dentist surface. Clinical questions route to the single diagnosis path **B1** (Ask Datun). Categories link to the single condition/treatment source **Family F** (pillar-cluster). Reputation/badges reuse the **K** dignified-gamification philosophy (adapted for professional contributors); moderation reuses the **C5** report+ML/human precedent + medical-review; notifications via **M11/E9**; anonymity/consent tie **L1**. **`QAPage` is the single multi-answer schema** (vs FAQPage elsewhere — Parts 9/I). No duplication. ✔
- **Compliance & safety:** **verified-dentist-only** answers · **no public Rx/dosage/definitive-diagnosis** (NMC; route → B1) · **medical disclaimer every thread** · emergencies → **M9** · **anonymous-by-default + PII-scrubbing** (DPDP/L1) · **ASCI** (no misleading medical claims) · **DCI** (no self-promotion/solicitation; **no pay-per-answer** → not a "paid canvasser"; relevance-not-pay-to-rank intact) · hybrid ML+human+medical-review moderation with clear escalation. ✔
- **Design-system interlinks:** Q&A home/thread/composer/leaderboard = tokens/components; **no charts** (discussion content — per the architecture map); warm/calm/anxiety-aware tone; a11y per **Design Part 13**; multilingual. ✔
- **Word checks:** **"AI" absent** (verified human dentists answer — the contrast with unsafe AI answers _is_ the value proposition) · **"free" per refined rule** (the "Ask a question" CTA avoids promotional "free"; Practo's "free" framing not copied as a hook — Design Part 12.5). **Warm + anxiety-aware** (askers never downvoted/shamed). **No regression to Parts 1–14:** the A1 Q&A teaser, the C2 Q&A-answers tab (O7), F/I Q&A enrichment + pillar-cluster linking, the QAPage-reserved-for-O schema decision, the L1 anonymity/DPDP commitments, and the K dignified-gamification philosophy all land exactly as specified — Family O is their community engine, not a fork. ✔

---

_End of Part 15 — and the **patient-side build spec is now COMPLETE (Families A → O)**. Fifteen families, ~90 unique page templates plus the programmatic engines, every page wired to a real backend capability, every interlink traced, every page researched against world-class benchmarks and 2026-correct compliance (NMC, DCI, DPDP, GDPR/UK-GDPR, ASCI, WCAG 2.2 AA), with the brand discipline ("AI" absent; "free" per the refined rule; doctor-backed; warm) held throughout. This living document is the companion to `Datun_Design_System_FINAL.md` (how it looks) — together they are the FAANG-grade, 2031-forward blueprint for everything a patient touches._

_Possible next steps (founder + CTO to choose): (1) a **build-sequencing / release plan** that orders A→O into shippable milestones for the ~15 Jul launch + Prasanth's 15 Jul onboarding (ADRs, clean git history, zero single-person dependency); (2) finalise any remaining **Design System** parts; (3) begin the **clinic side** (apps/clinics, clinics.datunai.com) — a separate spec, explicitly out of scope here. Patient side: done._
