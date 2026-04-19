import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  Bell, BellRing, Check, CheckCheck, Trash2, Settings,
  MessageSquare, DollarSign, FileText, AlertCircle, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'bid' | 'report' | 'system' | 'invite';
  title: string;
  body: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

const TYPE_CONFIG = {
  message: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  bid: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  report: { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  system: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  invite: { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// Helper to create a notification (call from anywhere in the app)
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  body: string,
  link?: string
) {
  try {
    await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId, type, title, body, link })
    });
  } catch (e) {
    console.warn('Failed to create notification:', e);
  }
}

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unread = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/notifications`, {
          headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setNotifications(data || []);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();

    if (!user?.id) return;

    // Periodic refetch as fallback for real-time
    const interval = setInterval(fetchNotifications, 30000); // 30s
    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications]);

  const markRead = async (id: string) => {
    try {
        await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { /* silent */ }
  };

  const markAllRead = async () => {
    try {
        await fetch(`${API_URL}/notifications/read-all`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { /* silent */ }
  };

  const deleteNotification = async (id: string) => {
    try {
        await fetch(`${API_URL}/notifications/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) { /* silent */ }
  };

  const handleClick = (n: Notification) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full hover:bg-primary/10 transition-colors"
        onClick={() => setOpen(v => !v)}
        id="notification-bell"
      >
        <motion.div
          animate={unread > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
        >
          {unread > 0 ? <BellRing className="w-5 h-5 text-primary" /> : <Bell className="w-5 h-5" />}
        </motion.div>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-96 max-h-[32rem] overflow-hidden flex flex-col rounded-2xl border border-border bg-card shadow-2xl shadow-black/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Notifications</span>
                  {unread > 0 && (
                    <Badge className="text-[10px] h-5 px-1.5 bg-red-500">{unread}</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {unread > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
                      <CheckCheck className="w-3 h-3" /> All read
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigate('/notifications/preferences'); setOpen(false); }}>
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-14">
                    <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-muted-foreground text-sm">You're all caught up!</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {notifications.map((n, idx) => {
                      const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => handleClick(n)}
                          className={`group flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/60 transition-colors border-l-2 ${n.is_read ? 'border-transparent' : 'border-primary bg-primary/[0.02]'}`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${cfg.bg}`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${n.is_read ? 'text-muted-foreground' : ''}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {!n.is_read && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); markRead(n.id); }}>
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
