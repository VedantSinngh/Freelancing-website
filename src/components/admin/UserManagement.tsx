import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Shield, UserX, UserCheck, UserCog } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
});

interface UserEntry {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
  trust_level: string;
  created_at: string;
}

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserEntry | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users/full`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      setUsers(await res.json());
    } catch (error: any) {
      toast({ title: 'Error fetching users', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateTrustLevel = async (userId: string, newLevel: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/trust`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ trust_level: newLevel })
      });
      if (!res.ok) throw new Error('Failed to update trust level');
      toast({ title: 'Success', description: 'Trust level updated successfully' });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');
      toast({ title: 'Success', description: 'User role updated successfully' });
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getTrustBadgeColor = (level: string) => {
    switch (level) {
      case 'verified': return 'bg-success text-success-foreground';
      case 'flagged': return 'bg-warning text-warning-foreground';
      case 'suspended': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          User Management & Role Control
        </CardTitle>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="freelancer">Freelancer</SelectItem>
              <SelectItem value="consultant">Consultant</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No users found.</div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{user.full_name || user.email || 'Unnamed User'}</h4>
                    <Badge variant="outline">{user.role || 'No Role'}</Badge>
                    <Badge className={getTrustBadgeColor(user.trust_level || 'active')}>
                      {user.trust_level || 'active'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email} · Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Dialog open={roleDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                    setRoleDialogOpen(open);
                    if (!open) setSelectedUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                        <UserCog className="w-4 h-4 mr-2" />
                        Manage Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage User Role</DialogTitle>
                        <DialogDescription>
                          Update the role for {user.full_name || 'this user'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Current Role</label>
                          <Badge variant="outline" className="block w-fit">{user.role || 'No Role'}</Badge>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">New Role</label>
                          <Select onValueChange={(value) => updateUserRole(user.user_id, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select new role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="freelancer">Freelancer</SelectItem>
                              <SelectItem value="consultant">Consultant</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Select
                    value={user.trust_level || 'active'}
                    onValueChange={(value) => updateTrustLevel(user.user_id, value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2"><UserCheck className="w-4 h-4" />Active</div>
                      </SelectItem>
                      <SelectItem value="verified">
                        <div className="flex items-center gap-2"><Shield className="w-4 h-4" />Verified</div>
                      </SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="suspended">
                        <div className="flex items-center gap-2"><UserX className="w-4 h-4" />Suspended</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
