export interface IAnalysisSession {
  projectId: any;
  userId: string; // Auth0 ID
  sessionName: string; // Auto-generated or user-provided
  prompt: string;

  // Analysis state
  analysisState: {
    niche: string;
    nicheExtracted: boolean;
    selectedUsers: any[]; // Store the selected personas
    opinions: any[]; // Store generated opinions
    metrics: {
      score: number;
      totalResponses: number;
      fullAttention: number;
      partialAttention: number;
      ignored: number;
      viralCoefficient: number;
      avgSentiment: number;
    };
    globeDots: any[]; // Store globe visualization data
    reactions: any[]; // Store all reactions
    insights: any; // Store generated insights
    nicheInfo: any; // Store niche information
  };

  // UI state
  uiState: {
    viewMode: 'niche' | 'global';
    selectedPersonaId?: number;
    expandedNodes?: string[];
    activeTab?: string;
    simulationType?: string;
    currentSociety?: string;
    processedPersonas?: number;
    currentProcessingStep?: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}
