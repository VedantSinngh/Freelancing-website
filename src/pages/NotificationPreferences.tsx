import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Bell, Mail, BellRing, Shield, MessageSquare, DollarSign,
  FileText, AlertCircle, Save, CheckCircle
} from 'lucide-react';

interface NotificationPrefs {
  in_app_enabled: boolean;
  email_enabled: boolean;
  bid_notifications: boolean;
  message_notifications: boolean;
  report_notifications: boolean;
  system_notifications: boolean;
  invite_notifications: boolean;
  email_frequency: 'instant' | 'daily' | 'weekly';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  in_app_enabled: true,
  email_enabled: true,
  bid_notifications: true,
  message_notifications: true,
  report_notifications: true,
  system_notifications: true,
  invite_notifications: true,
  email_frequency: 'instant',
};

const NOTIFICATION_TYPES = [
  { key: 'bid_notifications', label: 'Bids & Proposals', description: 'When bids are submitted, accepted, or rejected', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  { key: 'message_notifications', label: 'Messages', description: 'New chat messages in your projects', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'report_notifications', label: 'Reports & Documents', description: 'When new reports are uploaded or shared with you', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { key: 'invite_notifications', label: 'Collaboration Invites', description: 'Project collaboration invitations', icon: Bell, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'system_notifications', label: 'System Alerts', description: 'Platform updates and important notices', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
] as const;

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...DEFAULT_PREFS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPrefs();
  }, [user?.id]);

  const fetchPrefs = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', user.id).single();
      if (data) setPrefs(data);
    } catch { /* table may not exist — use defaults */ }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('notification_preferences').upsert({ ...prefs, user_id: user.id });
      if (error) throw error;
      setSaved(true);
      toast({ title: 'Preferences saved!', description: 'Your notification settings have been updated.' });
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not save preferences (table may not exist yet)', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof NotificationPrefs) =>
    setPrefs(p => ({ ...p, [key]: !p[key] }));

  if (loading) {
    return (
      <DashboardLayout title="Notification Preferences">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Notification Preferences">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <BellRing className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notification Preferences</h1>
              <p className="text-muted-foreground text-sm">Control how and when you receive alerts</p>
            </div>
          </div>
        </motion.div>

        {/* Channels */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-5 h-5 text-primary" /> Delivery Channels
              </CardTitle>
              <CardDescription>Choose where you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><Bell className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="font-semibold text-sm">In-App Notifications</p>
                    <p className="text-xs text-muted-foreground">Bell icon in the navigation bar</p>
                  </div>
                </div>
                <Switch checked={prefs.in_app_enabled} onCheckedChange={() => toggle('in_app_enabled')} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Mail className="w-4 h-4 text-blue-500" /></div>
                  <div>
                    <p className="font-semibold text-sm">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Sent to {user?.email}</p>
                  </div>
                </div>
                <Switch checked={prefs.email_enabled} onCheckedChange={() => toggle('email_enabled')} />
              </div>

              {prefs.email_enabled && (
                <div className="p-4 border border-blue-100 dark:border-blue-900/30 rounded-xl space-y-2">
                  <Label className="text-sm">Email Frequency</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['instant', 'daily', 'weekly'] as const).map(freq => (
                      <button
                        key={freq}
                        onClick={() => setPrefs(p => ({ ...p, email_frequency: freq }))}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${prefs.email_frequency === freq
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'border-border hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {prefs.email_frequency === 'instant' ? 'Emails sent immediately as events occur'
                      : prefs.email_frequency === 'daily' ? 'One digest email per day at 9 AM'
                        : 'One digest email per week on Monday'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Types */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-secondary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-5 h-5 text-secondary" /> Notification Types
              </CardTitle>
              <CardDescription>Choose which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {NOTIFICATION_TYPES.map(({ key, label, description, icon: Icon, color, bg }, idx) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${bg} rounded-lg`}><Icon className={`w-4 h-4 ${color}`} /></div>
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!prefs[key as keyof NotificationPrefs]}
                    onCheckedChange={() => toggle(key as keyof NotificationPrefs)}
                    disabled={!prefs.in_app_enabled && !prefs.email_enabled}
                  />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quiet Hours */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-2 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-5 h-5 text-accent" /> Quiet Hours
              </CardTitle>
              <CardDescription>Pause notifications during specific hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={prefs.quiet_hours_start || ''} onChange={e => setPrefs(p => ({ ...p, quiet_hours_start: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={prefs.quiet_hours_end || ''} onChange={e => setPrefs(p => ({ ...p, quiet_hours_end: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Leave blank to receive notifications at all hours</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Button onClick={handleSave} disabled={saving} className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 gap-3 text-base">
            {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Preferences'}
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
