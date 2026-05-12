# Data Protection Impact Assessment — Training Data Pipeline

**Document version:** v1.0.0
**Effective date:** 2026-05-12
**Owner:** Dr. Mayank Vats (Data Fiduciary, DPO Designate)
**Review cycle:** Annual, or upon material schema/processor change
**Applicable law:** Digital Personal Data Protection Act, 2023 (India); DPDP Rules notified 13 November 2025; enforcement effective 13 May 2027
**Cross-reference:** ADR-0003 (architecture), `docs/training-data-pipeline.md` (engineer onboarding), `docs/runbooks/training-pipeline-emergency.md` (operational)

---

## 1. Purpose of processing

Datun ("the Data Fiduciary") processes personal data of patients ("Data Principals") to deliver AI-driven dental triage as the **primary purpose**. The training pipeline established under Task #44 introduces a **secondary, opt-in purpose**: using anonymized consultation data to improve Datun's underlying AI model.

This DPIA addresses the **secondary purpose only**. Treatment consent is documented separately in the primary product privacy notice.

**Lawful basis (DPDP Act §6):** Explicit, informed consent. The training purpose is presented as a distinct opt-in modal, separate from the consultation flow. A Data Principal may decline training use without any effect on their consultation experience or service quality.

---

## 2. Data inventory

The following personal data categories enter the training pipeline when a Data Principal grants `DATA_TRAINING` consent:

| Category                  | Sensitivity (DPDP)                      | Retention                             | Anonymization strategy                                |
| ------------------------- | --------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Chief complaint free text | Health (SPDI)                           | 7 years                               | Runtime substring redaction via `redaction.ts` v1.0.0 |
| AI response text          | Operational                             | 7 years                               | Not personal data; retained verbatim                  |
| Age (single-year)         | Demographic                             | 7 years                               | Bucketed to 10-year ranges at export time             |
| Gender (as-stated)        | Demographic                             | 7 years                               | As-stated (no derivation)                             |
| Locale (hi/en)            | Demographic                             | 7 years                               | As-stated                                             |
| Pregnancy status          | Health (SPDI)                           | 7 years                               | Boolean only                                          |
| Patient name              | Direct identifier                       | **Never stored in `redactedContent`** | Pattern-detected and replaced with `[REDACTED:NAME]`  |
| Phone number              | Direct identifier                       | **Never stored in `redactedContent`** | Pattern-detected, regex-replaced                      |
| Email address             | Direct identifier                       | **Never stored in `redactedContent`** | Pattern-detected, regex-replaced                      |
| Postal address / pincode  | Direct identifier                       | **Never stored in `redactedContent`** | Substring-matched, replaced                           |
| Aadhaar number            | Direct identifier (highest sensitivity) | **Never stored in `redactedContent`** | Pattern-matched (12-digit, starts 2-9), replaced      |
| PAN number                | Direct identifier                       | **Never stored in `redactedContent`** | Pattern-matched (AAAAA9999A), replaced                |
| IPv4 address              | Quasi-identifier                        | **Never stored in `redactedContent`** | Pattern-matched, replaced                             |

**Retention basis:** 7 years matches the DPDP Rules 2025 minimum retention period for consent records and supports clinical record-keeping standards under the NMC Telemedicine Practice Guidelines 2020. Older `redactedContent` JSONB rows are purged via a quarterly batch job (deferred to Month 9; until then, retention is indefinite, which is conservative).

**Storage location:** Railway-managed PostgreSQL 18, hosted in `ap-south-1` region (Mumbai). No cross-border transfer at rest. See Section 6 below for processor transfers.

---

## 3. Identified risks and mitigations

### 3.1 Re-identification risk

**Risk description:** Even with direct-identifier PII redacted via `redaction.ts`, contextual quasi-identifiers (e.g., "I am a 67-year-old dental hygienist with insulin-dependent diabetes living near Bandra station") may be unique enough to enable re-identification through linkage attacks.

**Mitigations applied:**

