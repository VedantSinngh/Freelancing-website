import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, Users, Briefcase, Calendar } from 'lucide-react';

interface AnalyticsData {
  usersByRole: { name: string; value: number }[];
  projectsByStatus: { name: string; value: number }[];
  topSkills: { skill: string; count: number }[];
  consultancyBookings: { month: string; bookings: number }[];
  userGrowth: { month: string; users: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export function Analytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    usersByRole: [],
    projectsByStatus: [],
    topSkills: [],
    consultancyBookings: [],
    userGrowth: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch users by role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role');

      if (rolesError) throw rolesError;

      const roleCounts = roles?.reduce((acc: any, { role }) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      const usersByRole = Object.entries(roleCounts || {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value as number
      }));

      // Fetch projects by status
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('status');

      if (projectsError) throw projectsError;

      const statusCounts = projects?.reduce((acc: any, { status }) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const projectsByStatus = Object.entries(statusCounts || {}).map(([name, value]) => ({
        name: name.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: value as number
      }));

      // Fetch top skills
      const { data: allProjects, error: skillsError } = await supabase
        .from('projects')
        .select('skills_required');

      if (skillsError) throw skillsError;

      const skillCounts: Record<string, number> = {};
      allProjects?.forEach(project => {
        project.skills_required?.forEach((skill: string) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });

      const topSkills = Object.entries(skillCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Fetch consultancy bookings by month
      const { data: bookings, error: bookingsError } = await supabase
        .from('consultancy_bookings')
        .select('session_date');

      if (bookingsError) throw bookingsError;

      const bookingsByMonth: Record<string, number> = {};
      bookings?.forEach(booking => {
        const month = new Date(booking.session_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        bookingsByMonth[month] = (bookingsByMonth[month] || 0) + 1;
      });

      const consultancyBookings = Object.entries(bookingsByMonth)
        .map(([month, bookings]) => ({ month, bookings }))
        .slice(-6);

      // Fetch user growth (last 6 months)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at');

      if (profilesError) throw profilesError;

      const usersByMonth: Record<string, number> = {};
      profiles?.forEach(profile => {
        const month = new Date(profile.created_at!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        usersByMonth[month] = (usersByMonth[month] || 0) + 1;
      });

      const userGrowth = Object.entries(usersByMonth)
        .map(([month, users]) => ({ month, users }))
        .slice(-6);

      setAnalytics({
        usersByRole,
        projectsByStatus,
        topSkills,
        consultancyBookings,
        userGrowth
      });
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

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: `${filename}.csv downloaded successfully`
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold mt-1">
                  {analytics.usersByRole.reduce((sum, item) => sum + item.value, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold mt-1">
                  {analytics.projectsByStatus.reduce((sum, item) => sum + item.value, 0)}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consultations</p>
                <p className="text-2xl font-bold mt-1">
                  {analytics.consultancyBookings.reduce((sum, item) => sum + item.bookings, 0)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
                <p className="text-2xl font-bold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  {analytics.userGrowth.length > 1 
                    ? Math.round(((analytics.userGrowth[analytics.userGrowth.length - 1]?.users || 0) / 
                        (analytics.userGrowth[0]?.users || 1) - 1) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users by Role</CardTitle>
                  <CardDescription>Distribution of users across different roles</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics.usersByRole, 'users-by-role')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={analytics.usersByRole}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {analytics.usersByRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Projects by Status</CardTitle>
                  <CardDescription>Current distribution of project statuses</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics.projectsByStatus, 'projects-by-status')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.projectsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Projects" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Skills in Demand</CardTitle>
                  <CardDescription>Most requested skills across all projects</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics.topSkills, 'top-skills')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.topSkills} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="skill" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--secondary))" name="Projects" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Consultancy Bookings</CardTitle>
                  <CardDescription>Monthly consultation sessions over time</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics.consultancyBookings, 'consultancy-bookings')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.consultancyBookings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    name="Bookings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Growth Trend</CardTitle>
                  <CardDescription>New user registrations over the last 6 months</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics.userGrowth, 'user-growth')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
