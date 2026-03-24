import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { Search, Briefcase, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CollaborationInvites } from '@/components/CollaborationInvites';
import { CollaborativeProjects } from '@/components/CollaborativeProjects';
import { AIJobRecommendations } from '@/components/AIJobRecommendations';
import { SkillAnalyticsDashboard } from '@/components/SkillAnalyticsDashboard';

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchProjects: fetchProjectsApi } = useProjects();
  const [projects, setProjects] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [bidData, setBidData] = useState({
    amount: '',
    timeline: '',
    proposal: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchMyBids();
    
    // Bids realtime updates can remain since they still hit supabase right now
    const bidsChannel = supabase
      .channel('bids-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `freelancer_id=eq.${user?.id}` }, () => {
        fetchMyBids();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bidsChannel);
    };
  }, [user]);

  const fetchProjects = async () => {
    try {
      const projectsData = await fetchProjectsApi();
      setProjects(projectsData || []);
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

  const fetchMyBids = async () => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*, projects(title, status, budget)')
        .eq('freelancer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyBids(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('bids')
        .insert([{
          project_id: selectedProject.id,
          freelancer_id: user?.id,
          amount: parseFloat(bidData.amount),
          timeline: bidData.timeline,
          proposal: bidData.proposal
        }]);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Bid submitted successfully'
      });

      setBidDialogOpen(false);
      resetBidForm();
      fetchMyBids();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const withdrawBid = async (bidId: string) => {
    if (!confirm('Are you sure you want to withdraw this bid?')) return;

    try {
      const { error } = await supabase
        .from('bids')
        .update({ status: 'withdrawn' })
        .eq('id', bidId);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Bid withdrawn successfully'
      });
      
      fetchMyBids();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const openBidDialog = (project: any) => {
    setSelectedProject(project);
    setBidDialogOpen(true);
  };

  const resetBidForm = () => {
    setBidData({
      amount: '',
      timeline: '',
      proposal: ''
    });
    setSelectedProject(null);
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { variant: 'secondary', icon: Clock },
      accepted: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle },
      withdrawn: { variant: 'outline', icon: XCircle }
    };
    
    const StatusIcon = config[status]?.icon || Clock;
    
    return (
      <Badge variant={config[status]?.variant || 'secondary'}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const totalEarnings = myBids
    .filter(bid => bid.status === 'accepted')
    .reduce((acc, bid) => acc + parseFloat(bid.amount), 0);

  return (
    <DashboardLayout title="Freelancer Dashboard">
      <div className="space-y-8">
        {/* Collaboration Invites */}
        <CollaborationInvites />

        {/* Collaborative Projects */}
        <CollaborativeProjects />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Bids', value: myBids.filter(b => b.status === 'pending').length, icon: Clock, color: 'text-secondary' },
            { label: 'Accepted', value: myBids.filter(b => b.status === 'accepted').length, icon: CheckCircle, color: 'text-accent' },
            { label: 'Total Earnings', value: `$${totalEarnings.toFixed(2)}`, icon: DollarSign, color: 'text-primary' },
            { label: 'Available Projects', value: projects.length, icon: Briefcase, color: 'text-primary' }
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

        {/* AI Job Recommendations */}
        <AIJobRecommendations />

        {/* Skill Analytics Dashboard */}
        <SkillAnalyticsDashboard />

        {/* My Bids */}
        <Card>
          <CardHeader>
            <CardTitle>My Bids</CardTitle>
            <CardDescription>Track the status of your submitted bids</CardDescription>
          </CardHeader>
          <CardContent>
            {myBids.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No bids yet. Browse projects below and start bidding!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBids.map((bid) => (
                  <motion.div
                    key={bid.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{bid.projects?.title || 'Unknown Project'}</h4>
                          {getStatusBadge(bid.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{bid.proposal}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-primary">Your Bid: ${bid.amount}</span>
                          <span className="text-muted-foreground">Timeline: {bid.timeline}</span>
                          {bid.projects?.budget && <span className="text-muted-foreground">Project Budget: ${bid.projects.budget}</span>}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {bid.status === 'accepted' && bid.projects?.status === 'in_progress' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.location.href = `/project/${bid.project_id}`}
                            className="rounded-full"
                          >
                            Open Workspace
                          </Button>
                        )}
                        {bid.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => withdrawBid(bid.id)}
                            className="rounded-full"
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Available Projects</CardTitle>
                <CardDescription>Browse and bid on open projects</CardDescription>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No projects found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => {
                  const alreadyBid = myBids.some(bid => bid.project_id === (project._id || project.id) && bid.status !== 'withdrawn');
                  
                  return (
                    <motion.div
                      key={project._id || project.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                          <p className="text-muted-foreground text-sm mb-3">{project.description}</p>
                          <div className="flex items-center gap-4 text-sm mb-3">
                            <span className="font-semibold text-primary">${project.budget}</span>
                            {project.deadline && <span className="text-muted-foreground">Due: {new Date(project.deadline).toLocaleDateString()}</span>}
                            <span className="text-muted-foreground">Posted by: {project.profiles?.full_name || 'Unknown'}</span>
                          </div>
                          {project.skills_required && project.skills_required.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {project.skills_required.map((skill: string, idx: number) => (
                                <Badge key={idx} variant="secondary">{skill}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => openBidDialog(project)}
                          disabled={alreadyBid}
                          className="rounded-full ml-4"
                          style={{ background: alreadyBid ? undefined : 'var(--gradient-primary)' }}
                        >
                          {alreadyBid ? 'Already Bid' : 'Place Bid'}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bid Dialog */}
        <Dialog open={bidDialogOpen} onOpenChange={(open) => { setBidDialogOpen(open); if (!open) resetBidForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Your Bid</DialogTitle>
              <DialogDescription>
                Project: {selectedProject?.title}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleBidSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Your Bid Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={bidData.amount}
                  onChange={(e) => setBidData({ ...bidData, amount: e.target.value })}
                  required
                />
                {selectedProject?.budget && (
                  <p className="text-xs text-muted-foreground">Project budget: ${selectedProject.budget}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  value={bidData.timeline}
                  onChange={(e) => setBidData({ ...bidData, timeline: e.target.value })}
                  placeholder="e.g., 2 weeks"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposal">Your Proposal</Label>
                <Textarea
                  id="proposal"
                  value={bidData.proposal}
                  onChange={(e) => setBidData({ ...bidData, proposal: e.target.value })}
                  rows={4}
                  placeholder="Explain why you're the best fit for this project..."
                  required
                />
              </div>

              <Button type="submit" className="w-full" style={{ background: 'var(--gradient-primary)' }}>
                Submit Bid
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