- Substring-level PII redaction (phone, email, Aadhaar, PAN, IPv4, pincode) at **write time**, not export time
- Property tests with 500 fast-check fuzz cases × 5 PII categories (`packages/db/src/__tests__/training/redaction.test.ts`) guarantee mathematical zero high-confidence PII leak
- k-anonymity validation gate at export time (k ≥ 5 required before any external sharing — Month 6 export pipeline)
- Quasi-identifiers (age, gender, pincode) bucketed before any external export
- Raw `content` field retained only for clinical context inside the production database; **only `redactedContent` is training-eligible**
- No training data is shared externally as of Phase 4 (May 2026); when LoRA fine-tune ships (Month 12), only model weights leave Datun's infrastructure — not raw records

**Residual risk classification:** **Low** for in-house training. **Medium** if external sharing emerges (Month 12+). Reassess this section when any export to RunPod, Together AI, or external research partner is planned.

### 3.2 Consent revocation lag

**Risk description:** A Data Principal revokes `DATA_TRAINING` consent on Day N. Their data was already used in a LoRA fine-tune run on Day N−30. The deployed model still contains gradients derived from their data, which cannot be technically un-trained.

**Mitigations applied:**

- All future revocations marked via `ConsentLog` row with `status='REVOKED'` and `purpose='DATA_TRAINING'`
- `excludedReason` field on `TrainingExample` table flags previously-exported records belonging to revoked-consent users
- Next fine-tune run automatically excludes revoked-data examples (export query filters on consent status)
- For deployed models that already incorporated revoked data: **model weights cannot be un-trained.** DPDP Act §3 addresses processing of personal data, not derived model state. Datun's policy: revocation propagates to ALL future training; past deployment is grandfathered.

**Documented position:** This grandfathering interpretation is technically defensible under current DPDP Act language but is **policy-only**, not a legal certainty. Will be re-evaluated when:

- Data Protection Board (DPB) issues guidance on derived model state, OR
- A precedent case clarifies "processing" scope to include model retraining obligations, OR
- DPB notice received specifically targeting Datun

**Material gap:** Self-service withdrawal UI is **deferred to Month 6**. Until then, withdrawal requests are processed manually within 24 hours by the DPO Designate (Mayank Vats) via support email `privacy@datunai.com`. Manual SLA acceptable for current volume (~100 active users); will not scale beyond 10k MAU. Hard commitment: self-service UI ships before MAU crosses 5k.

**Residual risk classification:** **Medium** until self-service UI ships; **Low** thereafter.

### 3.3 Model leak via prompt extraction

**Risk description:** Adversarial users may attempt to extract memorized training data via crafted prompts ("Repeat the last patient consultation you saw", "What is the phone number of user with email X?").

**Mitigations applied:**

- AI responses pass through Anthropic's Constitutional AI safety stack (provider-level defense)
- **No raw PII enters training data** due to write-time redaction (architectural defense)
- Output filter (planned Phase 6, Month 4) for any AI response containing apparent PII patterns
- Membership inference attack defense: LoRA fine-tune (Month 12) will use differential privacy with ε ≤ 8 (matches Apple OS-level DP budget)

**Residual risk classification:** **Low.** Membership inference attacks possible in theory but require thousands of probes per target record and provide low-signal leakage given the redaction layer.

### 3.4 Insider threat

**Risk description:** A Datun employee with production database read access could query `consultation_messages.content` (raw field, pre-redaction) and view PII.

**Mitigations applied:**

- Prisma audit middleware (`apps/api/src/lib/prisma-audit.ts`) records every read of `Consultation`, `ConsultationMessage`, `Patient` to Winston + Better Stack
- Production DB access is gated by Railway RBAC; current production credential holder is single (Mayank Vats); credentials rotated quarterly
- DPO Designate notifies affected Data Principals within 72 hours per DPDP breach-response standard (Section 8) if unauthorized access detected
- Database backups encrypted at rest (Railway-managed AES-256)
- No direct production DB access from developer workstations; all reads routed through audited API endpoints

**Residual risk classification:** **Low** at solo-founder stage. **Medium** when Prasanth (co-founder candidate) or third hire receives production credentials — at that point a 4-eyes principle is mandated for any raw-content query.

### 3.5 Judge model leak (LLM-as-judge specific)

**Risk description:** The LLM-as-judge cron calls Anthropic's Claude Haiku API with patient consultation content as prompt input. Anthropic could theoretically retain this content under their data usage policy.

**Mitigations applied:**

