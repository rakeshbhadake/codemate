import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { projectsAPI } from '../../utils/api';
import { Loader2, X, Upload, Github, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';

const PROJECT_CATEGORIES = [
  'Web App', 'Mobile App', 'API / Backend', 'CLI Tool', 'Library / Package',
  'Machine Learning', 'Data Science', 'DevOps', 'Game', 'Other'
];

const PROJECT_STATUSES = ['In Progress', 'Completed', 'On Hold', 'Archived'];

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  editProject?: any;
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function CreateProjectModal({ open, onOpenChange, onCreated, editProject }: CreateProjectModalProps) {
  const isEditing = !!editProject;
  const [form, setForm] = useState({
    title: editProject?.title || '',
    shortDescription: editProject?.shortDescription || '',
    description: editProject?.description || '',
    category: editProject?.category || 'Web App',
    status: editProject?.status || 'In Progress',
    githubUrl: editProject?.githubUrl || '',
    demoUrl: editProject?.demoUrl || '',
  });
  const [technologies, setTechnologies] = useState<string[]>(editProject?.technologies || []);
  const [tags, setTags] = useState<string[]>(editProject?.tags || []);
  const [techInput, setTechInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(editProject?.thumbnailUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const thumbnailRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.githubUrl && !isValidUrl(form.githubUrl)) errs.githubUrl = 'Invalid URL';
    if (form.demoUrl && !isValidUrl(form.demoUrl)) errs.demoUrl = 'Invalid URL';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addTech = () => {
    const t = techInput.trim();
    if (t && !technologies.includes(t)) {
      setTechnologies(prev => [...prev, t]);
    }
    setTechInput('');
  };

  const removeTech = (tech: string) => setTechnologies(prev => prev.filter(t => t !== tech));

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await projectsAPI.update(editProject.id, {
          ...form,
          technologies,
          tags,
        });
        toast.success('Project updated!');
      } else {
        const formData = new FormData();
        Object.entries(form).forEach(([k, v]) => formData.append(k, v));
        formData.append('technologies', JSON.stringify(technologies));
        formData.append('tags', JSON.stringify(tags));
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
        await projectsAPI.create(formData);
        toast.success('Project created!');
      }
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!isSubmitting) onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing ? 'Edit your project details.' : 'Add a new project to your profile.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Project Thumbnail</Label>
            <div
              className="relative w-full h-36 rounded-lg border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
              onClick={() => thumbnailRef.current?.click()}
            >
              {thumbnailPreview ? (
                <>
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
                    onClick={e => { e.stopPropagation(); setThumbnailFile(null); setThumbnailPreview(null); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Click to upload thumbnail</span>
                  <span className="text-xs">JPG, PNG, WEBP up to 5MB</span>
                </div>
              )}
            </div>
            <input ref={thumbnailRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="proj-title"
              placeholder="My Awesome Project"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Short Description */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-short-desc">Short Description</Label>
            <Input
              id="proj-short-desc"
              placeholder="One-line summary of the project"
              value={form.shortDescription}
              onChange={e => setForm(p => ({ ...p, shortDescription: e.target.value }))}
              maxLength={150}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Detailed Description</Label>
            <Textarea
              id="proj-desc"
              placeholder="Describe what the project does, your role, challenges, and learnings..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4}
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Technologies */}
          <div className="space-y-1.5">
            <Label>Technologies Used</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. React, Python, PostgreSQL"
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTech}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {technologies.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button type="button" onClick={() => removeTech(t)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* GitHub URL */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-github" className="flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5" /> GitHub Repository URL
            </Label>
            <Input
              id="proj-github"
              placeholder="https://github.com/username/repo"
              value={form.githubUrl}
              onChange={e => setForm(p => ({ ...p, githubUrl: e.target.value }))}
              className={errors.githubUrl ? 'border-destructive' : ''}
            />
            {errors.githubUrl && <p className="text-xs text-destructive">{errors.githubUrl}</p>}
          </div>

          {/* Demo URL */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-demo" className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Live Demo URL
            </Label>
            <Input
              id="proj-demo"
              placeholder="https://myproject.vercel.app"
              value={form.demoUrl}
              onChange={e => setForm(p => ({ ...p, demoUrl: e.target.value }))}
              className={errors.demoUrl ? 'border-destructive' : ''}
            />
            {errors.demoUrl && <p className="text-xs text-destructive">{errors.demoUrl}</p>}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. open-source, portfolio, ai"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <Badge key={t} variant="outline" className="gap-1">
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {isEditing ? 'Saving...' : 'Creating...'}</>
            ) : (
              isEditing ? 'Save Changes' : 'Create Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
