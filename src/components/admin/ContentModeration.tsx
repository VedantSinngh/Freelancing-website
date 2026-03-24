import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  reported_by: string;
  reason: string;
  status: string;
  created_at: string;
}

export function ContentModeration() {
  const { toast } = useToast();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModerationItems();
  }, []);

  const fetchModerationItems = async () => {
    try {
      const { data, error } = await supabase
        .from('content_moderation')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
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

  const handleModeration = async (itemId: string, action: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('content_moderation')
        .update({
          status: 'reviewed',
          action_taken: action,
          moderator_notes: moderatorNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Moderation action completed'
      });

      setSelectedItem(null);
      setModeratorNotes('');
      fetchModerationItems();
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
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'reviewed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Content Moderation
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <p>No pending moderation items</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{item.content_type}</Badge>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">Reason: {item.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Reported: {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedItem === item.id && item.status === 'pending' && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <Textarea
                      placeholder="Add moderator notes..."
                      value={moderatorNotes}
                      onChange={(e) => setModeratorNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModeration(item.id, 'dismissed')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModeration(item.id, 'warning')}
                      >
                        Warning
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleModeration(item.id, 'content_removed')}
                      >
                        Remove Content
                      </Button>
                    </div>
                  </div>
                )}

                {item.status === 'pending' && selectedItem !== item.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedItem(item.id)}
                  >
                    Review
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
