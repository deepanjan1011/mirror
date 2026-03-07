"use client";
import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes, type NodeData } from '@/components/flow/IdeaNodes';
import { EvidenceDrawer } from '@/components/flow/EvidenceDrawer';
import { ScoutDrawer, type ScoutResult } from '@/components/flow/ScoutDrawer';
import { getLayoutedElements } from '@/lib/flow/layout';
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { TextAnimate } from "@/components/ui/text-animate";
import { ArrowUpIcon, MapIcon, MessageSquareIcon, SparklesIcon, ChevronRightIcon } from "lucide-react";

interface IdeaResult {
  summary: string;
  segments: Array<{
    name: string;
    why_it_fits: string;
    hooks: string[];
    kpis: string[];
    platform_fit: string[];
  }>;
  features: string[];
  risks: Array<{
    risk: string;
    mitigation: string;
  }>;
  social_fit: Array<{
    platform: string;
    why: string;
  }>;
  improvements_by_segment: Array<{
    segment: string;
    ideas: string[];
  }>;
  followups: string[];
}

type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; result: IdeaResult; savedId?: string };

const IdeaPage = () => {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Map tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'map'>('chat');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScoutDrawerOpen, setIsScoutDrawerOpen] = useState(false);

  const createProjectFromIdea = async (ideaText: string) => {
    setIsCreatingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ideaText.length > 60 ? ideaText.substring(0, 57) + '...' : ideaText,
          description: ideaText
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create project');
      }

      const data = await response.json();
      // Redirect to dashboard with the idea pre-filled
      router.push(`/dashboard?project=${data.project._id}&idea=${encodeURIComponent(ideaText)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setIsCreatingProject(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ideate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: userText }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate concept');
      }

      const data = await response.json();
      if (!data?.result || typeof data.result?.summary !== 'string') {
        setError('Invalid response from server. Please try again.');
        return;
      }
      setMessages((prev) => [...prev, { role: 'assistant', result: data.result as IdeaResult, savedId: data.id }]);
      // Clear map so it’s built on demand for this new idea (Map tab stays fast)
      setNodes([]);
      setEdges([]);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError('Something went wrong. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const latestResult = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant') return m.result;
    }
    return null;
  }, [messages]);

  // Map helpers
  const toggleNodeExpansion = (nodeId: string) => {
    setNodes((nds) => nds.map((n: any) => n.id === nodeId ? { ...n, data: { ...n.data, isExpanded: !n.data?.isExpanded } } : n));
  };

  const handleNodeClick = (nodeData: NodeData) => {
    setSelectedNode(nodeData);
    setIsDrawerOpen(true);
  };

  const generateNodesAndEdges = useCallback((data: IdeaResult) => {
    const newNodes: Node<NodeData>[] = [];
    const newEdges: Edge[] = [];

    newNodes.push({
      id: 'summary',
      type: 'summary',
      position: { x: 0, y: 0 },
      data: {
        label: 'Summary',
        type: 'summary',
        content: data.summary,
        nodeId: 'summary',
        isExpanded: false,
        onToggleExpand: () => toggleNodeExpansion('summary'),
        onClick: () => handleNodeClick({ label: 'Summary', type: 'summary', content: data.summary, nodeId: 'summary' })
      }
    });

    const childNodeTypes = [
      { id: 'segments', type: 'segments', label: 'Target Segments', content: data.segments },
      { id: 'features', type: 'features', label: 'Core Features', content: data.features },
      { id: 'risks', type: 'risks', label: 'Risks & Mitigations', content: data.risks },
      { id: 'social_fit', type: 'social_fit', label: 'Social Platform Fit', content: data.social_fit },
      { id: 'improvements', type: 'improvements', label: 'Improvements', content: data.improvements_by_segment },
      { id: 'followups', type: 'followups', label: 'Follow-up Questions', content: data.followups }
    ] as const;

    childNodeTypes.forEach((nodeType) => {
      newNodes.push({
        id: nodeType.id,
        type: nodeType.type as NodeData['type'],
        position: { x: 0, y: 0 },
        data: {
          label: nodeType.label,
          type: nodeType.type as NodeData['type'],
          content: nodeType.content as any,
          nodeId: nodeType.id,
          isExpanded: false,
          onToggleExpand: () => toggleNodeExpansion(nodeType.id),
          onClick: () => handleNodeClick({ label: nodeType.label, type: nodeType.type as NodeData['type'], content: nodeType.content as any, nodeId: nodeType.id })
        }
      });

      newEdges.push({ id: `summary-${nodeType.id}`, source: 'summary', target: nodeType.id, type: 'smoothstep' });
    });

    return { nodes: newNodes, edges: newEdges };
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const nodesRef = React.useRef<Node[]>([]);
  const edgesRef = React.useRef<Edge[]>([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const layoutFromLatest = useCallback(() => {
    if (!latestResult) return;

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const researchNodes = currentNodes.filter((n) => n.type === 'research');
    const scoutEdges = currentEdges.filter((e) => e.id.startsWith('scout-'));

    // Always rebuild from latestResult to ensure map shows current project/idea data
    const { nodes: baseNodes, edges: baseEdges } = generateNodesAndEdges(latestResult);
    const allNodes = [...baseNodes, ...researchNodes];
    const allEdges = [...baseEdges, ...scoutEdges];

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      allNodes,
      allEdges,
      { direction: 'TB', nodeWidth: 320, nodeHeight: 200, rankSep: 120, nodeSep: 100 }
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [latestResult, generateNodesAndEdges, setNodes, setEdges]);

  const handleAttachToMap = (result: ScoutResult) => {
    const nodeId = `research-${Date.now()}`;
    const edgeId = `scout-${nodeId}`;

    // Find the summary node position to place the new node relative to it
    const summaryNode = nodes.find(n => n.id === 'summary');
    const researchCount = nodes.filter(n => n.type === 'research').length;

    // Position the research node above the summary, offset horizontally for each one
    const baseX = summaryNode ? summaryNode.position.x - 200 : -200;
    const baseY = summaryNode ? summaryNode.position.y - 250 : -250;

    const newNode: Node<NodeData> = {
      id: nodeId,
      type: 'research',
      position: { x: baseX + (researchCount * 350), y: baseY },
      data: {
        label: 'Competitor Research',
        type: 'research',
        content: {
          title: result.title,
          url: result.url,
          preview: result.preview
        },
        nodeId,
        onClick: () => { }
      }
    };

    // Create an edge connecting the research node to the summary
    // Research (source) points TO Summary (target) from above
    const newEdge: Edge = {
      id: edgeId,
      source: nodeId,
      target: 'summary',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#60a5fa', strokeWidth: 2, opacity: 0.6 },
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
    setIsScoutDrawerOpen(false); // Close drawer after attaching
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Map is built only when user clicks "Generate map" on the Map tab (not on Send or tab switch)
  const mapIsBuilt = nodes.length > 0;

  // Ensure map rebuilds when latestResult changes (e.g. new idea generated for different project)
  useEffect(() => {
    if (latestResult && mapIsBuilt && activeTab === 'map') {
      // Auto-rebuild map when latestResult changes and map is already built
      layoutFromLatest();
    }
  }, [latestResult, mapIsBuilt, activeTab, layoutFromLatest]);

  return (
    <div className="min-h-[100dvh] bg-black bg-black relative overflow-hidden font-mono pt-24 pb-8 flex flex-col">
      <main className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col px-4 md:px-8 min-h-0">
        {/* Main Interface Container */}
        <div className="relative flex flex-col flex-1 border border-white/20 bg-black  rounded-none overflow-hidden ">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:px-6 border-b border-white/20 bg-black">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-none border border-white/20 flex items-center bg-black/50 justify-center border border-white/5 ">
                <SparklesIcon className="w-4 h-4 text-white/80" />
              </div>
              <span className="text-white/90 font-medium text-sm tracking-wide">Idea Assistant</span>
            </div>
            {latestResult && (
              <div className="flex gap-1 bg-black/50 p-1 rounded-none border border-white/10">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-none transition-all ${activeTab === 'chat' ? 'bg-white/10 text-white ' : 'text-white/50 hover:text-white/80'}`}
                >
                  <MessageSquareIcon className="w-3.5 h-3.5" />
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-none transition-all ${activeTab === 'map' ? 'bg-white/10 text-white ' : 'text-white/50 hover:text-white/80'}`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  Map
                </button>
              </div>
            )}
          </div>
          {activeTab === 'map' && latestResult && (
            <div className="flex-1 flex flex-col p-4 md:px-6 mt-2 relative">
              <div className="flex items-center justify-between mb-3 z-20 absolute top-6 right-8">
                {mapIsBuilt && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsScoutDrawerOpen(true)}
                      className="px-4 py-1.5 text-xs font-mono bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/30 rounded-full transition-colors "
                    >
                      Scout Market
                    </button>
                    <button
                      onClick={layoutFromLatest}
                      className="px-4 py-1.5 text-xs font-mono bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 rounded-full transition-colors "
                    >
                      Auto Layout
                    </button>
                  </div>
                )}
              </div>
              <div className="w-full min-h-[600px] h-[70vh] border border-white/10 bg-black rounded-none relative overflow-hidden">
                {!mapIsBuilt ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                      <MapIcon className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/70 text-sm font-mono max-w-md">
                      The map is generated on demand. Build the idea map from your last response to explore segments, features, and risks visually.
                    </p>
                    <button
                      onClick={layoutFromLatest}
                      className="mt-2 px-5 py-2.5 text-sm font-mono bg-white text-black hover:bg-white/90 rounded-none transition-all  hover:shadow-white/10"
                    >
                      Generate Map
                    </button>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', minHeight: '600px' }}>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      nodeTypes={nodeTypes}
                      fitView
                      panOnDrag={true}
                      panOnScroll={true}
                      zoomOnScroll={true}
                      attributionPosition="bottom-left"
                    >
                      <Controls
                        className="!bg-black !border-white/20 !rounded-none overflow-hidden [&_button]:!bg-black [&_button]:!border-b-white/20 [&_svg]:!fill-white hover:[&_button]:!bg-white/10"
                      />
                      <MiniMap
                        className="!bg-black !border-white/20 !rounded-none"
                        nodeColor="#9333ea"
                        maskColor="rgba(0,0,0,0.5)"
                      />
                      <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.4)" gap={20} size={2} />
                    </ReactFlow>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex flex-col relative h-full">
              {messages.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pb-16">
                  <div className="w-16 h-16 rounded-none bg-white/5 border border-white/20 flex items-center justify-center mb-6  relative overflow-hidden ">

                    <SparklesIcon className="w-7 h-7 text-white/70 relative z-10" />
                  </div>
                  <TextAnimate
                    animation="fadeIn"
                    by="word"
                    className="text-white/90 font-medium  text-2xl max-w-md mx-auto mb-3"
                  >
                    What are you building?
                  </TextAnimate>
                  <p className="text-white/40 text-sm max-w-sm mt-2  leading-relaxed">
                    Describe your product concept. I'll analyze target segments, core features, and potential risks.
                  </p>
                </div>
              )}

              <AnimatePresence>
                {messages.map((m, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    {m.role === 'user' ? (
                      <div className="max-w-[85%] md:max-w-[70%] bg-white/10  text-white px-5 py-4 text-[15px] rounded-none rounded-none border border-white/10   leading-relaxed">
                        {m.text}
                      </div>
                    ) : !m.result?.summary ? (
                      <div className="max-w-[85%] md:max-w-[70%] border border-red-500/20 bg-red-500/10 rounded-none rounded-none p-4 text-sm text-red-200 ">
                        Analysis couldn't be completed. Please try again.
                      </div>
                    ) : (
                      <div className="max-w-[95%] w-full border border-white/20 bg-black  rounded-none rounded-none p-6 md:p-8 text-[15px] text-white/90 space-y-8 ">
                        {/* AI Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-white/40" />
                            <span className="text-sm font-medium text-white/60 tracking-wide">Analysis Complete</span>
                          </div>
                        </div>

                        {/* Summary Section */}
                        <div className="bg-black border border-white/10 rounded-none p-5">
                          <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Executive Summary</div>
                          <div className="text-white/90 leading-relaxed  text-[15px]">{m.result.summary}</div>
                        </div>

                        {m.result.segments?.length > 0 && (
                          <div className="pt-2">
                            <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-4">Target Segments</div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {m.result.segments.map((s, i) => (
                                <div key={i} className="bg-black border border-white/10 rounded-none p-5 flex flex-col hover:bg-white/10 transition-colors">
                                  <div className="text-white/90 font-medium  mb-2 flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-none border border-white/20 flex items-center bg-black/50 justify-center text-[10px] text-white/60">{i + 1}</div>
                                    {s.name}
                                  </div>
                                  <div className="text-white/60 text-sm  leading-relaxed mb-4 flex-1">{s.why_it_fits}</div>
                                  <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-white/10">
                                    {s.hooks.map((h, hi) => (
                                      <span key={hi} className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/5 border border-white/10 text-white/70">{h}</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                          {m.result.features?.length > 0 && (
                            <div>
                              <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-4">Core Features</div>
                              <ul className="space-y-3">
                                {m.result.features.map((f, fi) => (
                                  <li key={fi} className="text-white/80 text-sm  leading-relaxed flex gap-3 items-start bg-black border border-white/10 rounded-none p-4">
                                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-white/40 mt-2" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {m.result.risks?.length > 0 && (
                            <div>
                              <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-4">Risks & Mitigations</div>
                              <ul className="space-y-3">
                                {m.result.risks.map((r, ri) => (
                                  <li key={ri} className="bg-red-500/[0.03] border border-red-500/[0.1] rounded-none p-4">
                                    <div className="text-white/90 text-sm font-medium mb-2 flex gap-2 items-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-400/50" />
                                      {r.risk}
                                    </div>
                                    <div className="text-white/60 text-sm  leading-relaxed pl-3.5">
                                      {r.mitigation}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {m.result.social_fit?.length > 0 && (
                          <div className="pt-2">
                            <div className="text-white/50 text-[10px] uppercase tracking-widest mb-3 bg-white/10 inline-block px-2 py-0.5">Platform Fit</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {m.result.social_fit.map((sf, sfi) => (
                                <div key={sfi} className="border border-white/20 p-3">
                                  <div className="text-white text-xs font-bold uppercase tracking-widest mb-2 pb-1 border-b border-white/10">{sf.platform}</div>
                                  <div className="text-white/70 text-xs leading-relaxed">{sf.why}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.result.improvements_by_segment?.length > 0 && (
                          <div className="pt-2">
                            <div className="text-white/50 text-[10px] uppercase tracking-widest mb-3 bg-white/10 inline-block px-2 py-0.5">Segment Improvements</div>
                            <div className="space-y-3">
                              {m.result.improvements_by_segment.map((imp, ii) => (
                                <div key={ii} className="border border-white/20 p-4">
                                  <div className="text-white text-xs font-bold uppercase tracking-widest mb-3">{imp.segment}</div>
                                  <ul className="space-y-2">
                                    {imp.ideas.map((idea, idI) => (
                                      <li key={idI} className="text-white/70 text-xs leading-relaxed flex gap-2">
                                        <span className="text-white/40 select-none">›</span> {idea}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.result.followups?.length > 0 && (
                          <div className="pt-2 border-t border-white/10 mt-4">
                            <div className="text-white/50 text-[10px] uppercase tracking-widest my-3 bg-white/10 inline-block px-2 py-0.5">Follow-up Queries</div>
                            <ul className="space-y-2 text-xs text-white/80">
                              {m.result.followups.map((q, qi) => (
                                <li key={qi} className="hover:text-white transition-colors flex gap-2 cursor-text select-all">
                                  <span className="text-white/40 shrink-0 select-none">?</span> {q}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {m.savedId && (
                          <div className="pt-6 mt-4 border-t border-white/20 flex justify-end">
                            <button
                              onClick={() => {
                                const userMsg = messages.find(msg => msg.role === 'user');
                                if (userMsg && userMsg.role === 'user') {
                                  createProjectFromIdea(userMsg.text);
                                }
                              }}
                              disabled={isCreatingProject}
                              className="inline-flex items-center px-5 py-2.5 bg-white text-black text-xs font-bold font-mono uppercase tracking-widest hover:bg-white/80 active:bg-white/60 transition-all disabled:opacity-50"
                            >
                              {isCreatingProject ? 'INITIALIZING...' : 'CREATE_PROJECT'}
                              {!isCreatingProject && <span className="ml-2 font-black">»</span>}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 border border-white/10  px-5 py-4 rounded-none rounded-none text-sm text-white/50 flex items-center gap-4  ">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white/60"></span>
                    </span>
                    Analyzing concept...
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="px-6 py-4 bg-red-500/[0.03] border-y border-red-500/[0.1] text-sm text-red-400  text-center ">
              {error}
            </div>
          )}

          {/* Input Dock */}
          {activeTab === 'chat' && (
            <div className="p-4 md:p-6 border-t border-white/20 bg-black ">
              <form onSubmit={handleSubmit} className="relative flex items-center max-w-3xl mx-auto group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !isLoading) {
                        handleSubmit(e as unknown as React.FormEvent);
                      }
                    }
                  }}
                  placeholder="Describe your product concept..."
                  className="w-full h-14 bg-white/5 border border-white/10 text-white text-[15px] px-6 py-4 pr-16 rounded-none outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all resize-none overflow-hidden placeholder:text-white/20 "
                  disabled={isLoading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 h-10 w-10 flex items-center justify-center bg-white text-black rounded-none hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:active:scale-100 "
                >
                  {isLoading ? (
                    <span
                      className="inline-block"
                      style={{
                        width: '0.875rem',
                        height: '0.875rem',
                        border: '2px solid rgba(0,0,0,0.1)',
                        borderTop: '2px solid black',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                  ) : (
                    <ArrowUpIcon className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Drawers */}
      <EvidenceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedNode={selectedNode}
        productContext={latestResult?.summary}
      />
      <ScoutDrawer
        isOpen={isScoutDrawerOpen}
        onClose={() => setIsScoutDrawerOpen(false)}
        onAttach={handleAttachToMap}
        ideaText={messages.find(m => m.role === 'user')?.text || ''}
      />
    </div>
  );
};

export default IdeaPage;
