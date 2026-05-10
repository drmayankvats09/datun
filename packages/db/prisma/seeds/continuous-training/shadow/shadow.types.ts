export interface ShadowComparison {
  readonly id: string;
  readonly prompt: string;
  readonly productionResponse: string;
  readonly candidateResponse: string;
  readonly productionModel: string;
  readonly candidateModel: string;
  readonly compositeDelta: number;
  readonly safetyDelta: number;
  readonly latencyDelta: number;
  readonly recommendedAction: 'promote-candidate' | 'keep-production' | 'investigate';
  readonly comparedAt: Date;
}
