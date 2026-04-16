import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Download, History, Lock, Unlock,
  Shield, Calendar, User, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

export interface ReportVersion {
  id: string;
  version: number;
  file_url: string;
  file_size: number;
  uploaded_at: string;
  change_notes?: string;
}

export interface ConsultantReport {
  id: string;
  title: string;
  description?: string;
  format: string;
  current_version: number;
  file_url: string;
  file_size: number;
  uploader_name: string;
  created_at: string;
  updated_at: string;
  is_accessible: boolean;
  versions: ReportVersion[];
  access_count: number;
}

interface ReportCardProps {
  report: ConsultantReport;
  onDownload: (reportId: string, versionId?: string) => void;
  onManageAccess?: (reportId: string) => void;
  isOwner?: boolean;
}

const FORMAT_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileText,
  csv: FileText,
  zip: FileText,
};

const FORMAT_COLORS: Record<string, string> = {
  pdf: 'text-red-500 bg-red-500/10',
  docx: 'text-blue-500 bg-blue-500/10',
  xlsx: 'text-green-500 bg-green-500/10',
  csv: 'text-teal-500 bg-teal-500/10',
  zip: 'text-amber-500 bg-amber-500/10',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function ReportCard({ report, onDownload, onManageAccess, isOwner }: ReportCardProps) {
  const [showVersions, setShowVersions] = useState(false);
  const fmt = report.format.toLowerCase();
  const Icon = FORMAT_ICONS[fmt] || FileText;
  const colorClass = FORMAT_COLORS[fmt] || 'text-primary bg-primary/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className={`border-2 transition-all duration-300 ${
        report.is_accessible
          ? 'border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10'
          : 'border-border/50 opacity-70'
      }`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Format Icon */}
            <div className={`p-3 rounded-xl shrink-0 ${colorClass}`}>
              <Icon className="w-6 h-6" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-bold text-base group-hover:text-primary transition-colors truncate">
                  {report.title}
                </h4>
                <Badge variant="outline" className="text-xs shrink-0">
                  v{report.current_version}
                </Badge>
                <Badge variant="secondary" className="text-xs uppercase shrink-0">
                  {report.format}
                </Badge>
                {report.is_accessible ? (
                  <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-200 text-xs shrink-0">
                    <Unlock className="w-3 h-3" /> Accessible
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-red-500/10 text-red-500 border-red-200 text-xs shrink-0">
                    <Lock className="w-3 h-3" /> Restricted
                  </Badge>
                )}
              </div>

              {report.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{report.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {report.uploader_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(report.updated_at).toLocaleDateString()}
                </span>
                <span>{formatBytes(report.file_size)}</span>
                {isOwner && (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {report.access_count} accesses
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                disabled={!report.is_accessible && !isOwner}
                onClick={() => onDownload(report.id)}
                className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
              {isOwner && onManageAccess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onManageAccess(report.id)}
                  className="gap-2 hover:border-primary/50"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Access
                </Button>
              )}
            </div>
          </div>

          {/* Version History Toggle */}
          {report.versions.length > 1 && (
            <div className="mt-4 border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 h-7"
                onClick={() => setShowVersions(v => !v)}
              >
                <History className="w-3.5 h-3.5" />
                {report.versions.length} versions
                {showVersions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>

              {showVersions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2"
                >
                  {report.versions.map(v => (
                    <div key={v.id} className="flex items-center justify-between text-xs p-2.5 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-semibold">v{v.version}</span>
                        <span className="text-muted-foreground ml-2">{formatBytes(v.file_size)}</span>
                        {v.change_notes && (
                          <span className="text-muted-foreground ml-2 italic">— {v.change_notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {new Date(v.uploaded_at).toLocaleDateString()}
                        </span>
                        {(report.is_accessible || isOwner) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onDownload(report.id, v.id)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
