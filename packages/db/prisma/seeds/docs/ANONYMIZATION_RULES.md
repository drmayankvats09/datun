# Anonymization Rules

The anonymization engine ships three first-class compliance profiles plus combinations.

## Profiles

| Profile           | Rule sets included         | Use case                                 |
| ----------------- | -------------------------- | ---------------------------------------- |
| `DPDP`            | DPDP only                  | India-only deployments                   |
| `HIPAA`           | HIPAA Safe Harbor only     | US clinical pilots                       |
| `GDPR`            | GDPR pseudonymization only | EU partner integrations                  |
| `DPDP_HIPAA`      | DPDP + HIPAA               | India + US joint research                |
| `DPDP_HIPAA_GDPR` | All three                  | Maximum protection (default for FT data) |

## Strategy reference

| Strategy    | What it does                                          |
| ----------- | ----------------------------------------------------- |
| `keep`      | Pass value through unchanged                          |
| `null`      | Replace with NULL                                     |
| `redact`    | Replace with placeholder string                       |
| `truncate`  | Keep first N chars only                               |
| `hash`      | SHA-3 + salt; preserve prefix/suffix optionally       |
| `pseudonym` | Deterministic but irreversible alias                  |
| `noise`     | Add bounded random noise to numeric values            |
| `fake`      | Replace with realistic synthetic value (Faker-like)   |
| `shuffle`   | Permute values within column (preserves distribution) |

## DPDP rule set excerpt

| Model          | Field               | Strategy                       | Justification                       |
| -------------- | ------------------- | ------------------------------ | ----------------------------------- |
| `patient`      | `firstName`         | `fake:name`                    | DPDP §2(t)                          |
| `patient`      | `phone`             | `fake:phone`                   | DPDP §2(t)                          |
| `patient`      | `email`             | `fake:email`                   | DPDP §2(t)                          |
| `patient`      | `pincode`           | `truncate:3`                   | k-anonymity quasi-identifier        |
| `patient`      | `dateOfBirth`       | `keep`                         | Medical relevance — age preserved   |
| `patient`      | `aadhaar`           | `null`                         | DPDP §2(t) sensitive — never expose |
| `patient`      | `medicalConditions` | `keep`                         | Research utility — preserved        |
| `user`         | `passwordHash`      | `redact:$2b$10$ANONYMIZED`     | DPDP §2(t)                          |
| `consultation` | `fullConversation`  | `redact:[transcript-redacted]` | Free-text PII risk                  |
| `payment`      | `cardLast4`         | `redact:****`                  | PCI-DSS                             |

## HIPAA Safe Harbor (US)

Removes the 18 identifiers listed in §164.514(b)(2). Pincode is truncated to first 3 digits (allowed if covering population > 20 000); year-only DOB for ages ≤ 89.

## GDPR (EU)

Pseudonymization per Art.4(5). Hashes preserve enough structure for research linkage without re-identification. IP addresses truncated to /24.

## Custom rule sets

Add a new file (e.g. `pdpa-singapore-rules.ts`) exporting `readonly FieldRule[]`, register in the engine constructor:

```typescript
case 'PDPA_SG': this.rules = PDPA_SG_RULES; break;
```

Then add `'PDPA_SG'` to the `ComplianceProfile` union.

## k-anonymity

Default `k = 5` over `{ageYears, gender, pincode, preferredLocale}`. Override via the `AnonymizationEngine` constructor:

```typescript
new AnonymizationEngine('DPDP', {
  quasiIdentifiers: ['ageYears', 'gender', 'pincode', 'cityName'],
  kThreshold: 10,
});
```

## Audit trail

Every anonymization action is logged to `seeds/audit-logs/anonymization-YYYY-MM-DD.jsonl`. Each entry includes the model, record ID, masked / kept / nullified fields, and any high-confidence PII fields not covered by a rule (signaling rule-set drift).
