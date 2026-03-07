import React, { useEffect, useState } from 'react';
import { NodeData } from './IdeaNodes';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: NodeData | null;
  productContext?: string;
}

type EvidenceChip = { snippet: string; url: string; score: number };

export function EvidenceDrawer({ isOpen, onClose, selectedNode, productContext }: EvidenceDrawerProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [results, setResults] = useState<EvidenceChip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<{ related_research: string; action_items: string; supporting_evidence: string } | null>(null);
  const [attached, setAttached] = useState<EvidenceChip[]>([]);

  // Reset when node changes: no memory of past evidence or insights (always dynamic)
  useEffect(() => {
    if (!selectedNode) return;
    setAttached([]);
    setResults([]);
    setInsights(null);
    setQuery('');
    setError(null);
  }, [selectedNode?.nodeId]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
  }, [isOpen]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    setInsights(null);
    try {
      const res = await fetch('/api/scout/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          nodeLabel: selectedNode?.label,
          nodeContent: selectedNode?.content,
          productContext,
          searchOnly: true, // Only fetch evidence; insights are generated only on "Generate Insights"
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      const searchResults = data.results || [];
      setResults(searchResults);
      setAttached([]); // Clear attached on new search; only "Attach to node" from Ranked Evidence adds to Attached
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const generateInsights = async () => {
    if (attached.length === 0) return;
    setIsGeneratingInsights(true);
    setError(null);
    try {
      const res = await fetch('/api/scout/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: selectedNode?.label || query || 'Insights',
          nodeLabel: selectedNode?.label,
          nodeContent: selectedNode?.content,
          productContext,
          evidence: attached, // Use current attached evidence; no search, only generate insights
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Insight generation failed');

      if (data.insights) {
        setInsights(data.insights);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Insight generation failed');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const attachChip = (chip: EvidenceChip) => {
    const exists = attached.find((c) => c.url === chip.url && c.snippet === chip.snippet);
    if (exists) return;
    setAttached((prev) => [...prev, chip].slice(0, 12));
  };

  const renderMarkdownList = (text: string) => {
    if (!text) return null;
    const items = text.split('\n').filter(line => line.trim().length > 0);
    return (
      <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: '0.5rem' }}>
            {item.replace(/^[-*•]\s*/, '')}
          </li>
        ))}
      </ul>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed top-0 right-0 w-[450px] max-w-full h-screen bg-black/80 backdrop-blur-2xl border-l border-white/10 z-[1000] p-6 overflow-y-auto transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 shrink-0">
        <h2 className="text-xl font-medium text-white tracking-tight flex items-center gap-2">
          Evidence & Details
        </h2>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {selectedNode ? (
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-8">
          {/* Selected Node Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 shimmer-border relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider relative z-10">
              Selected Node
            </h3>
            <p className="text-white/90 text-[15px] font-medium relative z-10">
              {selectedNode.label}
            </p>
          </div>

          {/* Evidence Search */}
          <div className="space-y-3">
            <h4 className="text-[13px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500/50"></span>
              Search Market Evidence
            </h4>
            <div className="flex gap-2 relative group focus-within:z-10">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Why are we different?"
                className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all font-mono"
              />
              <button
                onClick={runSearch}
                disabled={isSearching || !query.trim()}
                className="px-5 bg-white text-black hover:bg-zinc-200 rounded-lg text-[14px] font-medium transition-all disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
              >
                {isSearching ? <span className="animate-pulse">...</span> : 'Search'}
              </button>
            </div>
            {error && (
              <div className="text-red-400/90 text-sm mt-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}
          </div>

          {/* Ranked Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[13px] text-emerald-400/80 uppercase tracking-widest font-semibold flex items-center gap-2 border-b border-white/5 pb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>
                Ranked Evidence
              </h4>
              <div className="flex flex-col gap-3">
                {results.map((r, i) => (
                  <div key={i} className="bg-black/40 border border-white/5 hover:border-white/20 transition-colors rounded-xl p-4 group">
                    <div className="flex justify-between items-start mb-3 gap-4">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/80 text-[11px] font-mono break-all truncate transition-colors">
                        {r.url.replace(/^https?:\/\//, '')}
                      </a>
                      <span className="text-emerald-400/60 font-mono text-[11px] bg-emerald-400/10 px-2 py-0.5 rounded-full shrink-0">{(r.score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-white/70 text-[13px] leading-relaxed mb-4 line-clamp-4">{r.snippet}</div>
                    <button
                      onClick={() => attachChip(r)}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 text-[13px] font-medium transition-all active:scale-[0.98]"
                    >
                      + Attach to Node
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Evidence */}
          {attached.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-[13px] text-blue-400/80 uppercase tracking-widest font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500/50"></span>
                  Attached
                </h4>
                <button
                  onClick={generateInsights}
                  disabled={isGeneratingInsights}
                  className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingInsights ? <span className="animate-spin">⟳</span> : '✨'}
                  {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {attached.map((a, i) => (
                  <div key={i} className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 relative group">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <span className="text-white/40 text-[10px] font-mono truncate">{a.url.replace(/^https?:\/\//, '')}</span>
                      <span className="text-blue-400/60 font-mono text-[10px]">{(a.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-white/60 text-xs leading-relaxed line-clamp-3">{a.snippet}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights Sections */}
          {insights && (
            <div className="space-y-6 pt-4 border-t border-white/10">
              <div className="space-y-3">
                <h4 className="text-[13px] text-purple-400/80 uppercase tracking-widest font-semibold flex items-center gap-2">
                  Supporting Evidence
                </h4>
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-5 text-purple-200/80 text-[14px] leading-relaxed prose prose-invert max-w-none prose-ul:my-0 prose-li:my-1">
                  {renderMarkdownList(insights.supporting_evidence)}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[13px] text-emerald-400/80 uppercase tracking-widest font-semibold flex items-center gap-2">
                  Related Research
                </h4>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 text-emerald-200/80 text-[14px] leading-relaxed prose prose-invert max-w-none prose-ul:my-0 prose-li:my-1">
                  {renderMarkdownList(insights.related_research)}
                </div>
              </div>

              <div className="space-y-3 pb-8">
                <h4 className="text-[13px] text-amber-400/80 uppercase tracking-widest font-semibold flex items-center gap-2">
                  Action Items
                </h4>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5 text-amber-200/80 text-[14px] leading-relaxed prose prose-invert max-w-none prose-ul:my-0 prose-li:my-1">
                  {renderMarkdownList(insights.action_items)}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-white/40 text-[15px] max-w-[200px]">Select a node on the map to explore market evidence</p>
        </div>
      )}
    </div>
  );
}
