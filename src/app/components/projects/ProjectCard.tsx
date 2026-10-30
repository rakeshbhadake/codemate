import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { projectsAPI } from '../../utils/api';
import { useAuth } from '../../utils/auth-context';
import { Github, ExternalLink, Trash2, Edit3, Briefcase, CheckCircle2, Clock } from 'lucide-react';

interface ProjectCardProps {
  project: any;
  onUpdate?: () => void;
  onEdit?: (project: any) => void;
  compact?: boolean;
}

export function ProjectCard({ project, onUpdate, onEdit, compact = false }: ProjectCardProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwner = user?.id === project.authorId;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await projectsAPI.delete(project.id);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusIcon = project.status === 'Completed'
    ? <CheckCircle2 className="w-3 h-3" />
    : <Clock className="w-3 h-3" />;

  const statusVariant = project.status === 'Completed' ? 'default' : 'secondary';

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {project.thumbnailUrl && (
        <div className="w-full h-40 overflow-hidden bg-muted">
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {!project.thumbnailUrl && (
        <div className="w-full h-32 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 flex items-center justify-center">
          <Briefcase className="w-12 h-12 text-muted-foreground/30" />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-base">{project.title}</h3>
            {project.category && (
              <p className="text-xs text-muted-foreground">{project.category}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant={statusVariant} className="text-xs gap-1">
              {statusIcon}
              {project.status || 'In Progress'}
            </Badge>
            {isOwner && (
              <div className="flex items-center gap-0.5 ml-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(project)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{project.title}"? This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {project.shortDescription && !compact && (
          <p className="text-sm text-muted-foreground line-clamp-2">{project.shortDescription}</p>
        )}

        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.technologies.slice(0, 5).map((tech: string) => (
              <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
            ))}
            {project.technologies.length > 5 && (
              <Badge variant="outline" className="text-xs">+{project.technologies.length - 5}</Badge>
            )}
          </div>
        )}

        {(project.githubUrl || project.demoUrl) && (
          <div className="flex items-center gap-2 pt-1">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Live Demo
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
