export interface IReaction {
  personaId: number;
  attention: 'full' | 'partial' | 'ignore';
  reason: string;
  comment?: string;
  sentiment: number; // 0-1
  timestamp: Date;
}

export interface ISimulation {
  userId: string; // Auth0 ID
  projectId?: any;
  postContent: string;
  platform?: string; // Platform type (linkedin, twitter, etc.)
  postAnalysis: {
    category: string;
    targetAudience: string[];
    valueProps: string[];
    tone: string;
    concerns?: string[];
  };
  reactions: IReaction[];
  metrics: {
    score: number;
    fullAttention: number;
    partialAttention: number;
    ignored: number;
    viralCoefficient: number;
    avgSentiment: number;
    totalResponses: number;
  };
  insights?: {
    topEngagementReasons: string[];
    topIgnoreReasons: string[];
    demographicBreakdown: Record<string, any>;
    industryBreakdown: Record<string, any>;
    recommendations: string[];
    viralPotentialScore: number;
    unexpectedAudiences: string[];
  };
  cost: {
    cohere: number;
    martian: number;
    cerebras: number;
    total: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}
