"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, FolderOpen, Calendar, Activity, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  simulationCount: number;
  lastSimulation?: string;
}

const getProjectProgress = (simulationCount: number) => {
  if (simulationCount === 0) {
    // Phase 1: Idea Phase
    return {
      phase: 1,
      percentage: 15, // Base progress for Idea
      bars: 6, // 15% of 40 bars = 6
    };
  } else if (simulationCount < 5) {
    // Phase 2: Project Phase (1 to 4 simulations)
    // Percentage scales with simulations from 44% to 71%
    const percentage = 35 + (simulationCount / 5) * 45;
    return {
      phase: 2,
      percentage: Math.floor(percentage),
      bars: Math.floor((percentage / 100) * 40),
    };
  } else {
    // Phase 3: Global Deploy (5 or more simulations)
    // Caps at 100%
    const percentage = Math.min(100, 85 + (simulationCount - 5) * 5);
    return {
      phase: 3,
      percentage: Math.floor(percentage),
      bars: Math.floor((percentage / 100) * 40),
    };
  }
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUser(user);
      fetchProjects();
    };

    checkUser();
  }, [router, supabase]);

  const fetchProjects = async () => {
    try {
      // Cookies are sent automatically
      const response = await fetch("/api/projects", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      } else {
        console.error("Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProjects([data.project, ...projects]);
        setNewProjectName("");
        setNewProjectDescription("");
        setShowCreateDialog(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to create project: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error creating project");
    } finally {
      setIsCreating(false);
    }
  };

  const openProject = (projectId: string) => {
    router.push(`/dashboard?project=${projectId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent card click
    setProjectToDelete(project);
    setShowDeleteDialog(true);
  };

  const deleteProject = async () => {
    if (!projectToDelete) return;

    setDeletingProjectId(projectToDelete._id);
    try {
      const response = await fetch(`/api/projects/${projectToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove project from state
        setProjects(projects.filter(p => p._id !== projectToDelete._id));
        setShowDeleteDialog(false);
        setProjectToDelete(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to delete project: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project');
    } finally {
      setDeletingProjectId(null);
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white font-mono">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20">
      {/* Header removed - using global Navbar */}

      {/* Main Content */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-mono text-white mb-2">
              Welcome {user?.user_metadata?.custom_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email},
            </h2>
            <p className="text-sm font-mono text-white/60">
              Manage your AI simulation projects and view insights
            </p>
          </div>

          <Button
            onClick={() => setShowCreateDialog(true)}
            className="font-mono bg-white text-black hover:bg-white/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="bg-black border-white/20 text-white">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  Create New Project
                </DialogTitle>
                <DialogDescription className="font-mono text-white/60">
                  Start a new AI simulation project to test your ideas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="font-mono">
                    Project Name
                  </Label>
                  <Input
                    id="name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="mt-1 bg-white/5 border-white/20 text-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="font-mono">
                    Description (Optional)
                  </Label>
                  <Input
                    id="description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Brief description of your project"
                    className="mt-1 bg-white/5 border-white/20 text-white font-mono"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={createProject}
                    disabled={isCreating || !newProjectName.trim()}
                    className="flex-1 font-mono bg-white text-black hover:bg-white/90"
                  >
                    {isCreating ? "Creating..." : "Create Project"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    className="font-mono border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="bg-black border-white/20 text-white">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  Delete Project
                </DialogTitle>
                <DialogDescription className="font-mono text-white/60">
                  Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone and will delete all associated simulations.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={deleteProject}
                  disabled={deletingProjectId !== null}
                  className="flex-1 font-mono bg-red-600 text-white hover:bg-red-700"
                >
                  {deletingProjectId ? "Deleting..." : "Delete Project"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setProjectToDelete(null);
                  }}
                  disabled={deletingProjectId !== null}
                  className="font-mono border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 mx-auto text-white/30 mb-4" />
            <h3 className="text-lg font-mono text-white/80 mb-2">
              No projects yet
            </h3>
            <p className="text-sm font-mono text-white/60 mb-6">
              Create your first project to start running AI simulations
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="font-mono bg-white text-black hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => {
              const progress = getProjectProgress(project.simulationCount);
              return (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card
                    className="bg-black/40 border-white/20 hover:text-white hover:border-white/40 transition-all cursor-pointer group h-full flex flex-col"
                    onClick={() => openProject(project._id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="px-2 py-1 bg-white/10 border border-white/20 text-xs font-mono text-white/80">
                              simulation
                            </div>
                            <div className="px-2 py-1 bg-white/10 border border-white/20 text-xs font-mono text-white/80">
                              ai-powered
                            </div>
                          </div>
                          <CardTitle className="font-mono text-white transition-colors mb-2">
                            {project.name}
                          </CardTitle>
                          {project.description && (
                            <CardDescription className="font-mono text-white/60 text-sm">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-mono text-white/40">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(project.createdAt)}
                          </div>
                          <button
                            onClick={(e) => handleDeleteClick(e, project)}
                            disabled={deletingProjectId === project._id}
                            className="text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete project"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="space-y-4 flex-1">
                        {/* Metrics Section */}
                        <div className="space-y-3">
                          <div className="text-sm font-mono text-white/80">
                            You are on track to reach engagement goals.
                          </div>

                          {/* Success Rate */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-mono text-white">
                                {progress.percentage}%
                              </span>
                              <div className="flex items-center gap-1 px-2 py-1 bg-white/10 border border-white/20 text-xs font-mono text-white/80">
                                Phase {progress.phase}
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex gap-0.5">
                                {Array.from({ length: 40 }, (_, i) => {
                                  const isActive = i < progress.bars;
                                  return (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, scaleY: 0 }}
                                      animate={{ opacity: 1, scaleY: 1 }}
                                      transition={{
                                        duration: 0.3,
                                        delay: index * 0.1 + i * 0.02,
                                      }}
                                      className={`h-6 w-2 ${isActive
                                        ? "bg-white border border-white/30"
                                        : "bg-white/10 border border-white/20"
                                        }`}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between text-xs font-mono border-t border-white/10 pt-3 mt-auto">
                          <div className="flex items-center gap-2 text-white/60">
                            <Activity className="w-3 h-3" />
                            <span>{project.simulationCount} simulations</span>
                          </div>
                          {project.lastSimulation && (
                            <div className="text-white/50">
                              Last: {formatDate(project.lastSimulation)}
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full font-mono text-black hover:text-white hover:bg-white/10 bg-white/90 group-hover:bg-white/5"
                          >
                            Open Project →
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            }
            )}
          </div>
        )}
      </main>
    </div>
  );
}
