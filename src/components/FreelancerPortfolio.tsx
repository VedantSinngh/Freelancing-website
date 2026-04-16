import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Plus, Edit, Trash2, ExternalLink, Github, FolderOpen, X
} from 'lucide-react';

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  image_url?: string;
  github_url?: string;
  live_url?: string;
  created_at: string;
}

interface FreelancerPortfolioProps {
  items: PortfolioItem[];
  canEdit: boolean;
  onAdd: (item: Omit<PortfolioItem, 'id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, item: Partial<PortfolioItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EMPTY_ITEM = {
  title: '',
  description: '',
  tech_stack: [] as string[],
  image_url: '',
  github_url: '',
  live_url: '',
};

export function FreelancerPortfolio({ items, canEdit, onAdd, onUpdate, onDelete }: FreelancerPortfolioProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PortfolioItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ITEM });
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && techInput.trim()) {
      e.preventDefault();
      if (!form.tech_stack.includes(techInput.trim())) {
        setForm({ ...form, tech_stack: [...form.tech_stack, techInput.trim()] });
      }
      setTechInput('');
    }
  };

  const removeTech = (t: string) => setForm({ ...form, tech_stack: form.tech_stack.filter(s => s !== t) });

  const handleAdd = async () => {
    setSaving(true);
    await onAdd(form);
    setSaving(false);
    setForm({ ...EMPTY_ITEM });
    setAddOpen(false);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditTarget(item);
    setForm({
      title: item.title,
      description: item.description,
      tech_stack: [...item.tech_stack],
      image_url: item.image_url || '',
      github_url: item.github_url || '',
      live_url: item.live_url || '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSaving(true);
    await onUpdate(editTarget.id, form);
    setSaving(false);
    setEditOpen(false);
    setEditTarget(null);
  };

  const FormFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Project Title *</Label>
        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="My Awesome Project" />
      </div>
      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What does this project do?" />
      </div>
      <div className="space-y-2">
        <Label>Tech Stack (press Enter to add)</Label>
        <Input
          value={techInput}
          onChange={e => setTechInput(e.target.value)}
          onKeyDown={addTech}
          placeholder="React, Node.js, etc."
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {form.tech_stack.map(t => (
            <Badge key={t} className="gap-1 bg-primary/10 text-primary border border-primary/20">
              {t}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeTech(t)} />
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>GitHub URL</Label>
          <Input value={form.github_url} onChange={e => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/..." />
        </div>
        <div className="space-y-2">
          <Label>Live URL</Label>
          <Input value={form.live_url} onChange={e => setForm({ ...form, live_url: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Cover Image URL</Label>
        <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 gap-2">
                <Plus className="w-4 h-4" /> Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary" /> Add Portfolio Project</DialogTitle>
                <DialogDescription>Showcase your work to potential clients</DialogDescription>
              </DialogHeader>
              {FormFields}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={saving || !form.title} className="bg-gradient-to-r from-primary to-secondary">
                  {saving ? 'Saving…' : 'Add Project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground text-lg">No portfolio projects yet</p>
          {canEdit && <p className="text-sm text-muted-foreground mt-1">Click "Add Project" to showcase your work</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                  {item.image_url && (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{item.title}</h4>
                      {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {item.tech_stack.map(t => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      {item.github_url && (
                        <a href={item.github_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <Github className="w-4 h-4" /> Code
                        </a>
                      )}
                      {item.live_url && (
                        <a href={item.live_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="w-4 h-4" /> Live Demo
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Portfolio Project</DialogTitle>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving} className="bg-gradient-to-r from-primary to-secondary">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
