import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Briefcase, Globe, Linkedin, Github, Award, Plus, Edit, Trash2, Users } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Profile {
  full_name: string | null;
  bio: string | null;
  skills: string[] | null;
  location: string | null;
  hourly_rate: number | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  position: string | null;
  linkedin: string | null;
  github: string | null;
  avatar_url: string | null;
}

interface Achievement {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

interface Friend {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  company: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: null,
    bio: null,
    skills: null,
    location: null,
    hourly_rate: null,
    phone: null,
    company: null,
    website: null,
    position: null,
    linkedin: null,
    github: null,
    avatar_url: null
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAchievementDialogOpen, setIsAchievementDialogOpen] = useState(false);
  const [newAchievement, setNewAchievement] = useState({ title: '', description: '', icon: '' });

  useEffect(() => {
    // Check URL for user ID parameter
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    setViewingUserId(userId);
  }, []);

  useEffect(() => {
    if (user) {
      const targetUserId = viewingUserId || user.id;
      fetchProfile(targetUserId);
      fetchAchievements(targetUserId);
      fetchFriends(targetUserId);
    }
  }, [user, viewingUserId]);

  const fetchProfile = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
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

  const fetchAchievements = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === 'undefined') return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/achievements/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch achievements');
      const data = await response.json();
      setAchievements(data || []);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchFriends = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${targetUserId},user_id_2.eq.${targetUserId}`);

      if (error) throw error;

      const friendIds = data?.map(f => 
        f.user_id_1 === targetUserId ? f.user_id_2 : f.user_id_1
      ) || [];

      if (friendIds.length > 0) {
        const { data: friendProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, position, company')
          .in('user_id', friendIds);

        if (profilesError) throw profilesError;
        setFriends(friendProfiles?.map(p => ({ id: p.user_id, ...p })) || []);
      }
    } catch (error: any) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          skills: profile.skills,
          location: profile.location,
          hourly_rate: profile.hourly_rate,
          phone: profile.phone,
          company: profile.company,
          website: profile.website,
          position: profile.position,
          linkedin: profile.linkedin,
          github: profile.github
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAddAchievement = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/achievements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newAchievement.title,
          description: newAchievement.description,
          icon: newAchievement.icon || 'Award'
        })
      });
      if (!response.ok) throw new Error('Failed to add achievement');

      toast({
        title: 'Success',
        description: 'Achievement added successfully'
      });
      setNewAchievement({ title: '', description: '', icon: '' });
      setIsAchievementDialogOpen(false);
      fetchAchievements(viewingUserId || user?.id || '');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/achievements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete achievement');

      toast({
        title: 'Success',
        description: 'Achievement deleted'
      });
      fetchAchievements(user?.id || '');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Profile">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile">
      <div className="space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-10 rounded-2xl blur-3xl" />
          <Card className="relative border-2 border-primary/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="w-32 h-32 border-4 border-primary shadow-glow-primary">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-secondary text-white">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                    {profile.full_name || 'Your Name'}
                  </h1>
                  {profile.position && (
                    <p className="text-xl text-muted-foreground mb-1">{profile.position}</p>
                  )}
                  {profile.company && (
                    <p className="text-lg text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                      <Briefcase className="w-5 h-5" />
                      {profile.company}
                    </p>
                  )}
                  {profile.bio && (
                    <p className="mt-4 text-muted-foreground max-w-2xl">{profile.bio}</p>
                  )}
                </div>

                {!viewingUserId && (
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>Update your profile information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={profile.full_name || ''}
                          onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea
                          value={profile.bio || ''}
                          onChange={(e) => setProfile({...profile, bio: e.target.value})}
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Position</Label>
                          <Input
                            value={profile.position || ''}
                            onChange={(e) => setProfile({...profile, position: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Company</Label>
                          <Input
                            value={profile.company || ''}
                            onChange={(e) => setProfile({...profile, company: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={profile.phone || ''}
                            onChange={(e) => setProfile({...profile, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input
                            value={profile.location || ''}
                            onChange={(e) => setProfile({...profile, location: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Website</Label>
                          <Input
                            value={profile.website || ''}
                            onChange={(e) => setProfile({...profile, website: e.target.value})}
                            placeholder="https://"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hourly Rate</Label>
                          <Input
                            type="number"
                            value={profile.hourly_rate || ''}
                            onChange={(e) => setProfile({...profile, hourly_rate: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>LinkedIn</Label>
                          <Input
                            value={profile.linkedin || ''}
                            onChange={(e) => setProfile({...profile, linkedin: e.target.value})}
                            placeholder="linkedin.com/in/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>GitHub</Label>
                          <Input
                            value={profile.github || ''}
                            onChange={(e) => setProfile({...profile, github: e.target.value})}
                            placeholder="github.com/..."
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUpdateProfile} className="bg-gradient-to-r from-primary to-secondary">
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                )}
              </div>

              {/* Contact Info */}
              <div className="mt-6 flex flex-wrap gap-4 justify-center md:justify-start">
                {profile.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {user?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                  </a>
                )}
                {profile.linkedin && (
                  <a href={`https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {profile.github && (
                  <a href={`https://${profile.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Github className="w-4 h-4" />
                    <span>GitHub</span>
                  </a>
                )}
              </div>

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                      <Badge key={idx} className="bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border border-primary/20">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-accent/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-accent" />
                    Achievements
                  </CardTitle>
                  <CardDescription>Your accomplishments and milestones</CardDescription>
                </div>
                {!viewingUserId && (
                  <Dialog open={isAchievementDialogOpen} onOpenChange={setIsAchievementDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-to-r from-accent to-primary hover:opacity-90">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Achievement
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Achievement</DialogTitle>
                      <DialogDescription>Share your accomplishments</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={newAchievement.title}
                          onChange={(e) => setNewAchievement({...newAchievement, title: e.target.value})}
                          placeholder="e.g., Completed Major Project"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newAchievement.description}
                          onChange={(e) => setNewAchievement({...newAchievement, description: e.target.value})}
                          placeholder="Tell us more about this achievement..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddAchievement} className="bg-gradient-to-r from-accent to-primary">
                        Add Achievement
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No achievements yet. Add your first one!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative p-4 border-2 border-accent/20 rounded-lg bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg transition-shadow group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2 group-hover:text-accent transition-colors">
                            {achievement.title}
                          </h4>
                          {achievement.description && (
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(achievement.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAchievement(achievement.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Friends Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-secondary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-secondary" />
                Connections ({friends.length})
              </CardTitle>
              <CardDescription>Your professional network</CardDescription>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No connections yet. Start collaborating!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:border-secondary/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12 border-2 border-secondary/20">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-white">
                          {friend.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{friend.full_name || 'User'}</p>
                        {friend.position && (
                          <p className="text-xs text-muted-foreground truncate">{friend.position}</p>
                        )}
                        {friend.company && (
                          <p className="text-xs text-muted-foreground truncate">{friend.company}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}