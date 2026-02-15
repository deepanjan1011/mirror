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
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRight: 'none',
      zIndex: 1000,
      padding: '1.5rem',
      overflowY: 'auto',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: 'white',
          margin: 0
        }}>
          Evidence & Details
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '0.25rem',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
        >
          ×
        </button>
      </div>

      {/* Content */}
      {selectedNode ? (
        <div>
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#60a5fa',
              marginBottom: '0.5rem'
            }}>
              Selected Node
            </h3>
            <p style={{
              color: '#d1d5db',
              fontSize: '0.875rem',
              margin: 0
            }}>
              {selectedNode.label}
            </p>
          </div>

          {/* Evidence Search */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#a78bfa',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Search Market Evidence
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Why are we different?"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
              <button
                onClick={runSearch}
                disabled={isSearching || !query.trim()}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: isSearching ? 'linear-gradient(to right, #4b5563, #6b7280)' : 'linear-gradient(to right, #9333ea, #2563eb)',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  minWidth: '100px'
                }}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: '0.75rem', color: '#fca5a5', fontSize: '0.8rem' }}>{error}</div>
            )}
          </div>

          {/* Ranked Results */}
          {results.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#34d399',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Ranked Evidence
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {results.map((r, i) => (
                  <div key={i} style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{r.url}</span>
                      <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>{r.score.toFixed(3)}</span>
                    </div>
                    <div style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: 1.45 }}>{r.snippet}</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        onClick={() => attachChip(r)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '0.25rem',
                          color: '#60a5fa',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Attach to node
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Evidence */}
          {attached.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#60a5fa',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Attached Evidence
                </h4>
                <button
                  onClick={generateInsights}
                  disabled={isGeneratingInsights}
                  style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(96, 165, 250, 0.2)',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    borderRadius: '0.25rem',
                    color: '#60a5fa',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: isGeneratingInsights ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)'}
                >
                  {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {attached.map((a, i) => (
                  <div key={i} style={{
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{a.url}</span>
                      <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>{a.score.toFixed(3)}</span>
                    </div>
                    <div style={{ color: '#d1d5db', fontSize: '0.8rem', lineHeight: 1.45 }}>{a.snippet}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#a78bfa',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Supporting Evidence
            </h4>
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(167, 139, 250, 0.1)',
              border: '1px solid rgba(167, 139, 250, 0.2)',
              borderRadius: '0.5rem',
              color: '#c4b5fd',
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}>
              {insights?.supporting_evidence ? (
                renderMarkdownList(insights.supporting_evidence)
              ) : (
                <span style={{ fontStyle: 'italic', color: '#a78bfa' }}>
                  {attached.length > 0
                    ? "Click 'Generate Insights' above to analyze attached evidence."
                    : "Attach evidence and generate insights to see analysis."}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#34d399',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Related Research
            </h4>
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              borderRadius: '0.5rem',
              color: '#d1fae5',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              {insights?.related_research ? (
                renderMarkdownList(insights.related_research)
              ) : (
                <span style={{ fontStyle: 'italic', color: '#6ee7b7' }}>
                  Click &apos;Generate Insights&apos; above to analyze attached evidence.
                </span>
              )}
            </div>
          </div>

          <div>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#f59e0b',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Action Items
            </h4>
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '0.5rem',
              color: '#fef3c7',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              {insights?.action_items ? (
                renderMarkdownList(insights.action_items)
              ) : (
                <span style={{ fontStyle: 'italic', color: '#fbbf24' }}>
                  Click &apos;Generate Insights&apos; above to analyze attached evidence.
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '0.875rem',
          marginTop: '2rem'
        }}>
          Select a node to view detailed evidence and insights.
        </div>
      )}
    </div>
  );
}
