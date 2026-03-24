import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { Plus, Briefcase, Eye, Trash2, Edit, CheckCircle, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CollaborationInvites } from '@/components/CollaborationInvites';

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchProjects: fetchProjectsApi, createProject, updateProject: updateProjectApi, deleteProject: deleteProjectApi } = useProjects();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [bidsOpen, setBidsOpen] = useState(false);
  const [selectedProjectBids, setSelectedProjectBids] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    skills_required: ''
  });

  useEffect(() => {
    if (user?.id) {
        fetchProjects();
    }
    // Note: Supabase realtime channel removed for MongoDB
  }, [user]);

  const fetchProjects = async () => {
    try {
      const data = await fetchProjectsApi(user?.id);
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const projectData = {
        title: formData.title,
        description: formData.description,
        budget: parseFloat(formData.budget),
        deadline: formData.deadline,
        skills_required: formData.skills_required.split(',').map(s => s.trim())
      };

      if (editingProject) {
        await updateProjectApi(editingProject._id || editingProject.id, projectData);
        toast({
          title: 'Success',
          description: 'Project updated successfully'
        });
      } else {
        await createProject(projectData);
        toast({
          title: 'Success',
          description: 'Project posted successfully'
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProjectApi(id);
      
      toast({
        title: 'Success',
        description: 'Project deleted successfully'
      });
      
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const viewBids = async (projectId: string) => {
    try {
      const { data: bidsData, error } = await supabase
        .from('bids')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data for each bid
      const bidsWithProfiles = await Promise.all(
        (bidsData || []).map(async (bid) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, skills')
            .eq('user_id', bid.freelancer_id)
            .single();
          
          return { ...bid, profiles: profile };
        })
      );

      setSelectedProjectBids(bidsWithProfiles);
      setBidsOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const acceptBid = async (bidId: string, projectId: string) => {
    try {
      // Update bid status
      const { error: bidError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', bidId);

      if (bidError) throw bidError;

      // Update project status
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'in_progress' })
        .eq('id', projectId);

      if (projectError) throw projectError;

      // Reject other bids
      const { error: rejectError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('project_id', projectId)
        .neq('id', bidId);

      if (rejectError) throw rejectError;

      toast({
        title: 'Success',
        description: 'Bid accepted successfully'
      });

      setBidsOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      budget: project.budget.toString(),
      deadline: project.deadline,
      skills_required: project.skills_required?.join(', ') || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      budget: '',
      deadline: '',
      skills_required: ''
    });
    setEditingProject(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      open: 'default',
      in_progress: 'secondary',
      completed: 'default',
      cancelled: 'destructive'
    };
    
    return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <DashboardLayout title="Client Dashboard">
      <div className="space-y-8">
        {/* Collaboration Invites */}
        <CollaborationInvites />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Projects', value: projects.length, icon: Briefcase, color: 'text-primary' },
            { label: 'Active', value: projects.filter(p => p.status === 'in_progress').length, icon: Clock, color: 'text-secondary' },
            { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, icon: CheckCircle, color: 'text-accent' },
            { label: 'Total Bids', value: projects.reduce((acc, p) => acc + (p.bids?.[0]?.count || 0), 0), icon: Users, color: 'text-primary' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-10 h-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Projects</CardTitle>
                <CardDescription>Manage your posted projects and review bids</CardDescription>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="rounded-full" style={{ background: 'var(--gradient-primary)' }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Post Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingProject ? 'Edit Project' : 'Post New Project'}</DialogTitle>
                    <DialogDescription>
                      {editingProject ? 'Update your project details' : 'Create a new project and start receiving bids'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Project Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="budget">Budget ($)</Label>
                        <Input
                          id="budget"
                          type="number"
                          step="0.01"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={formData.deadline}
                          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skills">Required Skills (comma-separated)</Label>
                      <Input
                        id="skills"
                        value={formData.skills_required}
                        onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                        placeholder="React, TypeScript, Design"
                      />
                    </div>

                    <Button type="submit" className="w-full" style={{ background: 'var(--gradient-primary)' }}>
                      {editingProject ? 'Update Project' : 'Post Project'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No projects yet. Post your first project to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <motion.div
                    key={project._id || project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{project.title}</h3>
                          {getStatusBadge(project.status)}
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{project.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-primary">${project.budget}</span>
                          {project.deadline && <span className="text-muted-foreground">Due: {new Date(project.deadline).toLocaleDateString()}</span>}
                          <span className="text-muted-foreground">{project.bids?.[0]?.count || 0} bids</span>
                        </div>
                        {project.skills_required && project.skills_required.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {project.skills_required.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {project.status === 'in_progress' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.location.href = `/project/${project.id}`}
                            className="rounded-full"
                          >
                            Open Workspace
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => viewBids(project.id)}
                          className="rounded-full"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(project)}
                          className="rounded-full"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(project._id || project.id)}
                          className="rounded-full text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bids Dialog */}
        <Dialog open={bidsOpen} onOpenChange={setBidsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Project Bids</DialogTitle>
              <DialogDescription>Review and accept bids from freelancers</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedProjectBids.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bids yet</p>
              ) : (
                selectedProjectBids.map((bid) => (
                  <div key={bid.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{bid.profiles?.full_name || 'Unknown'}</h4>
                          <Badge variant={bid.status === 'accepted' ? 'default' : 'secondary'}>{bid.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{bid.proposal}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-primary">${bid.amount}</span>
                          <span className="text-muted-foreground">Timeline: {bid.timeline}</span>
                        </div>
                        {bid.profiles?.skills && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {bid.profiles.skills.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="outline">{skill}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {bid.status === 'pending' && (
                        <Button
                          onClick={() => acceptBid(bid.id, bid.project_id)}
                          className="rounded-full"
                          style={{ background: 'var(--gradient-primary)' }}
                        >
                          Accept Bid
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
