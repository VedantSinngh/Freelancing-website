import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Plus, Edit2, Trash2, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AchievementManagement() {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: '🏆'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [achievementsResult, usersResult] = await Promise.all([
        supabase.from('achievements').select('*, profiles!achievements_user_id_fkey(full_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, user_id, full_name, avatar_url')
      ]);

      if (achievementsResult.error) throw achievementsResult.error;
      if (usersResult.error) throw usersResult.error;

      setAchievements(achievementsResult.data || []);
      setUsers(usersResult.data || []);
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

  const handleCreateAchievement = async () => {
    try {
      const { error } = await supabase.from('achievements').insert([
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: formData.title,
          description: formData.description,
          icon: formData.icon
        }
      ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Achievement created successfully'
      });

      setIsDialogOpen(false);
      setFormData({ title: '', description: '', icon: '🏆' });
      fetchData();
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
      const { error } = await supabase.from('achievements').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Achievement deleted successfully'
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const icons = ['🏆', '⭐', '🎖️', '👑', '💎', '🚀', '⚡', '🔥', '🎯', '💪', '🌟', '✨'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Achievement & Badge Management
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Achievement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Achievement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Icon</Label>
                  <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {icons.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          <span className="text-2xl">{icon}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Top Collaborator"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Awarded to exceptional collaborators"
                  />
                </div>
                <Button onClick={handleCreateAchievement} className="w-full">
                  Create Achievement
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
        ) : achievements.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No achievements created yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{achievement.icon}</span>
                  <div>
                    <h4 className="font-semibold text-lg">{achievement.title}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created by: {achievement.profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(achievement.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}