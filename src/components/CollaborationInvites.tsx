import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Check, X, Clock } from 'lucide-react';

interface CollaborationInvite {
  id: string;
  project_id: string;
  sender_id: string;
  receiver_email: string;
  message: string | null;
  status: string;
  created_at: string;
  project_title?: string;
  sender_name?: string;
}

export function CollaborationInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<CollaborationInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchInvites();
      
      // Real-time subscription
      const channel = supabase
        .channel('collaboration-invites')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'collaboration_invites',
          filter: `receiver_email=eq.${user.email.toLowerCase()}`
        }, () => {
          fetchInvites();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchInvites = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('collaboration_invites')
        .select('*')
        .eq('receiver_email', user.email.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch project titles and sender names
      const enrichedInvites = await Promise.all(
        (data || []).map(async (invite) => {
          const [projectData, senderData] = await Promise.all([
            supabase.from('projects').select('title').eq('id', invite.project_id).single(),
            supabase.from('profiles').select('full_name').eq('user_id', invite.sender_id).single()
          ]);

          return {
            ...invite,
            project_title: projectData.data?.title || 'Unknown Project',
            sender_name: senderData.data?.full_name || 'Unknown User'
          };
        })
      );

      setInvites(enrichedInvites);
    } catch (error: any) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (inviteId: string, projectId: string, accept: boolean) => {
    try {
      const invite = invites.find(i => i.id === inviteId);
      
      if (accept && invite) {
        // Try to add as collaborator, ignore if already exists
        const { error: collaboratorError } = await supabase
          .from('project_collaborators')
          .insert([{
            project_id: projectId,
            user_id: user?.id,
            invited_by: invite.sender_id,
            role: 'member'
          }]);

        // Ignore duplicate key errors (user already a collaborator)
        if (collaboratorError && collaboratorError.code !== '23505') {
          throw collaboratorError;
        }

        // Add sender as a friend/connection
        const { data: existingFriendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(user_id_1.eq.${user?.id},user_id_2.eq.${invite.sender_id}),and(user_id_1.eq.${invite.sender_id},user_id_2.eq.${user?.id})`)
          .maybeSingle();

        if (!existingFriendship) {
          await supabase
            .from('friendships')
            .insert([{
              user_id_1: user?.id,
              user_id_2: invite.sender_id
            }]);
        }
      }

      // Update invite status
      const { error: updateError } = await supabase
        .from('collaboration_invites')
        .update({ 
          status: accept ? 'accepted' : 'rejected',
          receiver_id: user?.id 
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      toast({
        title: accept ? 'Invitation Accepted' : 'Invitation Declined',
        description: accept 
          ? 'Opening project workspace. Sender added as connection!' 
          : 'The invitation has been declined.'
      });

      fetchInvites();
      
      // Navigate to project workspace after accepting
      if (accept) {
        setTimeout(() => {
          navigate(`/project/${projectId}`);
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const pendingInvites = invites.filter(i => i.status === 'pending');

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingInvites.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Collaboration Invitations
          <Badge variant="secondary">{pendingInvites.length}</Badge>
        </CardTitle>
        <CardDescription>You have pending collaboration requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingInvites.map((invite, idx) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="border border-border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-transparent"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg mb-1 truncate">{invite.project_title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">{invite.sender_name}</span> invited you to collaborate
                  </p>
                  {invite.message && (
                    <p className="text-sm text-muted-foreground italic mb-3">"{invite.message}"</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(invite.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleInvite(invite.id, invite.project_id, true)}
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInvite(invite.id, invite.project_id, false)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
