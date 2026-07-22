export interface AgentStep {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail: string;
}

export interface PlatformData {
  name: string;
  competitorCount: number;
  avgPrice: string;
  searchVolume: string;
}

export interface ComplianceResult {
  required: { name: string; period: string; cost: string }[];
  restrictions: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CompetitionResult {
  topPriceRange: string;
  avgRating: number;
  suggestedPrice: string;
  estimatedMargin: string;
  competitionLevel: string;
}

export interface AnalysisReport {
  keyword: string;
  country: string;
  marketData: {
    platforms: PlatformData[];
    summary: string;
  };
  compliance: ComplianceResult;
  competition: CompetitionResult;
  risks: string[];
  score: number;
  summary: string;
}

export interface SearchHistoryItem {
  id: string;
  keyword: string;
  country: string;
  score: number;
  created_at: string;
}
