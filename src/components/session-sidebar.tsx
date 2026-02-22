"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useSessionStore from '@/stores/sessionStore';
import { MirrorLogo } from "@/components/ui/mirror-logo";
import Link from 'next/link';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Clock,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Save,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface SessionSidebarProps {
  projectId: string;
  isSimulating?: boolean;
  selectedUsersCount?: number;
  allUsersCount?: number;
  currentPost?: string;
  onSessionSelect?: (sessionId: string) => void;
}

export function SessionSidebar({
  projectId,
  isSimulating = false,
  selectedUsersCount = 0,
  allUsersCount = 0,
  currentPost = '',
  onSessionSelect
}: SessionSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    sessions,
    currentSession,
    isLoadingSessions,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    listSessions,
    loadSession,
    deleteSession,
    createSession
  } = useSessionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    if (projectId) {
      listSessions(projectId);
    }
  }, [projectId, listSessions]);

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session =>
    session.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSessionClick = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      onSessionSelect?.(sessionId);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleNewSession = async () => {
    try {
      const newSession = await createSession(
        projectId,
        'Describe what you want to analyze...',
        `New Session - ${new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`
      );
      onSessionSelect?.(newSession._id);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSessionPreview = (session: any) => {
    const prompt = session.prompt;
    return prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
  };

  const getSessionMetrics = (session: any) => {
    const metrics = session.analysisState?.metrics;
    if (!metrics || metrics.totalResponses === 0) return null;

    return {
      score: Math.round(metrics.score),
      responses: metrics.totalResponses,
      engagement: Math.round(metrics.viralCoefficient * 100)
    };
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-black border-r border-white/10 flex flex-col items-center py-4 h-full shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="mb-4 text-white/60 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewSession}
          className="mb-2 text-white/60 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex flex-col items-center space-y-2 overflow-y-auto">
          {sessions.slice(0, 5).map((session) => (
            <Button
              key={session._id}
              variant={currentSession?._id === session._id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSessionClick(session._id)}
              className={`w-10 h-10 p-0 ${currentSession?._id === session._id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          ))}
        </div>

        {hasUnsavedChanges && (
          <div className="mt-2 text-amber-400">
            <AlertCircle className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-72 bg-black border-r border-white/10 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex flex-col gap-4">

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Link href="/projects" className="flex items-center gap-2" aria-label="Go to Projects">
            <div className="w-8 h-8">
              <MirrorLogo />
            </div>
            <span className="text-white font-mono text-lg">Mirror</span>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/projects'}
          className="font-mono text-white/80 hover:text-white hover:bg-white/10 justify-start w-full"
        >
          ← Projects View
        </Button>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Analysis Sessions</h2>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <div className="flex items-center text-amber-400 text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Unsaved
              </div>
            )}
            {isSaving && (
              <div className="flex items-center text-blue-400 text-xs">
                <Save className="h-3 w-3 mr-1 animate-spin" />
                Saving...
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Session Button */}
        <Button
          onClick={handleNewSession}
          className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/20"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Analysis
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent text-white border border-white/20 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/40 font-mono"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoadingSessions ? (
          <div className="p-4 text-center text-white/50 font-mono text-xs">
            <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-white/80 rounded-full mx-auto mb-2"></div>
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-white/40 font-mono text-xs">
            {searchQuery ? 'No sessions match your search' : 'No sessions yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredSessions.map((session) => {
              const metrics = getSessionMetrics(session);
              const isActive = currentSession?._id === session._id;

              return (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group"
                >
                  <Card
                    className={`p-3 cursor-pointer transition-all border ${isActive
                      ? 'bg-white/10 border-white/30 shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-white/5'
                      }`}
                    onClick={() => handleSessionClick(session._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-8">
                        <h3 className={`font-mono text-sm truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                          {session.sessionName}
                        </h3>
                        <p className={`text-xs mt-1 line-clamp-2 font-mono leading-relaxed ${isActive ? 'text-white/70' : 'text-white/50'}`}>
                          {getSessionPreview(session)}
                        </p>

                        {/* Metrics */}
                        {metrics && (
                          <div className="flex items-center space-x-2 mt-3 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-mono">
                              Score: {metrics.score}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/70 border border-white/20 rounded font-mono">
                              {metrics.responses} responses
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                          <div className="flex items-center text-[10px] text-white/40 font-mono">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimeAgo(session.lastAccessedAt || session.updatedAt || session.createdAt)}
                          </div>

                          {session.uiState?.simulationType && (
                            <span className="text-[9px] text-white/40 uppercase tracking-wide border border-white/10 px-1.5 py-0.5 rounded">
                              {session.uiState.simulationType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 ${isActive ? 'opacity-100' : ''}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(session._id);
                          }}
                          className="h-6 w-6 p-0 text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Status and Metrics */}
      <div className="p-4 border-t border-white/10 text-xs text-white/60 font-mono space-y-2">
        <div className="flex justify-between items-center text-[10px] text-white/50">
          <span>{selectedUsersCount > 0 ? `${selectedUsersCount} active users` : `${allUsersCount} global users`}</span>
        </div>
        <div className="truncate text-[10px] text-white/50 mb-1">
          {currentPost ? `Analysis: ${currentPost}` : 'Ready to analyze'}
        </div>
        {lastSavedAt && (
          <div className="pt-2 flex justify-between items-center text-[10px] text-white/40">
            <span>Last saved: {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <HelpCircle className="h-3.5 w-3.5 text-white/30 hover:text-white/60 cursor-pointer" />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-lg font-mono font-medium">Delete Session</h3>
              </div>
              <p className="text-white/60 text-sm mb-6 font-mono leading-relaxed">
                Are you sure you want to delete this analysis session? This action cannot be undone and will erase all generated feedback.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-transparent border-white/20 text-white/80 hover:bg-white/5 hover:text-white font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteSession(showDeleteConfirm)}
                  className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:text-red-300 font-mono text-xs"
                >
                  Delete Permanently
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
