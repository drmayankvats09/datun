# DPDP Act 2023 Compliance — Seed Pipeline

The seed pipeline ships a first-class DPDP profile because patient-level data is being processed at scale.

## Mapping to the DPDP Act

| DPDP section                      | How the seed pipeline complies                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| §2(t) personal data               | `pii-detector.ts` + `dpdp-rules.ts` cover NAME, EMAIL, PHONE, ADDRESS, DOB, government IDs   |
| §6 consent                        | Consent records seeded via `consent-records.module.ts` (TRIAGE, TREATMENT, AI_TRAINING)      |
| §10 obligations of data fiduciary | Audit trail in `anonymization/audit-trail.ts` + `production-polish/audit-log-persistence.ts` |
| §11 right to information          | DPDP request seeding via `compliance/dpdp-requests.module.ts`                                |
| §17 cross-border transfer         | Exports default to `ap-south-1` (Mumbai) S3; never auto-uploaded outside India               |
| §28 security safeguards           | Encryption at rest (S3 SSE-AES256), redacted logging, secret manager `failFastIfInvalid`     |
| §33 penalties                     | Audit log retention 90 days minimum (configurable) — enables defensible compliance posture   |

## Default DPDP rule set

`anonymization/dpdp-rules.ts` exports `DPDP_FULL_RULESET` covering:

- Patient PII (name, phone, email, address, Aadhaar, PAN)
- User credentials (email, phone, password hash, last IP)
- Consultation transcripts (free-text redaction)
- Payment records (card last 4, payment IDs)

Medical fields (`medicalConditions`, `currentMedications`, `knownAllergies`) are **kept** to preserve research utility.

## k-anonymity guarantee

All staging exports run through `validateKAnonymity` with `k=5` over the quasi-identifier set:
`{ageYears, gender, pincode, preferredLocale}`.

Records that would violate k-anonymity are listed in the audit report; the engine offers `applySuppression` to drop them before export.

## Cross-border transfers

The pipeline never auto-transfers data outside India. The S3 bucket configured via `AWS_S3_EXPORT_BUCKET` must be in `ap-south-1` or another approved region. Compliance review required before changing.

## Subject-access requests

When a patient files a DPDP §11 request:

1. Look up the `DpdpRequest` row created by the in-app form.
2. Run `... export jsonl --tables=patient,consultation,prescription --output=<patientId>.jsonl`.
3. Apply patient-scoped filter via the request's `patientId` (manual edit of exporter input).
4. Deliver via secure portal; mark request `FULFILLED` in the DB.

## Erasure requests

Per §12, irreversible erasure must:

1. Update `Patient.erasedAt` to current timestamp.
2. Anonymize all related rows via `... anonymize --table patient --compliance DPDP`.
3. Trigger downstream cleanup (cached PDFs, Cloudinary uploads, WhatsApp threads).
4. Persist the audit-log entry indefinitely (regulator-mandated proof).
