import React, { useState, useEffect } from 'react';

export interface ScoutResult {
  id: string | null;
  url: string;
  title: string;
  status: 'scraped' | 'cached' | 'error' | 'discovered';
  preview: string;
  relevanceScore?: number;
}

interface Competitor {
  name: string;
  url: string;
  description: string;
  relevanceScore: number;
}

interface ScoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach?: (result: ScoutResult) => void;
  ideaText?: string;
}

export function ScoutDrawer({ isOpen, onClose, onAttach, ideaText }: ScoutDrawerProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [manualUrls, setManualUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [manualResults, setManualResults] = useState<ScoutResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-discover competitors when drawer opens with an idea
  useEffect(() => {
    if (isOpen && ideaText && !hasSearched && activeTab === 'auto') {
      discoverCompetitors();
    }
  }, [isOpen, ideaText]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setHasSearched(false);
      setCompetitors([]);
      setSummary(null);
      setError(null);
      setManualResults([]);
    }
  }, [isOpen]);

  const discoverCompetitors = async () => {
    if (!ideaText?.trim()) {
      setError('No idea text provided. Please generate an idea first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCompetitors([]);
    setSummary(null);

    try {
      const response = await fetch('/api/scout/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to discover competitors');
      }

      setCompetitors(data.competitors || []);
      setSummary(data.summary || null);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualScout = async () => {
    if (!manualUrls.trim() || isManualLoading) return;

    setIsManualLoading(true);
    setError(null);
    setManualResults([]);

    try {
      const urlList = manualUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const response = await fetch('/api/scout/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scout pages');
      }

      setManualResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsManualLoading(false);
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 70) return '#86efac';
    if (score >= 40) return '#fbbf24';
    return '#9ca3af';
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '460px',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.95)',
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
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          color: 'white',
          margin: 0,
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          🕵️ Scout Market
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
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={() => setActiveTab('auto')}
          style={{
            flex: 1,
            padding: '0.625rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'auto' ? '2px solid white' : '2px solid transparent',
            color: activeTab === 'auto' ? 'white' : 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ⚡ Auto Discover
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            flex: 1,
            padding: '0.625rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'manual' ? '2px solid white' : '2px solid transparent',
            color: activeTab === 'manual' ? 'white' : 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ✏️ Manual URLs
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '0.5rem',
          color: '#fca5a5',
          fontSize: '0.75rem',
          fontFamily: 'monospace'
        }}>
          {error}
        </div>
      )}

      {/* AUTO TAB */}
      {activeTab === 'auto' && (
        <div>
          {/* Loading state */}
          {isLoading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1rem',
              gap: '1rem',
            }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <div style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                textAlign: 'center',
              }}>
                Searching the web for competitors...
              </div>
            </div>
          )}

          {/* Summary */}
          {!isLoading && summary && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '0.75rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '0.5rem',
            }}>
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: 'rgba(147, 197, 253, 0.8)',
                textTransform: 'uppercase',
                marginBottom: '0.375rem',
                letterSpacing: '0.05em',
              }}>
                Market Overview
              </div>
              <p style={{
                color: '#93c5fd',
                fontSize: '0.8rem',
                margin: 0,
                lineHeight: '1.5',
                fontFamily: 'monospace',
              }}>
                {summary}
              </p>
            </div>
          )}

          {/* No results */}
          {!isLoading && hasSearched && competitors.length === 0 && (
            <div style={{
              padding: '2rem 1rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔎</div>
              <div style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                marginBottom: '0.5rem',
              }}>
                No direct competitors found
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
              }}>
                This could mean your idea is unique! Try adding competitors manually.
              </div>
            </div>
          )}

          {/* Competitor cards */}
          {!isLoading && competitors.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {competitors.length} Competitors Found
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {competitors.map((comp, index) => (
                  <div key={index} style={{
                    padding: '0.875rem',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '0.375rem',
                    }}>
                      <h4 style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'white',
                        margin: 0,
                        flex: 1,
                        fontFamily: 'monospace',
                        lineHeight: '1.3',
                      }}>
                        {comp.name}
                      </h4>
                      <span style={{
                        fontSize: '0.65rem',
                        color: getRelevanceColor(comp.relevanceScore),
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                        marginLeft: '0.5rem',
                        flexShrink: 0,
                      }}>
                        {comp.relevanceScore}%
                      </span>
                    </div>

                    <a
                      href={comp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.7rem',
                        color: '#60a5fa',
                        fontFamily: 'monospace',
                        display: 'block',
                        marginBottom: '0.375rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                      }}
                    >
                      {comp.url}
                    </a>

                    <div style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.5)',
                      lineHeight: '1.4',
                      fontFamily: 'monospace',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {comp.description}
                    </div>

                    {onAttach && (
                      <button
                        onClick={() => onAttach({
                          id: `competitor-${index}`,
                          url: comp.url,
                          title: comp.name,
                          status: 'discovered',
                          preview: comp.description,
                          relevanceScore: comp.relevanceScore,
                        })}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '0.25rem',
                          color: '#60a5fa',
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                      >
                        + Attach to Map
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Re-search button */}
          {!isLoading && hasSearched && (
            <button
              onClick={discoverCompetitors}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.625rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.5rem',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
            >
              🔄 Search Again
            </button>
          )}
        </div>
      )}

      {/* MANUAL TAB */}
      {activeTab === 'manual' && (
        <div>
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            borderRadius: '0.5rem'
          }}>
            <p style={{
              color: 'rgba(251, 191, 36, 0.8)',
              fontSize: '0.75rem',
              margin: 0,
              fontFamily: 'monospace',
              lineHeight: '1.5'
            }}>
              Paste competitor URLs (one per line) to scrape and analyze their content.
            </p>
          </div>

          <textarea
            value={manualUrls}
            onChange={(e) => setManualUrls(e.target.value)}
            placeholder={"https://competitor1.com\nhttps://competitor2.com"}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.8rem',
              resize: 'vertical',
              fontFamily: 'monospace',
              marginBottom: '0.75rem',
            }}
            disabled={isManualLoading}
          />

          <button
            onClick={handleManualScout}
            disabled={!manualUrls.trim() || isManualLoading}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              background: isManualLoading || !manualUrls.trim()
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.1)',
              color: isManualLoading || !manualUrls.trim() ? 'rgba(255,255,255,0.3)' : 'white',
              fontWeight: '500',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: isManualLoading || !manualUrls.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              transition: 'all 0.2s',
            }}
          >
            {isManualLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  width: '0.875rem',
                  height: '0.875rem',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Scouting...
              </span>
            ) : (
              '🔍 Scout URLs'
            )}
          </button>

          {/* Manual Results */}
          {manualResults.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {manualResults.length} Results
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {manualResults.map((result, index) => (
                  <div key={index} style={{
                    padding: '0.875rem',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.375rem'
                    }}>
                      <h4 style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'white',
                        margin: 0,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace',
                      }}>
                        {result.title}
                      </h4>
                      <span style={{
                        fontSize: '0.65rem',
                        color: result.status === 'error' ? '#fca5a5' : '#86efac',
                        fontFamily: 'monospace',
                        marginLeft: '0.5rem',
                      }}>
                        {result.status === 'error' ? '❌' : '✅'} {result.status}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.7rem',
                      color: '#60a5fa',
                      fontFamily: 'monospace',
                      marginBottom: '0.375rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {result.url}
                    </div>

                    <div style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.5)',
                      lineHeight: '1.4',
                      fontFamily: 'monospace',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {result.preview}
                    </div>

                    {result.status !== 'error' && onAttach && (
                      <button
                        onClick={() => onAttach(result)}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '0.25rem',
                          color: '#60a5fa',
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                        }}
                      >
                        + Attach to Map
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spin animation keyframes (inline via style tag) */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