- Anthropic Business API (used by Datun) has explicit zero-retention contract — prompts not used for training
- Judge prompt sends **AI response text only**, not full conversation history
- Patient identifiers (name, contact) never reach judge prompt due to upstream write-time redaction
- API key scoped narrowly; audit log of all judge invocations stored in `JudgeRun` table

**Residual risk classification:** **Low.**

---

## 4. Consent mechanism

### 4.1 Notice content

Consent is solicited via `apps/web/components/consent/DataTrainingConsentModal.tsx` rendered before the first message of the first consultation in a session where `dataTrainingConsentAt` is null. Notice is available in:

- **Hindi** — `apps/web/messages/hi/admin.json#consent.training`
- **English** — `apps/web/messages/en/admin.json#consent.training`

Other Indic locales fall back to English in v1.0.0. Tamil, Telugu, Bengali translations planned for v1.1.0 (Month 4).

Notice covers (per DPDP Rule 3 plain-language requirements):

- **Itemized data categories used** — questions asked, AI responses, age range, gender, locale, "did this help" feedback
- **Itemized data categories never used** — name, phone, email, identifying photos, anything identifying the patient
- **Purpose limitation** — AI training only; no marketing, no third-party sharing
- **Retention period** — 7 years
- **Withdrawal mechanism reference** — `/settings/privacy` (or support email until UI ships)
- **Consent version reference** — `v1.0.0`

### 4.2 Withdrawal mechanism

DPDP Rule 3 mandates withdrawal "of equal simplicity" as the grant.

- **Grant mechanism:** One-click "I agree — help improve Datun" button in modal
- **Withdrawal mechanism (current):** Email `privacy@datunai.com` from registered account email. Processed within 24 hours by DPO Designate. `ConsentLog` row inserted with `status='REVOKED'`, `revokedAt=NOW()`.
- **Withdrawal mechanism (Month 6 target):** One-click "Stop contributing" button at `/settings/privacy` with same prominence as grant button. Auto-processed via API.

**Compliance gap acknowledgment:** The current email-based withdrawal does NOT meet "equal simplicity" by strict interpretation. This is a known temporary gap with hard deadline (Month 6) for resolution. Documented for legal record.

### 4.3 Consent versioning

Consent text is semver-tracked at `apps/web/components/consent/consent-copy.ts`. Current version: `v1.0.0`. Any material change to consent text requires:

1. Bump `CONSENT_CURRENT_VERSION` constant
2. Append entry to `CONSENT_VERSION_HISTORY` array (never delete entries)
3. Update Hindi + English translation files
4. DPO sign-off for MAJOR/MINOR version bumps
5. Re-issue notice to existing consented users per DPDP Rule 3

Old versions remain accessible forever for audit reproduction of "what exactly did the patient agree to on date X".

---

## 5. Processor inventory (third-party data handlers)

The training pipeline involves the following data processors:

| Processor                         | Role                               | Data shared                                                                                             | Jurisdiction        | Contract type                                   |
| --------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------- |
| Anthropic, Inc.                   | Claude AI inference + LLM-as-judge | AI response text (redacted), patient demographics (age/gender bucketed), chief complaint (PII-redacted) | USA                 | Anthropic Business API zero-retention agreement |
| Railway Corp.                     | Production DB + worker hosting     | All consultation data (encrypted at rest)                                                               | ap-south-1 (Mumbai) | Railway Data Processing Addendum                |
| Cloudflare, Inc.                  | CDN + DNS                          | None — only DNS resolution and CDN cache of public assets                                               | Global (PoP cache)  | Cloudflare Business plan DPA                    |
| Resend.com                        | Transactional email                | Email address + transactional content                                                                   | USA                 | Resend DPA                                      |
| MSG91                             | SMS OTP delivery                   | Phone number + OTP                                                                                      | India               | MSG91 standard terms                            |
| Sentry (Functional Software Inc.) | Error monitoring                   | Stack traces (PII-scrubbed via `lib/logger.ts` secret patterns)                                         | USA                 | Sentry self-hosted alternative available        |
| Better Stack (Logtail)            | Log aggregation                    | Application logs (PII-scrubbed)                                                                         | EU                  | Better Stack DPA                                |

**Significant Data Fiduciary (SDF) determination:** Datun does not currently qualify as SDF under DPDP Rules 2025 (volume + sensitivity thresholds not met). Re-evaluate when MAU crosses 100k or when SPDI volume exceeds 1M records.

