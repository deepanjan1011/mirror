'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MirrorLogo } from '@/components/ui/mirror-logo';

interface SharedData {
    project_name: string;
    project_description: string;
    post_content: string;
    metrics: {
        score?: number;
        fullAttention?: number;
        partialAttention?: number;
        ignored?: number;
        totalPersonas?: number;
    };
    reactions: Array<{
        personaId: number;
        attention: 'full' | 'partial' | 'ignore';
        sentiment: number;
        reason: string;
        comment?: string;
        persona?: { name: string; title?: string; location?: { city?: string } };
    }>;
    impact_score: number;
    created_at: string;
}

export default function SharedSimulationPage() {
    const params = useParams();
    const token = params.token as string;
    const [data, setData] = useState<SharedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchShared() {
            try {
                const res = await fetch(`/api/share/${token}`);
                if (!res.ok) {
                    setError(res.status === 404 ? 'This shared simulation was not found.' : 'Failed to load simulation.');
                    return;
                }
                const json = await res.json();
                setData(json);
            } catch {
                setError('Failed to connect to server.');
            } finally {
                setLoading(false);
            }
        }
        if (token) fetchShared();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
                <div className="flex items-center gap-3">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 bg-white animate-pulse"
                            style={{ animationDelay: `${i * 150}ms` }}
                        />
                    ))}
                    <span className="text-white/60 ml-4 text-sm">Loading simulation...</span>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="text-4xl">⊘</div>
                    <h1 className="text-xl">{error || 'Simulation not found'}</h1>
                    <p className="text-white/40 text-sm">The link may be invalid or expired.</p>
                </div>
            </div>
        );
    }

    const totalReactions = data.reactions?.length || 0;
    const fullCount = data.reactions?.filter(r => r.attention === 'full').length || 0;
    const partialCount = data.reactions?.filter(r => r.attention === 'partial').length || 0;
    const ignoreCount = data.reactions?.filter(r => r.attention === 'ignore').length || 0;
    const fullPercent = totalReactions > 0 ? Math.round((fullCount / totalReactions) * 100) : 0;
    const partialPercent = totalReactions > 0 ? Math.round((partialCount / totalReactions) * 100) : 0;
    const ignorePercent = totalReactions > 0 ? Math.round((ignoreCount / totalReactions) * 100) : 0;

    const statusLabel = data.impact_score <= 20 ? 'CRITICAL' :
        data.impact_score <= 40 ? 'LOW' :
            data.impact_score <= 60 ? 'MODERATE' :
                data.impact_score <= 80 ? 'HIGH' : 'OPTIMAL';

    return (
        <div className="min-h-screen bg-black text-white font-mono">
            {/* Header */}
            <header className="border-b border-white/10 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {/* Brand */}
                        <div className="flex items-center gap-2 border-r border-white/10 pr-6 mr-2">
                            <MirrorLogo className="w-8 h-8" />
                            <span className="text-lg font-mono tracking-tight text-white/90">Mirror</span>
                        </div>

                        {/* Project Details */}
                        <div>
                            <h1 className="text-lg text-white font-medium">{data!.project_name}</h1>
                            {data!.project_description && (
                                <p className="text-xs text-white/50">{data!.project_description}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-xs text-white/30 hidden sm:block">
                        Report Created: {new Date(data!.created_at).toLocaleDateString()}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {/* Idea Text */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-white/15 bg-white/[0.02] p-6"
                >
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Idea Tested</div>
                    <p className="text-white/90 text-sm leading-relaxed">{data!.post_content}</p>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Impact Score */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="border border-white/15 bg-white/[0.02] p-5"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400"></div>
                                <span className="text-xs text-white/60 uppercase tracking-wider">Impact Score</span>
                            </div>
                            <span className="text-xs text-white/40">{statusLabel}</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-3">{data!.impact_score}</div>
                        <div className="flex">
                            {Array.from({ length: 20 }, (_, i) => (
                                <span
                                    key={i}
                                    className={`inline-block w-2 h-3 mr-0.5 ${i < Math.floor(data!.impact_score / 5) ? 'bg-white' : 'bg-white/15'
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between mt-1 text-white/30 text-xs">
                            <span>0</span>
                            <span>100</span>
                        </div>
                    </motion.div>

                    {/* Engagement Breakdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="border border-white/15 bg-white/[0.02] p-5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 bg-blue-400"></div>
                            <span className="text-xs text-white/60 uppercase tracking-wider">Engagement Breakdown</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div>
                                <div className="text-2xl font-bold text-white">{fullCount}</div>
                                <div className="text-xs text-white/50">High</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{partialCount}</div>
                                <div className="text-xs text-white/50">Medium</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{ignoreCount}</div>
                                <div className="text-xs text-white/50">Low</div>
                            </div>
                        </div>

                        {/* Engagement bars */}
                        <div className="space-y-2">
                            {[
                                { label: 'HIGH', percent: fullPercent },
                                { label: 'MEDIUM', percent: partialPercent },
                                { label: 'LOW', percent: ignorePercent },
                            ].map(({ label, percent }) => (
                                <div key={label}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-white/50">{label}</span>
                                        <span className="text-xs text-white/40">{percent}%</span>
                                    </div>
                                    <div className="flex">
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <div
                                                key={i}
                                                className={`w-4 h-2 mr-0.5 ${i < Math.floor(percent / 10) ? 'bg-white' : 'bg-white/10'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Reactions List */}
                {data!.reactions && data!.reactions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="border border-white/15 bg-white/[0.02] p-5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-400"></div>
                                <span className="text-xs text-white/60 uppercase tracking-wider">Reactions</span>
                            </div>
                            <span className="text-xs text-white/30">{totalReactions} responses</span>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto font-sans">
                            {data!.reactions.map((reaction, index) => (
                                <div
                                    key={`${reaction.personaId}-${index}`}
                                    className="border-l-2 border-white/15 pl-3 py-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-white/80">
                                            {reaction.persona?.name || `Persona #${reaction.personaId}`}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-white/30">
                                                {reaction.persona?.location?.city || ''}
                                            </span>
                                            <div
                                                className={`w-2 h-2 ${reaction.attention === 'full'
                                                    ? 'bg-green-400'
                                                    : reaction.attention === 'partial'
                                                        ? 'bg-yellow-400'
                                                        : 'bg-red-400'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                    {reaction.comment && (
                                        <p className="text-xs text-white/50 mt-1 italic leading-relaxed">
                                            &ldquo;{reaction.comment}&rdquo;
                                        </p>
                                    )}
                                    {reaction.reason && (
                                        <p className="text-xs text-white/35 mt-1 leading-relaxed">
                                            {reaction.reason}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 px-6 py-6 mt-12">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/20 text-xs">
                        <MirrorLogo className="w-5 h-5 opacity-50" />
                        <span>Powered by Mirror</span>
                    </div>
                    <p className="text-white/15 text-xs">Read-only simulation report</p>
                </div>
            </footer>
        </div>
    );
}
