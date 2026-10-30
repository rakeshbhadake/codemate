import React, { useState, useMemo } from 'react';
import { useAuth } from '../../utils/auth-context';
import { eventsAPI } from '../../utils/api';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ShareModal } from './ShareModal';
import { EventRegistrationModal } from './EventRegistrationModal';
import { EventRegistrationsView } from './EventRegistrationsView';
import {
  Heart, MessageCircle, Calendar, MapPin, ExternalLink,
  Trash2, Share2, Users, Trophy, ClipboardList, Tag,
  Monitor, Wifi, WifiOff, AlertCircle
} from 'lucide-react';

interface EventCardProps {
  event: any;
  onCommentClick: (event: any) => void;
  onUpdate: () => void;
}

export function EventCard({ event, onCommentClick, onUpdate }: EventCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRegistrationsView, setShowRegistrationsView] = useState(false);
  const [showFullProblem, setShowFullProblem] = useState(false);

  const isAuthor = user?.id === event.authorId;

  // Merge backend event data with locally-stored settings (minTeamSize, maxTeamSize, etc.)
  // because the backend may not return these fields for existing events.
  const enrichedEvent = useMemo(() => {
    try {
      const stored = localStorage.getItem(`event_settings_${event.id}`);
      if (stored) {
        const settings = JSON.parse(stored);
        return { ...event, ...settings };
      }
    } catch {}
    return event;
  }, [event]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      if (event.isLiked) {
        await eventsAPI.unlike(event.id);
      } else {
        await eventsAPI.like(event.id);
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to like/unlike event:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await eventsAPI.delete(event.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRegistrationStatus = () => {
    if (!event.registrationDeadline) return null;
    const now = new Date();
    const deadline = new Date(event.registrationDeadline);
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (now > deadline) return { label: 'Registration Closed', variant: 'secondary' as const };
    if (hoursLeft <= 24) return { label: 'Closing Soon', variant: 'destructive' as const };
    return { label: 'Registration Open', variant: 'default' as const };
  };

  const getModeIcon = (mode?: string) => {
    if (!mode) return null;
    const m = mode.toLowerCase();
    if (m === 'online') return <Wifi className="w-3 h-3" />;
    if (m === 'offline') return <WifiOff className="w-3 h-3" />;
    return <Monitor className="w-3 h-3" />;
  };

  const regStatus = getRegistrationStatus();
  const canRegister = !isAuthor && (!event.registrationDeadline || new Date(event.registrationDeadline) > new Date());
  const teamSizeLabel = event.minTeamSize && event.maxTeamSize
    ? `${event.minTeamSize}–${event.maxTeamSize} members`
    : event.minTeamSize ? `Min ${event.minTeamSize} member${event.minTeamSize !== 1 ? 's' : ''}`
    : event.maxTeamSize ? `Max ${event.maxTeamSize} member${event.maxTeamSize !== 1 ? 's' : ''}`
    : null;

  return (
    <Card>
      <CardContent className="p-0 overflow-hidden space-y-0">
        {/* Banner */}
        {event.bannerUrl && (
          <div className="w-full h-48 overflow-hidden">
            <img
              src={event.bannerUrl}
              alt={`${event.title} banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Author Info */}
          <div className="flex items-start gap-3">
            <Avatar>
              {event.author?.profilePicture && (
                <AvatarImage src={event.author.profilePicture} alt={event.author.name || 'User'} />
              )}
              <AvatarFallback>
                {getInitials(event.author?.name || event.author?.username || event.author?.email?.split('@')[0] || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p>
                {event.author?.name || event.author?.username || event.author?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-sm text-muted-foreground">
                {event.date || event.createdAt
                  ? new Date(event.createdAt).toLocaleDateString()
                  : ''}
              </p>
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              {event.category && (
                <Badge variant="outline" className="text-xs">{event.category}</Badge>
              )}
              {event.mode && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {getModeIcon(event.mode)}
                  {event.mode}
                </Badge>
              )}
              {regStatus && (
                <Badge variant={regStatus.variant} className="text-xs">{regStatus.label}</Badge>
              )}
            </div>

            {/* Delete (author only) */}
            {isAuthor && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive ml-1">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this event? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Event Content */}
          <div className="space-y-3">
            <h3>{event.title}</h3>
            <p className="text-muted-foreground">{event.description}</p>

            {/* Problem Statement preview */}
            {event.problemStatement && (
              <div className="rounded-md bg-muted/50 p-3 border border-border space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Problem Statement
                </p>
                <p className={`text-sm ${!showFullProblem ? 'line-clamp-3' : ''}`}>
                  {event.problemStatement}
                </p>
                {event.problemStatement.length > 200 && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowFullProblem(!showFullProblem)}
                  >
                    {showFullProblem ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Event Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
              </div>

              {event.registrationDeadline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="w-4 h-4" />
                  <span>Registration deadline: {formatDate(event.registrationDeadline)}</span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}

              {event.locationLink && (
                <div className="flex items-center gap-2">
                  <a
                    href={event.locationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-4 h-4" />
                    📍 Open Event Location
                  </a>
                </div>
              )}

              {event.link && (
                <div className="flex items-center gap-2">
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Event Link
                  </a>
                </div>
              )}

              {/* Team size + registrations row */}
              <div className="flex items-center gap-4 flex-wrap">
                {teamSizeLabel && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{teamSizeLabel}</span>
                  </div>
                )}
                {event.registrationCount !== undefined && event.registrationCount !== null && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <ClipboardList className="w-4 h-4" />
                    <span>{event.registrationCount} team{event.registrationCount !== 1 ? 's' : ''} registered</span>
                  </div>
                )}
                {event.prizePool && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                    <span>{event.prizePool}</span>
                  </div>
                )}
              </div>

              {/* Eligibility */}
              {event.eligibility && event.eligibility !== 'Open to everyone' && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  <span>{event.eligibility}</span>
                </div>
              )}
            </div>

            {/* Technologies */}
            {event.technologies && event.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {event.technologies.map((tech: string) => (
                  <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                ))}
              </div>
            )}

            {/* Required Skills */}
            {event.requiredSkills && event.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.requiredSkills.map((skill: string) => (
                  <Badge key={skill} variant="outline">#{skill}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className="gap-2"
            >
              <Heart className={`w-4 h-4 ${event.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{event.likes || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCommentClick(event)}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{event.commentCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="gap-1"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <div className="flex-1" />

            {/* Organizer: View Registrations */}
            {isAuthor && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowRegistrationsView(true)}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Registrations
              </Button>
            )}

            {/* Register button */}
            {!isAuthor && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setShowRegisterModal(true)}
                disabled={!canRegister}
                title={!canRegister ? 'Registration is closed' : undefined}
              >
                <Users className="w-3.5 h-3.5" />
                {canRegister ? 'Register' : 'Closed'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        itemId={event.id}
        itemType="event"
        title={event.title}
      />

      <EventRegistrationModal
        open={showRegisterModal}
        onOpenChange={setShowRegisterModal}
        event={enrichedEvent}
        onRegistered={onUpdate}
      />

      <EventRegistrationsView
        open={showRegistrationsView}
        onOpenChange={setShowRegistrationsView}
        event={enrichedEvent}
      />
    </Card>
  );
}