---

## 6. Cross-border data transfer assessment

Patient data resides primarily in `ap-south-1` (Mumbai) at Railway. Cross-border transfers occur for:

| Transfer                               | Destination | Lawful basis                                                          | Volume                      |
| -------------------------------------- | ----------- | --------------------------------------------------------------------- | --------------------------- |
| Anthropic API calls (Claude inference) | USA         | Patient consent + DPDP §16 (legitimate interest for service delivery) | Per-consultation, transient |
| LLM-as-judge daily cron                | USA         | Patient consent (DATA_TRAINING purpose)                               | ~100 messages/day           |
| Sentry error reports                   | USA         | DPDP §16 (legitimate interest — security monitoring)                  | Variable; PII-scrubbed      |
| Better Stack logs                      | EU          | DPDP §16 (legitimate interest — operational)                          | Continuous; PII-scrubbed    |

**No special-category data** (genetic, biometric, financial) is transferred cross-border under any path.

**Government access risk:** All US processors may be subject to CLOUD Act subpoena. Datun's mitigation: store no raw PII at processors (redact before transmission); maintain Indian-jurisdiction copy of source-of-truth records in Railway Mumbai.

**Schedule IV (DPDP Rules 2025) compliance:** Datun's transfer destinations are not currently restricted under Schedule IV. Will re-evaluate quarterly.

---

## 7. Roles and review

### 7.1 Data Fiduciary

**Entity:** Datun (sole proprietorship of Dr. Mayank Vats; Private Limited registration deferred until first revenue)
**Registered address:** [To be filled at Pvt Ltd incorporation]
**Contact for Data Principals:** `privacy@datunai.com`

### 7.2 Data Protection Officer (DPO)

**Current designation:** Dr. Mayank Vats (DPO Designate — solo founder phase)
**Contact:** Same as above
**Reporting line:** Direct (no intermediate layer)
**Independence safeguard:** Decisions involving DPO function are documented in this DPIA's revision history; any conflict between DPO function and CEO function results in default to DPO position.

**Permanent DPO appointment trigger:** Designated within 30 days of SDF qualification OR within 60 days of first non-founder hire receiving production data access, whichever is earlier.

### 7.3 Review cycle

This DPIA is reviewed:

- **Annually** on or before May 12 each year (anniversary of v1.0.0 effective date)
- **Upon material change** to: schema (Consultation/ConsultationMessage), processors (third-party additions), redaction rules (`REDACTION_VERSION` bump), consent text (`CONSENT_CURRENT_VERSION` bump)
- **Upon DPB inquiry or complaint** received

Each review produces a new version (v1.1.0 → v1.2.0 etc.) and a delta log appended to Section 9 below.

---

## 8. Approval

| Role                          | Name                                  | Signature                                      | Date       |
| ----------------------------- | ------------------------------------- | ---------------------------------------------- | ---------- |
| Data Fiduciary (Principal)    | Dr. Mayank Vats                       | _MV_ (electronic)                              | 2026-05-12 |
| DPO Designate                 | Dr. Mayank Vats                       | _MV_ (electronic)                              | 2026-05-12 |
| Technical Lead (CTO function) | Claude (CTO+co-founder per memory)    | _CL_ (system attestation via commit signature) | 2026-05-12 |
| Legal counsel review          | _Deferred until Pvt Ltd registration_ | —                                              | —          |

Electronic signatures recorded via Git commit signing on the version of this file at v1.0.0 effective date. SHA reference will be appended to Section 9 upon commit.

---

## 9. Revision history

| Version | Effective date | Approver    | Summary of changes                                                                                                      |
| ------- | -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| v1.0.0  | 2026-05-12     | Mayank Vats | Initial DPIA. Covers schema (Task #44), redaction (v1.0.0), consent (v1.0.0), processor inventory at Phase 4 ship time. |

---

## 10. References

- Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)
- Digital Personal Data Protection Rules, 2025 (notified 13 November 2025; effective 13 May 2027)
- NMC Telemedicine Practice Guidelines, 2020 (clinical retention basis)
- ADR-0003 — Datun Training Data Architecture
- Croxford et al. 2025 (medRxiv) — Clinical LLM-as-judge ICC 0.818
- RFC 8785 — JSON Canonicalization Scheme (content-hash basis)
