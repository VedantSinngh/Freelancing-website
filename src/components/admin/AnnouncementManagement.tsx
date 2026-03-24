import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Pin, PinOff, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export function AnnouncementManagement() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    is_pinned: false,
    target_roles: [] as string[]
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
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

  const handleCreate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('announcements').insert([
        {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          is_pinned: formData.is_pinned,
          target_roles: formData.target_roles.length > 0 ? formData.target_roles : null,
          created_by: user.id
        }
      ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement created successfully'
      });

      setIsDialogOpen(false);
      setFormData({ title: '', content: '', type: 'info', is_pinned: false, target_roles: [] });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const togglePin = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: currentStatus ? 'Announcement unpinned' : 'Announcement pinned'
      });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement deleted successfully'
      });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const typeColors: Record<string, string> = {
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    maintenance: 'bg-muted text-muted-foreground'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Global Platform Announcements
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Important System Update"
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Announcement details..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Pin to Top</Label>
                  <Switch
                    checked={formData.is_pinned}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Publish Announcement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{announcement.title}</h4>
                      <Badge className={typeColors[announcement.type]}>
                        {announcement.type}
                      </Badge>
                      {announcement.is_pinned && (
                        <Badge variant="outline" className="gap-1">
                          <Pin className="w-3 h-3" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePin(announcement.id, announcement.is_pinned)}
                    >
                      {announcement.is_pinned ? (
                        <PinOff className="w-4 h-4" />
                      ) : (
                        <Pin className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}