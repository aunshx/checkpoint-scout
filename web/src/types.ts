export interface Funnel {
  raw_candidates: number;
  classified: number;
  qualified: number;
  artifacts_generated: number;
}

export interface Classification {
  rationale: string;
  entire_relevance: string;
}

export interface Artifacts {
  comment: string;
  outreach: string;
  case_study: string;
}

export interface PainMoment {
  id: string;
  rank: number;
  repo: string;
  pain_type: string;
  score: number;
  signal: string;
  url: string;
  artifacts: Artifacts;
  classification: Classification;
}

export interface DashboardData {
  run_timestamp: string;
  funnel: Funnel;
  pain_moments: PainMoment[];
}
