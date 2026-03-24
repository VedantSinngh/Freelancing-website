import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Upload, CheckCircle, FileText, ArrowLeft, UserPlus, Users, LogOut, Bell } from 'lucide-react';
import { CollaborationWorkspace } from '@/components/CollaborationWorkspace';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      
      // Real-time subscriptions
      const messagesChannel = supabase
        .channel('messages-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` }, () => {
          fetchMessages();
        })
        .subscribe();

      const milestonesChannel = supabase
        .channel('milestones-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `project_id=eq.${projectId}` }, () => {
          fetchMilestones();
        })
        .subscribe();

      const collaboratorsChannel = supabase
        .channel('collaborators-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_collaborators', filter: `project_id=eq.${projectId}` }, () => {
          fetchCollaborators();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(milestonesChannel);
        supabase.removeChannel(collaboratorsChannel);
      };
    }
  }, [projectId]);

  useEffect(() => {
    if (messages.length > lastMessageCount && lastMessageCount > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.sender_id !== user?.id) {
        toast({
          title: '💬 New Message',
          description: `${latestMessage.sender_name}: ${latestMessage.content.substring(0, 50)}${latestMessage.content.length > 50 ? '...' : ''}`,
        });
      }
    }
    setLastMessageCount(messages.length);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProjectData = async () => {
    await Promise.all([
      fetchProject(),
      fetchMessages(),
      fetchMilestones(),
      fetchFiles(),
      fetchCollaborators()
    ]);
  };

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      navigate(-1);
    } else {
      setProject(data);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (!error) {
      const messagesWithProfiles = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', msg.sender_id)
            .maybeSingle();
          return { ...msg, sender_name: profile?.full_name || 'Unknown' };
        })
      );
      setMessages(messagesWithProfiles);
    }
  };

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    setMilestones(data || []);
  };

  const fetchFiles = async () => {
    const { data } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (data) {
      const filesWithProfiles = await Promise.all(
        data.map(async (file) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', file.uploader_id)
            .maybeSingle();
          return { ...file, uploader_name: profile?.full_name || 'Unknown' };
        })
      );
      setFiles(filesWithProfiles);
    }
  };

  const fetchCollaborators = async () => {
    const { data } = await supabase
      .from('project_collaborators')
      .select('*')
      .eq('project_id', projectId);

    if (data) {
      const collaboratorsWithProfiles = await Promise.all(
        data.map(async (collab) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', collab.user_id)
            .maybeSingle();
          return { 
            ...collab, 
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url 
          };
        })
      );
      setCollaborators(collaboratorsWithProfiles);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert([{ project_id: projectId, sender_id: user?.id, content: newMessage }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewMessage('');
      fetchMessages();
    }
  };

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.title.trim()) return;

    const { error } = await supabase
      .from('milestones')
      .insert([{ ...newMilestone, project_id: projectId }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Milestone added' });
      setNewMilestone({ title: '', description: '' });
      fetchMilestones();
    }
  };

  const toggleMilestone = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('milestones')
      .update({ completed: !completed })
      .eq('id', id);

    if (!error) fetchMilestones();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Simulate file upload (in real app, upload to storage bucket)
    const { error } = await supabase
      .from('files')
      .insert([{
        project_id: projectId,
        uploader_id: user?.id,
        file_name: file.name,
        file_url: `https://example.com/${file.name}`,
        file_size: file.size
      }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'File uploaded' });
      fetchFiles();
    }
    
    setUploading(false);
  };

  const handleInviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      // Create collaboration invite
      const { error } = await supabase
        .from('collaboration_invites')
        .insert([{
          project_id: projectId,
          sender_id: user?.id,
          receiver_email: inviteEmail.toLowerCase(),
          message: `You've been invited to collaborate on: ${project.title}`,
          status: 'pending'
        }]);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Info', description: 'Invitation already sent', variant: 'default' });
        } else {
          throw error;
        }
      } else {
        toast({ 
          title: 'Success', 
          description: 'Collaboration invite sent! The user will receive a notification.' 
        });
        setInviteEmail('');
        setInviteDialogOpen(false);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleLeaveWorkspace = async () => {
    const { error } = await supabase
      .from('project_collaborators')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user?.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Left workspace' });
      navigate(-1);
    }
  };

  const completedMilestones = milestones.filter(m => m.completed).length;
  const progress = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

  if (!project) {
    return (
      <DashboardLayout title="Project Workspace">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const isProjectOwner = project?.client_id === user?.id;
  const isAcceptedFreelancer = true; // Simplified - should check bids table

  return (
    <DashboardLayout title={project.title}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header with Actions */}
        <Card className="border-primary/20 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold truncate">{project.title}</h1>
                  <Badge variant={project.status === 'in_progress' ? 'default' : 'secondary'}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2">{project.description}</p>
              </div>
            </div>

            {/* Collaborators Bar */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div className="flex -space-x-2">
                  <AnimatePresence>
                    {collaborators.slice(0, 5).map((collab, idx) => (
                      <motion.div
                        key={collab.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Avatar className="border-2 border-background">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {collab.full_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {collaborators.length > 5 && (
                    <Avatar className="border-2 border-background">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        +{collaborators.length - 5}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {collaborators.length} {collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                </span>
              </div>

              <div className="flex gap-2">
                {(isProjectOwner || isAcceptedFreelancer) && (
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Collaborator</DialogTitle>
                        <DialogDescription>
                          Enter the name or email of the user you want to invite to this project.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleInviteCollaborator} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@example.com"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            The user will receive an invitation they can accept or decline.
                          </p>
                        </div>
                        <Button type="submit" className="w-full">
                          Send Invitation
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
                
                {!isProjectOwner && (
                  <Button variant="outline" size="sm" onClick={handleLeaveWorkspace} className="gap-2 text-destructive hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                    Leave
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Project Progress
              </CardTitle>
              <CardDescription>
                {completedMilestones} of {milestones.length} milestones completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2 text-right">{Math.round(progress)}% Complete</p>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="milestones">
              <CheckCircle className="w-4 w-4 mr-2" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="files">
              <FileText className="w-4 h-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="workspace">
              <Users className="w-4 h-4 mr-2" />
              Workspace
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Project Chat
                      </CardTitle>
                      <CardDescription>Communicate with your team in real-time</CardDescription>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Bell className="h-3 w-3" />
                      Live
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-96 overflow-y-auto space-y-3 p-4 bg-gradient-to-b from-muted/30 to-muted/10 rounded-xl border border-border/50">
                    <AnimatePresence mode="popLayout">
                      {messages.map((msg, idx) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 20, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            delay: idx * 0.02
                          }}
                          className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${
                            msg.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground shadow-primary/20'
                              : 'bg-card border border-border shadow-card'
                          }`}>
                            <p className="text-xs font-semibold mb-1 opacity-90">{msg.sender_name}</p>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border-primary/30 focus-visible:ring-primary"
                    />
                    <Button type="submit" size="icon" className="rounded-full" style={{ background: 'var(--gradient-primary)' }}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Project Milestones</CardTitle>
                <CardDescription>Track project progress with milestones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={addMilestone} className="space-y-3 p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20">
                  <div className="space-y-2">
                    <Label>Milestone Title</Label>
                    <Input
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      placeholder="Enter milestone title"
                      className="border-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                      placeholder="Enter description"
                      rows={2}
                      className="border-primary/30"
                    />
                  </div>
                  <Button type="submit" className="w-full" style={{ background: 'var(--gradient-primary)' }}>
                    Add Milestone
                  </Button>
                </form>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {milestones.map((milestone, idx) => (
                      <motion.div
                        key={milestone.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              milestone.completed
                                ? 'bg-primary border-primary shadow-md shadow-primary/30'
                                : 'border-border hover:border-primary'
                            }`}
                          >
                            {milestone.completed && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring" }}
                              >
                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                              </motion.div>
                            )}
                          </motion.button>
                          <div className="flex-1">
                            <h4 className={`font-semibold transition-all ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {milestone.title}
                            </h4>
                            {milestone.description && (
                              <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Project Files</CardTitle>
                <CardDescription>Share and manage project files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-primary mx-auto mb-3" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, ZIP up to 10MB</p>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </motion.div>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {files.map((file, idx) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg transition-all bg-card"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{file.file_name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Uploaded by {file.uploader_name} • {(file.file_size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground">
                            Download
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          {/* Workspace Tab */}
          <TabsContent value="workspace">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CollaborationWorkspace projectId={projectId!} />
            </motion.div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Budget</Label>
                    <p className="text-2xl font-bold text-primary">${project.budget}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Deadline</Label>
                    <p className="text-lg font-semibold">
                      {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
                {project.skills_required && project.skills_required.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Required Skills</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {project.skills_required.map((skill: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}
