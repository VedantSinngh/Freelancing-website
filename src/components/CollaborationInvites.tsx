import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
});

export function CollaborationInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<CollaborationInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchInvites();
      // Poll every 30s as a simple real-time substitute
      const interval = setInterval(fetchInvites, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchInvites = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/collaboration-invites`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch invites');
      const data = await res.json();
      setInvites(data || []);
    } catch (error: any) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (inviteId: string, projectId: string, accept: boolean) => {
    try {
      const res = await fetch(`${API_URL}/collaboration-invites/${inviteId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: accept ? 'accepted' : 'rejected' })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'Failed to update invite');
      }

      toast({
        title: accept ? 'Invitation Accepted' : 'Invitation Declined',
        description: accept
          ? 'Opening project workspace. Sender added as connection!'
          : 'The invitation has been declined.'
      });

      fetchInvites();

      if (accept) {
        setTimeout(() => {
          navigate(`/project/${projectId}`);
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: 'Error handling invite',
        description: error.message,
        variant: 'destructive',
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
