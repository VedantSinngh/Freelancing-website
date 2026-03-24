import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Scale, CheckCircle } from 'lucide-react';

interface Dispute {
  id: string;
  dispute_type: string;
  description: string;
  status: string;
  created_at: string;
  raised_by: string;
  against_user: string | null;
}

export function DisputeManagement() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
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

  const resolveDispute = async (disputeId: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('disputes')
        .update({
          status,
          resolution_notes: resolutionNotes,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', disputeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Dispute ${status}`
      });

      setSelectedDispute(null);
      setResolutionNotes('');
      fetchDisputes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-warning text-warning-foreground';
      case 'investigating': return 'bg-accent text-accent-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          Dispute Management
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <p>No disputes to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{dispute.dispute_type}</Badge>
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{dispute.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Filed: {new Date(dispute.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedDispute === dispute.id && (dispute.status === 'open' || dispute.status === 'investigating') && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <Textarea
                      placeholder="Add resolution notes..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      {dispute.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveDispute(dispute.id, 'investigating')}
                        >
                          Start Investigation
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => resolveDispute(dispute.id, 'resolved')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveDispute(dispute.id, 'closed')}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}

                {(dispute.status === 'open' || dispute.status === 'investigating') && selectedDispute !== dispute.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDispute(dispute.id)}
                  >
                    Review Dispute
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
