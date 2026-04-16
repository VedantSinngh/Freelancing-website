import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FreelancerPortfolio, type PortfolioItem } from '@/components/FreelancerPortfolio';
import { FreelancerReviews, type Review } from '@/components/FreelancerReviews';
import {
  User, Mail, Phone, Briefcase, Globe, Linkedin, Github, Award, Plus, Edit,
  Trash2, Users, MapPin, DollarSign, Star, BookOpen, Building2, CalendarDays, Link2
} from 'lucide-react';

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

interface WorkExperience {
  id: string;
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_url?: string;
}

interface Friend {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  company: string | null;
}

const EMPTY_EXP: Omit<WorkExperience, 'id'> = {
  job_title: '', company: '', start_date: '', end_date: '', is_current: false, description: ''
};
const EMPTY_CERT: Omit<Certification, 'id'> = {
  name: '', issuer: '', issue_date: '', expiry_date: '', credential_url: ''
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: null, bio: null, skills: null, location: null,
    hourly_rate: null, phone: null, company: null, website: null,
    position: null, linkedin: null, github: null, avatar_url: null,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAchievementDialogOpen, setIsAchievementDialogOpen] = useState(false);
  const [isExpDialogOpen, setIsExpDialogOpen] = useState(false);
  const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
  const [newAchievement, setNewAchievement] = useState({ title: '', description: '', icon: '' });
  const [newExp, setNewExp] = useState({ ...EMPTY_EXP });
  const [newCert, setNewCert] = useState({ ...EMPTY_CERT });
  const [skillInput, setSkillInput] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    setViewingUserId(userId);
  }, []);

  useEffect(() => {
    if (user) {
      const targetUserId = viewingUserId || user.id;
      Promise.all([
        fetchProfile(targetUserId),
        fetchAchievements(targetUserId),
        fetchFriends(targetUserId),
        fetchPortfolio(targetUserId),
        fetchWorkExperience(targetUserId),
        fetchCertifications(targetUserId),
        fetchReviews(targetUserId),
      ]).finally(() => setLoading(false));
    }
  }, [user, viewingUserId]);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', uid).single();
    if (data) setProfile(data);
  };

  const fetchAchievements = async (uid: string) => {
    if (!uid || uid === 'undefined') return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/achievements/${uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAchievements(await res.json() || []);
    } catch { /* silent */ }
  };

  const fetchFriends = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('friendships').select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${uid},user_id_2.eq.${uid}`);
      const ids = (data || []).map(f => f.user_id_1 === uid ? f.user_id_2 : f.user_id_1);
      if (ids.length > 0) {
        const { data: fp } = await supabase.from('profiles')
          .select('user_id, full_name, avatar_url, position, company').in('user_id', ids);
        setFriends((fp || []).map(p => ({ id: p.user_id, ...p })));
      }
    } catch { /* silent */ }
  };

  const fetchPortfolio = async (uid: string) => {
    try {
      const { data } = await supabase.from('portfolio_items').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      setPortfolioItems(data || []);
    } catch { /* table may not exist yet */ }
  };

  const fetchWorkExperience = async (uid: string) => {
    try {
      const { data } = await supabase.from('work_experience').select('*').eq('user_id', uid).order('start_date', { ascending: false });
      setWorkExperience(data || []);
    } catch { /* silent */ }
  };

  const fetchCertifications = async (uid: string) => {
    try {
      const { data } = await supabase.from('certifications').select('*').eq('user_id', uid).order('issue_date', { ascending: false });
      setCertifications(data || []);
    } catch { /* silent */ }
  };

  const fetchReviews = async (uid: string) => {
    try {
      const { data } = await supabase.from('reviews').select('*, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('reviewee_id', uid).order('created_at', { ascending: false });
      setReviews((data || []).map((r: any) => ({
        ...r,
        reviewer_name: r.profiles?.full_name || 'Anonymous',
        reviewer_avatar: r.profiles?.avatar_url,
      })));
    } catch { /* silent */ }
  };

  const handleUpdateProfile = async () => {
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name, bio: profile.bio, skills: profile.skills,
      location: profile.location, hourly_rate: profile.hourly_rate, phone: profile.phone,
      company: profile.company, website: profile.website, position: profile.position,
      linkedin: profile.linkedin, github: profile.github
    }).eq('user_id', user?.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Success', description: 'Profile updated successfully' });
    setIsEditDialogOpen(false);
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !(profile.skills || []).includes(skillInput.trim())) {
      setProfile({ ...profile, skills: [...(profile.skills || []), skillInput.trim()] });
      setSkillInput('');
    }
  };
  const removeSkill = (s: string) => setProfile({ ...profile, skills: (profile.skills || []).filter(sk => sk !== s) });

  const handleAddAchievement = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/achievements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newAchievement.title, description: newAchievement.description, icon: newAchievement.icon || 'Award' })
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Success', description: 'Achievement added' });
      setNewAchievement({ title: '', description: '', icon: '' });
      setIsAchievementDialogOpen(false);
      fetchAchievements(viewingUserId || user?.id || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleDeleteAchievement = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/achievements/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      toast({ title: 'Success', description: 'Achievement deleted' });
      fetchAchievements(user?.id || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  // Portfolio CRUD
  const handleAddPortfolio = async (item: Omit<PortfolioItem, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('portfolio_items').insert([{ ...item, user_id: user?.id }]);
      if (error) throw error;
      toast({ title: 'Success', description: 'Portfolio project added' });
      fetchPortfolio(user?.id || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message || 'Table may not exist', variant: 'destructive' }); }
  };
  const handleUpdatePortfolio = async (id: string, item: Partial<PortfolioItem>) => {
    try {
      const { error } = await supabase.from('portfolio_items').update(item).eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Updated' });
      fetchPortfolio(user?.id || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };
  const handleDeletePortfolio = async (id: string) => {
    try {
      await supabase.from('portfolio_items').delete().eq('id', id);
      toast({ title: 'Success', description: 'Removed' });
      fetchPortfolio(user?.id || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  // Work Experience CRUD
  const handleAddExp = async () => {
    try {
      const { error } = await supabase.from('work_experience').insert([{ ...newExp, user_id: user?.id }]);
      if (error) throw error;
      toast({ title: 'Success', description: 'Experience added' });
      setNewExp({ ...EMPTY_EXP });
      setIsExpDialogOpen(false);
      fetchWorkExperience(user?.id || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message || 'Table may not exist', variant: 'destructive' }); }
  };
  const handleDeleteExp = async (id: string) => {
    try {
      await supabase.from('work_experience').delete().eq('id', id);
      fetchWorkExperience(user?.id || '');
    } catch { /* silent */ }
  };

  // Certification CRUD  
  const handleAddCert = async () => {
    try {
      const { error } = await supabase.from('certifications').insert([{ ...newCert, user_id: user?.id }]);
      if (error) throw error;
      toast({ title: 'Success', description: 'Certification added' });
      setNewCert({ ...EMPTY_CERT });
      setIsCertDialogOpen(false);
      fetchCertifications(user?.id || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message || 'Table may not exist', variant: 'destructive' }); }
  };
  const handleDeleteCert = async (id: string) => {
    try {
      await supabase.from('certifications').delete().eq('id', id);
      fetchCertifications(user?.id || '');
    } catch { /* silent */ }
  };

  // Reviews
  const handleAddReview = async (rating: number, comment: string) => {
    const targetId = viewingUserId || user?.id;
    try {
      const { error } = await supabase.from('reviews').insert([{
        reviewer_id: user?.id, reviewee_id: targetId, rating, comment
      }]);
      if (error) throw error;
      toast({ title: 'Success', description: 'Review submitted!' });
      fetchReviews(targetId || '');
    } catch (e: any) { toast({ title: 'Error', description: e.message || 'Table may not exist', variant: 'destructive' }); }
  };

  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  if (loading) {
    return (
      <DashboardLayout title="Profile">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile">
      <div className="space-y-6">
        {/* ── Profile Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-10 rounded-2xl blur-3xl" />
          <Card className="relative border-2 border-primary/20 shadow-lg overflow-hidden">
            {/* Cover gradient */}
            <div className="h-28 bg-gradient-to-r from-primary via-secondary to-accent opacity-80" />
            <CardContent className="px-6 pb-6">
              <div className="flex flex-col md:flex-row items-start gap-6 -mt-14">
                <Avatar className="w-28 h-28 border-4 border-card shadow-xl ring-2 ring-primary/30">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-secondary text-white">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 mt-14 md:mt-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {profile.full_name || 'Your Name'}
                      </h1>
                      {profile.position && <p className="text-lg text-muted-foreground mt-0.5">{profile.position}</p>}
                      {profile.company && (
                        <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Building2 className="w-4 h-4" />{profile.company}
                        </p>
                      )}
                      {profile.location && (
                        <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                          <MapPin className="w-4 h-4" />{profile.location}
                        </p>
                      )}

                      {/* Rating summary */}
                      {reviews.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                            ))}
                          </div>
                          <span className="font-semibold text-sm">{avgRating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-xs">({reviews.length} reviews)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {profile.hourly_rate && (
                        <Badge className="gap-1.5 bg-green-500/10 text-green-700 border-green-200 text-base px-3 py-1.5">
                          <DollarSign className="w-3.5 h-3.5" />{profile.hourly_rate}/hr
                        </Badge>
                      )}
                      {isOwnProfile && (
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-primary to-secondary gap-2 hover:opacity-90">
                              <Edit className="w-4 h-4" /> Edit Profile
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Profile</DialogTitle>
                              <DialogDescription>Update your professional information</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                  <Label>Full Name</Label>
                                  <Input value={profile.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                  <Label>Bio</Label>
                                  <Textarea value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} rows={4} />
                                </div>
                                <div className="space-y-2"><Label>Position</Label><Input value={profile.position || ''} onChange={e => setProfile({ ...profile, position: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Company</Label><Input value={profile.company || ''} onChange={e => setProfile({ ...profile, company: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Location</Label><Input value={profile.location || ''} onChange={e => setProfile({ ...profile, location: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Website</Label><Input value={profile.website || ''} onChange={e => setProfile({ ...profile, website: e.target.value })} placeholder="https://" /></div>
                                <div className="space-y-2"><Label>Hourly Rate ($)</Label><Input type="number" value={profile.hourly_rate || ''} onChange={e => setProfile({ ...profile, hourly_rate: parseFloat(e.target.value) })} /></div>
                                <div className="space-y-2"><Label>LinkedIn</Label><Input value={profile.linkedin || ''} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} /></div>
                                <div className="space-y-2"><Label>GitHub</Label><Input value={profile.github || ''} onChange={e => setProfile({ ...profile, github: e.target.value })} /></div>
                              </div>
                              <div className="space-y-2">
                                <Label>Skills</Label>
                                <div className="flex gap-2">
                                  <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} placeholder="Add a skill, press Enter" />
                                  <Button type="button" variant="outline" onClick={handleAddSkill}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {(profile.skills || []).map(s => (
                                    <Badge key={s} className="gap-1 cursor-pointer" onClick={() => removeSkill(s)}>
                                      {s} <span className="text-xs">×</span>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleUpdateProfile} className="bg-gradient-to-r from-primary to-secondary">Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {profile.bio && <p className="mt-4 text-muted-foreground leading-relaxed">{profile.bio}</p>}

                  {/* Contact bar */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    {profile.phone && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="w-4 h-4" />{profile.phone}</div>}
                    {user?.email && isOwnProfile && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="w-4 h-4" />{user.email}</div>}
                    {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Globe className="w-4 h-4" />Website</a>}
                    {profile.linkedin && <a href={`https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Linkedin className="w-4 h-4" />LinkedIn</a>}
                    {profile.github && <a href={`https://${profile.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Github className="w-4 h-4" />GitHub</a>}
                  </div>

                  {/* Skills */}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.skills.map((skill, idx) => (
                        <Badge key={idx} className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:from-primary/20 hover:to-secondary/20 transition-colors">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Tabbed Sections ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          {/* Overview — Achievements + Connections */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Achievements */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-accent/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Award className="w-6 h-6 text-accent" />Achievements</CardTitle>
                      <CardDescription>Accomplishments and milestones</CardDescription>
                    </div>
                    {isOwnProfile && (
                      <Dialog open={isAchievementDialogOpen} onOpenChange={setIsAchievementDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-gradient-to-r from-accent to-primary gap-2"><Plus className="w-4 h-4" />Add</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Add Achievement</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2"><Label>Title</Label><Input value={newAchievement.title} onChange={e => setNewAchievement({ ...newAchievement, title: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Description</Label><Textarea value={newAchievement.description} onChange={e => setNewAchievement({ ...newAchievement, description: e.target.value })} rows={3} /></div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleAddAchievement} className="bg-gradient-to-r from-accent to-primary">Add Achievement</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {achievements.length === 0 ? (
                    <div className="text-center py-10"><Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground">No achievements yet</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {achievements.map(a => (
                        <motion.div key={a.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          className="relative group p-4 border-2 border-accent/20 rounded-xl bg-gradient-to-br from-accent/5 to-transparent hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div><h4 className="font-semibold group-hover:text-accent transition-colors">{a.title}</h4>
                              {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                              <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                            </div>
                            {isOwnProfile && (
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                onClick={() => handleDeleteAchievement(a.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Connections */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-2 border-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="w-6 h-6 text-secondary" />Connections ({friends.length})</CardTitle>
                  <CardDescription>Professional network</CardDescription>
                </CardHeader>
                <CardContent>
                  {friends.length === 0 ? (
                    <div className="text-center py-10"><Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground">No connections yet</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {friends.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-3 border rounded-xl hover:border-secondary/50 transition-colors">
                          <Avatar className="w-11 h-11 border-2 border-secondary/20">
                            <AvatarImage src={f.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-white">{f.full_name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{f.full_name || 'User'}</p>
                            {f.position && <p className="text-xs text-muted-foreground truncate">{f.position}</p>}
                            {f.company && <p className="text-xs text-muted-foreground truncate">{f.company}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Portfolio */}
          <TabsContent value="portfolio" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" />Portfolio Projects</CardTitle>
                  <CardDescription>Showcase of completed work and personal projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <FreelancerPortfolio
                    items={portfolioItems}
                    canEdit={isOwnProfile}
                    onAdd={handleAddPortfolio}
                    onUpdate={handleUpdatePortfolio}
                    onDelete={handleDeletePortfolio}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Work Experience */}
          <TabsContent value="experience" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-secondary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><BookOpen className="w-6 h-6 text-secondary" />Work Experience</CardTitle>
                      <CardDescription>Professional history and roles</CardDescription>
                    </div>
                    {isOwnProfile && (
                      <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-gradient-to-r from-secondary to-primary gap-2"><Plus className="w-4 h-4" />Add Experience</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                          <DialogHeader><DialogTitle>Add Work Experience</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2 col-span-2"><Label>Job Title *</Label><Input value={newExp.job_title} onChange={e => setNewExp({ ...newExp, job_title: e.target.value })} /></div>
                              <div className="space-y-2 col-span-2"><Label>Company *</Label><Input value={newExp.company} onChange={e => setNewExp({ ...newExp, company: e.target.value })} /></div>
                              <div className="space-y-2"><Label>Start Date</Label><Input type="month" value={newExp.start_date} onChange={e => setNewExp({ ...newExp, start_date: e.target.value })} /></div>
                              <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="month" value={newExp.end_date} onChange={e => setNewExp({ ...newExp, end_date: e.target.value })} disabled={newExp.is_current} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={newExp.is_current} onCheckedChange={v => setNewExp({ ...newExp, is_current: v })} id="current-role" />
                              <Label htmlFor="current-role">I currently work here</Label>
                            </div>
                            <div className="space-y-2"><Label>Description</Label><Textarea value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })} rows={3} /></div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleAddExp} className="bg-gradient-to-r from-secondary to-primary">Add Experience</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {workExperience.length === 0 ? (
                    <div className="text-center py-12"><BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground">No work experience added yet</p></div>
                  ) : (
                    <div className="relative pl-6 space-y-8">
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-secondary to-transparent" />
                      {workExperience.map((exp, idx) => (
                        <motion.div key={exp.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                          className="relative group">
                          <div className="absolute -left-[1.35rem] top-1.5 w-3 h-3 rounded-full bg-secondary border-2 border-card" />
                          <div className="p-4 border rounded-xl hover:border-secondary/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-base">{exp.job_title}</h4>
                                <p className="text-primary font-medium">{exp.company}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  {exp.start_date} — {exp.is_current ? 'Present' : (exp.end_date || 'N/A')}
                                </p>
                                {exp.description && <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>}
                              </div>
                              {isOwnProfile && (
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={() => handleDeleteExp(exp.id)}>
                                  <Trash2 className="w-4 h-4" />
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
            </motion.div>
          </TabsContent>

          {/* Certifications */}
          <TabsContent value="certifications" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-accent/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Award className="w-6 h-6 text-accent" />Certifications</CardTitle>
                      <CardDescription>Professional credentials and licenses</CardDescription>
                    </div>
                    {isOwnProfile && (
                      <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-gradient-to-r from-accent to-primary gap-2"><Plus className="w-4 h-4" />Add Cert</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2"><Label>Certification Name *</Label><Input value={newCert.name} onChange={e => setNewCert({ ...newCert, name: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Issuing Organization *</Label><Input value={newCert.issuer} onChange={e => setNewCert({ ...newCert, issuer: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2"><Label>Issue Date</Label><Input type="month" value={newCert.issue_date} onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })} /></div>
                              <div className="space-y-2"><Label>Expiry Date</Label><Input type="month" value={newCert.expiry_date} onChange={e => setNewCert({ ...newCert, expiry_date: e.target.value })} /></div>
                            </div>
                            <div className="space-y-2"><Label>Credential URL</Label><Input value={newCert.credential_url} onChange={e => setNewCert({ ...newCert, credential_url: e.target.value })} placeholder="https://..." /></div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleAddCert} className="bg-gradient-to-r from-accent to-primary">Add Certification</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {certifications.length === 0 ? (
                    <div className="text-center py-12"><Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground">No certifications added yet</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certifications.map((cert, idx) => (
                        <motion.div key={cert.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                          className="group p-4 border-2 border-accent/20 rounded-xl bg-gradient-to-br from-accent/5 to-transparent hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold group-hover:text-accent transition-colors">{cert.name}</h4>
                              <p className="text-sm text-primary mt-1">{cert.issuer}</p>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" />
                                {cert.issue_date} {cert.expiry_date ? `— ${cert.expiry_date}` : ''}
                              </p>
                              {cert.credential_url && (
                                <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">
                                  <Link2 className="w-3 h-3" /> View Credential
                                </a>
                              )}
                            </div>
                            {isOwnProfile && (
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={() => handleDeleteCert(cert.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 border-amber-200 dark:border-amber-900/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Star className="w-6 h-6 text-amber-500" />Ratings & Reviews</CardTitle>
                  <CardDescription>Client feedback and professional reputation</CardDescription>
                </CardHeader>
                <CardContent>
                  <FreelancerReviews
                    reviews={reviews}
                    canReview={!isOwnProfile && !!user}
                    onAddReview={handleAddReview}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}