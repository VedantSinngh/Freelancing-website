import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, FileText, Star, Clock, CheckCircle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CollaborationInvites } from '@/components/CollaborationInvites';
import { useNavigate } from 'react-router-dom';
import { ReportCard, type ConsultantReport } from '@/components/ReportCard';

export default function ConsultantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<ConsultantReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('consultancy_bookings')
        .select('*, profiles!consultancy_bookings_client_id_fkey(full_name)')
        .eq('consultant_id', user?.id)
        .order('session_date', { ascending: true });
      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchRecentReports = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('consultant_reports')
        .select('*, report_versions(*)')
        .eq('uploader_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(3);

      setRecentReports((data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        format: r.format,
        current_version: r.current_version || 1,
        file_url: r.file_url,
        file_size: r.file_size || 0,
        uploader_name: 'You',
        created_at: r.created_at,
        updated_at: r.updated_at,
        is_accessible: true,
        versions: r.report_versions || [],
        access_count: r.access_count || 0,
      })));
    } catch {
      // Table not ready — show empty
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBookings();
    fetchRecentReports();
  }, [fetchBookings, fetchRecentReports]);

  const upcomingBookings = bookings.filter(b => new Date(b.session_date) > new Date());
  const completedBookings = bookings.filter(b => b.status === 'completed');

  return (
    <DashboardLayout title="Consultant Dashboard">
      <div className="space-y-8">
        {/* Collaboration Invites */}
        <CollaborationInvites />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Consultations', value: bookings.length, icon: Calendar, color: 'text-primary' },
            { label: 'Upcoming', value: upcomingBookings.length, icon: Clock, color: 'text-secondary' },
            { label: 'Completed', value: completedBookings.length, icon: CheckCircle, color: 'text-accent' },
            { label: 'Avg Rating', value: '4.8', icon: Star, color: 'text-amber-500' }
          ].map((stat, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="vault">📁 Secure Vault</TabsTrigger>
            <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Upcoming Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto" /></div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming sessions scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map(booking => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-primary/50 transition-all hover:shadow-md">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">Session with {booking.profiles?.full_name || 'Client'}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(booking.session_date).toLocaleString()}</div>
                            <span>{booking.duration_minutes} minutes</span>
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary">{booking.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reports Preview */}
            {recentReports.length > 0 && (
              <Card className="border-2 border-purple-100 dark:border-purple-900/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-500" /> Recent Vault Reports
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('vault')}>
                      <FileText className="w-4 h-4 mr-2" /> Open Vault
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentReports.map(r => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      onDownload={() => {}}
                      isOwner
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Consultations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" />Recent Consultations</CardTitle>
              </CardHeader>
              <CardContent>
                {completedBookings.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No completed sessions yet</div>
                ) : (
                  <div className="space-y-3">
                    {completedBookings.slice(0, 5).map(booking => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-accent/5 transition-colors">
                        <div>
                          <h4 className="font-semibold">{booking.profiles?.full_name || 'Client'}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{new Date(booking.session_date).toLocaleDateString()}</p>
                        </div>
                        {booking.report_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={booking.report_url} target="_blank" rel="noopener noreferrer">View Report</a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>Manage your consultation schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between p-4 border border-border rounded-xl">
                      <div className="flex-1">
                        <h4 className="font-semibold">{booking.profiles?.full_name || 'Client'}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(booking.session_date).toLocaleString()}</div>
                          <div>{booking.duration_minutes} minutes</div>
                        </div>
                        {booking.notes && <p className="text-sm mt-2 text-muted-foreground">{booking.notes}</p>}
                      </div>
                      <Badge variant={new Date(booking.session_date) > new Date() ? 'default' : 'secondary'}>{booking.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vault" className="space-y-6">
            {/* Embedded vault preview with link to full page */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-primary to-blue-600 p-6 text-white shadow-xl">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl"><Shield className="w-8 h-8" /></div>
                <div className="flex-1">
                  <h2 className="text-xl font-black">Secure Document Vault</h2>
                  <p className="text-white/80 mt-0.5 text-sm">Upload, manage and share encrypted reports with authorized clients</p>
                </div>
                <Button
                  onClick={() => navigate('/vault')}
                  className="bg-white text-purple-600 hover:bg-white/90 font-bold"
                >
                  Open Full Vault →
                </Button>
              </div>
            </div>

            {recentReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">No reports uploaded yet</p>
                  <Button className="mt-4" onClick={() => navigate('/vault')}>
                    <FileText className="w-4 h-4 mr-2" /> Upload First Report
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentReports.map(r => (
                  <ReportCard key={r.id} report={r} onDownload={() => {}} isOwner />
                ))}
                <Button variant="outline" className="w-full" onClick={() => navigate('/vault')}>
                  View All Reports in Vault →
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Track your consultation performance and growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border border-border rounded-xl">
                    <p className="text-sm text-muted-foreground">Total Consultations</p>
                    <p className="text-2xl font-bold mt-1">{completedBookings.length}</p>
                  </div>
                  <div className="p-4 border border-border rounded-xl">
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold mt-1">
                      {bookings.filter(b => {
                        const date = new Date(b.session_date);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-xl">
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">4.8</p>
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <p>Detailed analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
