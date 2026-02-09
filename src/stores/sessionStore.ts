import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AnalysisSession {
  _id: string;
  projectId: string;
  userId: string;
  sessionName: string;
  prompt: string;
  analysisState: {
    niche: string;
    nicheExtracted: boolean;
    selectedUsers: any[];
    opinions: any[];
    metrics: {
      score: number;
      totalResponses: number;
      fullAttention: number;
      partialAttention: number;
      ignored: number;
      viralCoefficient: number;
      avgSentiment: number;
    };
    globeDots: any[];
    reactions: any[];
    insights: any;
    nicheInfo: any;
    nichePersonaIds?: number[];
  };
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
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

interface SessionStore {
  // Current session state
  currentSession: AnalysisSession | null;

  // Session list for sidebar
  sessions: AnalysisSession[];

  // Loading states
  isLoadingSessions: boolean;
  isLoadingSession: boolean;
  isSaving: boolean;

  // Auto-save state
  autoSaveEnabled: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;

  // Sync state
  syncStatus: 'synced' | 'saving' | 'error';
  error: string | null;

  // Actions
  createSession: (projectId: string, prompt: string, sessionName?: string) => Promise<AnalysisSession>;
  loadSession: (sessionId: string) => Promise<AnalysisSession>;
  updateSession: (updates: Partial<AnalysisSession>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  listSessions: (projectId: string) => Promise<void>;

  // State management
  setCurrentSession: (session: AnalysisSession | null) => void;
  updateCurrentSessionState: (analysisState?: any, uiState?: any) => void;
  setError: (error: string | null) => void;

  // Auto-save functionality
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  autoSaveSession: () => Promise<void>;
  markUnsavedChanges: () => void;
  clearUnsavedChanges: () => void;
}

const useSessionStore = create<SessionStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      sessions: [],
      isLoadingSessions: false,
      isLoadingSession: false,
      isSaving: false,
      autoSaveEnabled: true,
      lastSavedAt: null,
      hasUnsavedChanges: false,
      syncStatus: 'synced',
      error: null,

      setError: (error) => set({ error }),

      // Create new session
      createSession: async (projectId: string, prompt: string, sessionName?: string) => {
        set({ error: null });
        try {
          // Generate session name if not provided
          const finalSessionName = sessionName || prompt.substring(0, 50) || `Session ${new Date().toLocaleString()}`;

          console.log('📝 [CREATE-SESSION] Creating session:', { projectId, prompt: prompt.substring(0, 50), sessionName: finalSessionName });

          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId,
              prompt,
              sessionName: finalSessionName
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create session');
          }

          const data = await response.json();
          const newSession = data.session;

          set(state => ({
            currentSession: newSession,
            sessions: [newSession, ...state.sessions],
            hasUnsavedChanges: false,
            lastSavedAt: new Date(),
            syncStatus: 'synced'
          }));

          return newSession;
        } catch (error: any) {
          console.error('Error creating session:', error);
          set({ error: error.message || 'Failed to create session', syncStatus: 'error' });
          throw error;
        }
      },

      // Load specific session
      loadSession: async (sessionId: string) => {
        set({ isLoadingSession: true, error: null });

        try {
          const response = await fetch(`/api/sessions/${sessionId}`);

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load session');
          }

          const data = await response.json();
          const session = data.session;

          set({
            currentSession: session,
            hasUnsavedChanges: false,
            lastSavedAt: new Date(),
            isLoadingSession: false,
            syncStatus: 'synced'
          });

          return session;
        } catch (error: any) {
          console.error('Error loading session:', error);
          set({ isLoadingSession: false, error: error.message || 'Failed to load session' });
          throw error;
        }
      },

      // Update session
      updateSession: async (updates: Partial<AnalysisSession>) => {
        const { currentSession } = get();
        if (!currentSession) return;

        set({ isSaving: true, syncStatus: 'saving', error: null });

        try {
          const response = await fetch(`/api/sessions/${currentSession._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update session');
          }

          const data = await response.json();
          const updatedSession = data.session;

          set(state => ({
            currentSession: updatedSession,
            sessions: state.sessions.map(s =>
              s._id === updatedSession._id ? updatedSession : s
            ),
            hasUnsavedChanges: false,
            lastSavedAt: new Date(),
            isSaving: false,
            syncStatus: 'synced'
          }));

        } catch (error: any) {
          console.error('Error updating session:', error);
          set({ isSaving: false, syncStatus: 'error', error: error.message || 'Failed to save session' });
          throw error;
        }
      },

      // Delete session
      deleteSession: async (sessionId: string) => {
        set({ error: null });
        try {
          const response = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete session');
          }

          set(state => ({
            sessions: state.sessions.filter(s => s._id !== sessionId),
            currentSession: state.currentSession?._id === sessionId ? null : state.currentSession
          }));

        } catch (error: any) {
          console.error('Error deleting session:', error);
          set({ error: error.message || 'Failed to delete session' });
          throw error;
        }
      },

      // List sessions for project
      listSessions: async (projectId: string) => {
        set({ isLoadingSessions: true, error: null });

        try {
          const response = await fetch(`/api/sessions?projectId=${projectId}`);

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to list sessions');
          }

          const data = await response.json();

          set({
            sessions: data.sessions,
            isLoadingSessions: false
          });

        } catch (error: any) {
          console.error('Error listing sessions:', error);
          set({ isLoadingSessions: false, error: error.message || 'Failed to list sessions' });
          throw error;
        }
      },

      // Set current session
      setCurrentSession: (session: AnalysisSession | null) => {
        set({
          currentSession: session,
          hasUnsavedChanges: false,
          lastSavedAt: session ? new Date() : null
        });
      },

      // Update current session state (for real-time updates)
      updateCurrentSessionState: (analysisState?: any, uiState?: any) => {
        set(state => {
          if (!state.currentSession) return state;

          const updatedSession = {
            ...state.currentSession,
            ...(analysisState && { analysisState: { ...state.currentSession.analysisState, ...analysisState } }),
            ...(uiState && { uiState: { ...state.currentSession.uiState, ...uiState } })
          };

          return {
            currentSession: updatedSession,
            hasUnsavedChanges: true
          };
        });
      },

      // Auto-save controls
      enableAutoSave: () => set({ autoSaveEnabled: true }),
      disableAutoSave: () => set({ autoSaveEnabled: false }),

      // Auto-save session
      autoSaveSession: async () => {
        const { currentSession, hasUnsavedChanges, autoSaveEnabled, isSaving } = get();

        if (!currentSession || !hasUnsavedChanges || !autoSaveEnabled || isSaving) {
          return;
        }

        try {
          await get().updateSession({
            analysisState: currentSession.analysisState,
            uiState: currentSession.uiState
          });
        } catch (error) {
          console.error('Auto-save failed:', error);
          set({ syncStatus: 'error' });
        }
      },

      // Mark unsaved changes
      markUnsavedChanges: () => set({ hasUnsavedChanges: true }),

      // Clear unsaved changes
      clearUnsavedChanges: () => set({ hasUnsavedChanges: false })
    }),
    {
      name: 'session-store'
    }
  )
);

export default useSessionStore;
