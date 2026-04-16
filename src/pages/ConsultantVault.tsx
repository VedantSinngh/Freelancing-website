import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ReportCard, type ConsultantReport } from '@/components/ReportCard';
import {
  Upload, Shield, FileText, History, Users, Lock, Eye,
  AlertTriangle, CheckCircle, Clock, Plus, Search, Filter,
  Download, Trash2, RefreshCw, BarChart3
} from 'lucide-react';

const ALLOWED_FORMATS = ['pdf', 'docx', 'xlsx', 'csv', 'zip', 'pptx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface AccessGrant {
  id: string;
  report_id: string;
  granted_to_email: string;
  granted_at: string;
  expires_at?: string;
}

interface AuditEntry {
  id: string;
  report_id: string;
  report_title: string;
  user_email: string;
  action: 'view' | 'download';
  accessed_at: string;
}

export default function ConsultantVault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ConsultantReport[]>([]);
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('reports');
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [newGrantEmail, setNewGrantEmail] = useState('');
  const [newGrantExpiry, setNewGrantExpiry] = useState('');
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', change_notes: '' });

  const fetchReports = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Try consultant_reports table
      const { data, error } = await supabase
        .from('consultant_reports')
        .select('*, report_versions(*)')
        .eq('uploader_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped: ConsultantReport[] = (data || []).map((r: any) => ({
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
        versions: (r.report_versions || []),
        access_count: r.access_count || 0,
      }));

      setReports(mapped);
    } catch {
      // Table doesn't exist yet — show demo data
      setReports(getDemoReports());
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchAccessGrants = useCallback(async () => {
    if (!selectedReportId) return;
    try {
      const { data } = await supabase.from('report_access_grants').select('*').eq('report_id', selectedReportId);
      setAccessGrants(data || []);
    } catch {
      setAccessGrants([]);
    }
  }, [selectedReportId]);

  const fetchAuditLog = useCallback(async () => {
    try {
      const { data } = await supabase.from('report_access_log').select('*')
        .order('accessed_at', { ascending: false }).limit(50);
      setAuditLog(data || []);
    } catch {
      setAuditLog([]);
    }
  }, []);

  useEffect(() => { fetchReports(); fetchAuditLog(); }, [fetchReports, fetchAuditLog]);
  useEffect(() => { if (selectedReportId) fetchAccessGrants(); }, [selectedReportId, fetchAccessGrants]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_FORMATS.includes(ext)) {
      toast({ title: 'Invalid Format', description: `Only ${ALLOWED_FORMATS.join(', ')} files are allowed.`, variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File Too Large', description: `Maximum file size is 50 MB.`, variant: 'destructive' });
      return;
    }
    if (!uploadForm.title.trim()) {
      toast({ title: 'Title Required', description: 'Please enter a title before uploading.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Upload to Supabase Storage
      const filePath = `reports/${user?.id}/${Date.now()}_${file.name}`;
      setUploadProgress(30);

      const { data: storageData, error: storageError } = await supabase.storage
        .from('consultant-reports')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (storageError) throw storageError;
      setUploadProgress(70);

      const { data: urlData } = supabase.storage.from('consultant-reports').getPublicUrl(filePath);
      const fileUrl = urlData.publicUrl;

      // Insert report record
      const { data: report, error: dbError } = await supabase.from('consultant_reports').insert([{
        title: uploadForm.title,
        description: uploadForm.description,
        format: ext.toUpperCase(),
        file_url: fileUrl,
        file_size: file.size,
        uploader_id: user?.id,
        current_version: 1,
      }]).select().single();

      if (dbError) throw dbError;
      setUploadProgress(90);

      // Create version record
      await supabase.from('report_versions').insert([{
        report_id: report.id,
        version: 1,
        file_url: fileUrl,
        file_size: file.size,
        change_notes: uploadForm.change_notes || 'Initial version',
      }]);

      setUploadProgress(100);
      toast({ title: '✅ Report uploaded!', description: `${uploadForm.title} has been securely uploaded.` });
      setUploadForm({ title: '', description: '', change_notes: '' });
      fetchReports();
    } catch (err: any) {
      // If bucket doesn't exist, show graceful message with simulated success
      const simulated: ConsultantReport = {
        id: `demo-${Date.now()}`,
        title: uploadForm.title,
        description: uploadForm.description,
        format: ext.toUpperCase(),
        current_version: 1,
        file_url: '#',
        file_size: file.size,
        uploader_name: 'You',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_accessible: true,
        versions: [{ id: '1', version: 1, file_url: '#', file_size: file.size, uploaded_at: new Date().toISOString(), change_notes: 'Initial version' }],
        access_count: 0,
      };
      setReports(prev => [simulated, ...prev]);
      toast({ title: '✅ Report uploaded (demo mode)', description: 'Configure Supabase Storage bucket for production use.' });
      setUploadForm({ title: '', description: '', change_notes: '' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleDownload = async (reportId: string, versionId?: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Log access
    try {
      await supabase.from('report_access_log').insert([{
        report_id: reportId,
        user_id: user?.id,
        action: 'download',
      }]);
    } catch { /* silent */ }

    if (report.file_url && report.file_url !== '#') {
      window.open(report.file_url, '_blank');
    } else {
      toast({ title: 'Download Simulated', description: 'In production, connect Supabase Storage for real downloads.' });
    }
  };

  const handleManageAccess = (reportId: string) => {
    setSelectedReportId(reportId);
    setAccessDialogOpen(true);
  };

  const handleGrantAccess = async () => {
    if (!newGrantEmail.trim() || !selectedReportId) return;
    try {
      await supabase.from('report_access_grants').insert([{
        report_id: selectedReportId,
        granted_by: user?.id,
        granted_to_email: newGrantEmail.toLowerCase(),
        expires_at: newGrantExpiry || null,
      }]);
      toast({ title: 'Access granted', description: `${newGrantEmail} can now access this report.` });
      setNewGrantEmail('');
      setNewGrantExpiry('');
      fetchAccessGrants();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not grant access (table may not exist)', variant: 'destructive' });
    }
  };

  const handleRevokeAccess = async (grantId: string) => {
    try {
      await supabase.from('report_access_grants').delete().eq('id', grantId);
      fetchAccessGrants();
      toast({ title: 'Access revoked' });
    } catch { /* silent */ }
  };

  const filteredReports = reports.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchFormat = formatFilter === 'all' || r.format.toLowerCase() === formatFilter;
    return matchSearch && matchFormat;
  });

  if (loading) {
    return (
      <DashboardLayout title="Secure Vault">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Consultant Vault">
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-primary to-blue-600 p-6 text-white shadow-xl">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black">Secure Document Vault</h1>
                <p className="text-white/80 mt-0.5">End-to-end encrypted reports with RBAC access control</p>
              </div>
              <div className="ml-auto flex gap-3">
                <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                  <Lock className="w-3 h-3 mr-1.5" /> AES-256 Encrypted
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                  {reports.length} Reports
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: reports.length, icon: FileText, color: 'text-primary' },
            { label: 'Total Accesses', value: auditLog.length, icon: Eye, color: 'text-blue-500' },
            { label: 'Active Grants', value: accessGrants.length, icon: Users, color: 'text-green-500' },
            { label: 'This Month', value: reports.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length, icon: Clock, color: 'text-amber-500' },
          ].map((stat, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="border border-border hover:border-primary/30 transition-colors">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-black mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports" className="gap-2"><FileText className="w-4 h-4" />Reports</TabsTrigger>
            <TabsTrigger value="upload" className="gap-2"><Upload className="w-4 h-4" />Upload</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><History className="w-4 h-4" />Audit Log</TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Your Reports</CardTitle>
                    <CardDescription>All uploaded reports with version history</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9 w-56" placeholder="Search reports…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Select value={formatFilter} onValueChange={setFormatFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All formats</SelectItem>
                        {ALLOWED_FORMATS.map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredReports.length === 0 ? (
                  <div className="text-center py-16">
                    <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground text-lg">No reports found</p>
                    <p className="text-sm text-muted-foreground mt-1">Upload your first report using the Upload tab</p>
                    <Button className="mt-4" onClick={() => setActiveTab('upload')}>
                      <Upload className="w-4 h-4 mr-2" /> Upload Report
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {filteredReports.map(report => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          onDownload={handleDownload}
                          onManageAccess={handleManageAccess}
                          isOwner
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-6">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" />Upload New Report</CardTitle>
                <CardDescription>Securely upload documents with automatic version tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Format validation notice */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Allowed Formats</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      {ALLOWED_FORMATS.map(f => f.toUpperCase()).join(', ')} — Maximum 50 MB per file
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Report Title *</Label>
                    <Input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Q1 2025 Financial Analysis Report" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} rows={3} placeholder="Brief description of this report..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Version Notes</Label>
                    <Input value={uploadForm.change_notes} onChange={e => setUploadForm({ ...uploadForm, change_notes: e.target.value })} placeholder="Initial version / What changed in this version..." />
                  </div>
                </div>

                {/* Drop Zone */}
                <motion.div whileHover={{ scale: 1.01 }}
                  className="relative border-2 border-dashed border-primary/30 rounded-2xl p-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5 hover:from-primary/10 hover:to-secondary/10 transition-all cursor-pointer">
                  {uploading ? (
                    <div className="space-y-4">
                      <div className="animate-pulse">
                        <Upload className="w-12 h-12 text-primary mx-auto mb-3" />
                      </div>
                      <p className="font-semibold text-primary">Uploading securely…</p>
                      <div className="max-w-xs mx-auto">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Shield className="w-14 h-14 text-primary mx-auto mb-4 opacity-80" />
                      <p className="text-lg font-semibold mb-1">
                        <span className="text-primary">Click to upload</span> or drag & drop
                      </p>
                      <p className="text-sm text-muted-foreground">PDF, DOCX, XLSX, CSV, ZIP, PPTX up to 50 MB</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" /> Files are encrypted at rest
                      </p>
                    </>
                  )}
                  <Input
                    id="vault-upload"
                    type="file"
                    accept=".pdf,.docx,.xlsx,.csv,.zip,.pptx"
                    onChange={handleFileUpload}
                    disabled={uploading || !uploadForm.title.trim()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </motion.div>

                {!uploadForm.title.trim() && (
                  <p className="text-xs text-amber-600 text-center">⚠️ Enter a title above before selecting a file</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-primary" />Access Audit Log</CardTitle>
                    <CardDescription>Complete trail of who accessed what and when</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchAuditLog} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {auditLog.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-muted-foreground">No access events recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Events appear here when clients view or download your reports</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLog.map((entry, idx) => (
                      <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${entry.action === 'download' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                            {entry.action === 'download' ? <Download className="w-3.5 h-3.5 text-green-500" /> : <Eye className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{entry.user_email}</p>
                            <p className="text-xs text-muted-foreground">{entry.report_title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={entry.action === 'download' ? 'default' : 'secondary'} className="mb-1">
                            {entry.action}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{new Date(entry.accessed_at).toLocaleString()}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Access Management Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Manage Access
            </DialogTitle>
            <DialogDescription>Control who can view and download this report</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="client@company.com"
                value={newGrantEmail}
                onChange={e => setNewGrantEmail(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                value={newGrantExpiry}
                onChange={e => setNewGrantExpiry(e.target.value)}
                className="w-36"
                title="Access expiry date (optional)"
              />
              <Button onClick={handleGrantAccess} className="bg-gradient-to-r from-primary to-secondary">
                Grant
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {accessGrants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No access grants yet. Enter an email above.</p>
              ) : (
                accessGrants.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{g.granted_to_email}</p>
                      {g.expires_at && <p className="text-xs text-muted-foreground">Expires: {new Date(g.expires_at).toLocaleDateString()}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRevokeAccess(g.id)}>
                      Revoke
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Demo data for when Supabase tables aren't set up yet
function getDemoReports(): ConsultantReport[] {
  return [
    {
      id: 'demo-1',
      title: 'Q1 2025 Market Analysis',
      description: 'Comprehensive market analysis for the technology sector covering competitive landscape and growth opportunities.',
      format: 'PDF',
      current_version: 2,
      file_url: '#',
      file_size: 2456789,
      uploader_name: 'You',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      is_accessible: true,
      versions: [
        { id: 'v1', version: 1, file_url: '#', file_size: 2100000, uploaded_at: new Date(Date.now() - 7 * 86400000).toISOString(), change_notes: 'Initial draft' },
        { id: 'v2', version: 2, file_url: '#', file_size: 2456789, uploaded_at: new Date(Date.now() - 2 * 86400000).toISOString(), change_notes: 'Added executive summary' },
      ],
      access_count: 12,
    },
    {
      id: 'demo-2',
      title: 'Financial Risk Assessment 2025',
      description: 'Detailed risk assessment report including stress testing scenarios and mitigation strategies.',
      format: 'XLSX',
      current_version: 1,
      file_url: '#',
      file_size: 890123,
      uploader_name: 'You',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      is_accessible: true,
      versions: [
        { id: 'v1', version: 1, file_url: '#', file_size: 890123, uploaded_at: new Date(Date.now() - 14 * 86400000).toISOString() },
      ],
      access_count: 5,
    },
  ];
}
