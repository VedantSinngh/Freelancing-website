import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import { UserManagement } from '@/components/admin/UserManagement';
import { Analytics } from '@/components/admin/Analytics';
import { ContentModeration } from '@/components/admin/ContentModeration';
import { DisputeManagement } from '@/components/admin/DisputeManagement';
import { AchievementManagement } from '@/components/admin/AchievementManagement';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
});

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalBids: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Total Projects', value: stats.totalProjects, icon: Briefcase, color: 'text-secondary' },
            { label: 'Total Bids', value: stats.totalBids, icon: TrendingUp, color: 'text-accent' },
            { label: 'Platform Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-primary' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{loading ? '...' : stat.value}</p>
                    </div>
                    <stat.icon className={`w-10 h-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Analytics />
          </TabsContent>

          <TabsContent value="moderation" className="space-y-6">
            <ContentModeration />
          </TabsContent>

          <TabsContent value="disputes" className="space-y-6">
            <DisputeManagement />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <AchievementManagement />
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6">
            <AnnouncementManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
