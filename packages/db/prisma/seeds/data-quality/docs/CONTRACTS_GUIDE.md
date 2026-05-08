# Authoring a Data Contract

When a new consumer (admin UI, fine-tune pipeline, BI dashboard) starts reading a table, lock down the contract.

## Steps

1. Add a `*-contract.ts` file in `data-quality/contracts/` exporting a `DataContract`.
2. Append to `ALL_CONTRACTS` in `index.ts`.
3. Mirror critical rules in a `checks-*.yml` for Soda Core.
4. If the rule is too clinical for SQL/YAML, add a custom Expectation.
5. Bump `version`. Mark old as `deprecated`. Notify consumers via release notes.

## Versioning

Use semver. Major bump for breaking changes (column removal, narrowed enum). Minor for additions. Patch for descriptive updates.

## PII classification

| piiClass | Example field     | Treatment                                 |
| -------- | ----------------- | ----------------------------------------- |
| critical | aadhaar           | Encrypted column + masked in all profiles |
| high     | fullName, address | Masked in DPDP/HIPAA/GDPR                 |
| medium   | ageYears, gender  | Generalized for k-anonymity               |
| low      | preferredLocale   | Kept                                      |
| none     | id, createdAt     | Kept                                      |
