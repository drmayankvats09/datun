export { PATIENT_CONTRACT } from './patient-contract';
export { CONSULTATION_CONTRACT } from './consultation-contract';
export { validateContract } from './contract-validator';
export type {
  DataContract,
  FieldContract,
  FreshnessContract,
  VolumeContract,
  ContractViolation,
  ContractStatus,
} from './contract.types';

import { PATIENT_CONTRACT } from './patient-contract';
import { CONSULTATION_CONTRACT } from './consultation-contract';
import type { DataContract } from './contract.types';

export const ALL_CONTRACTS: readonly DataContract[] = [
  PATIENT_CONTRACT,
  CONSULTATION_CONTRACT,
] as const;
