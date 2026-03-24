import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, FileText, Star, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CollaborationInvites } from '@/components/CollaborationInvites';

export default function ConsultantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('consultancy_bookings')
        .select('*, profiles!consultancy_bookings_client_id_fkey(full_name)')
        .eq('consultant_id', user?.id)
        .order('session_date', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
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
            { label: 'Avg Rating', value: '4.8', icon: Star, color: 'text-primary' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {stat.value}
                      </p>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming sessions scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-all hover:shadow-md"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">
                            Session with {booking.profiles?.full_name || 'Client'}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(booking.session_date).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{booking.duration_minutes} minutes</span>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Recent Consultations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedBookings.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed sessions yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedBookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold">{booking.profiles?.full_name || 'Client'}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(booking.session_date).toLocaleDateString()}
                          </p>
                        </div>
                        {booking.report_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={booking.report_url} target="_blank" rel="noopener noreferrer">
                              View Report
                            </a>
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
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{booking.profiles?.full_name || 'Client'}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(booking.session_date).toLocaleString()}
                          </div>
                          <div>{booking.duration_minutes} minutes</div>
                        </div>
                        {booking.notes && (
                          <p className="text-sm mt-2 text-muted-foreground">{booking.notes}</p>
                        )}
                      </div>
                      <Badge variant={new Date(booking.session_date) > new Date() ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Track your consultation performance and growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Consultations</p>
                    <p className="text-2xl font-bold mt-1">{completedBookings.length}</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold mt-1">
                      {bookings.filter(b => {
                        const date = new Date(b.session_date);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">4.8</p>
                      <Star className="w-5 h-5 text-primary fill-primary" />
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
