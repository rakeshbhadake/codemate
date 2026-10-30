import React, { useState, useEffect, useRef } from 'react';
import { eventsAPI } from '../../utils/api';
import { EventCard } from './EventCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Loader2, Calendar, X, Upload, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

const PROBLEM_STATEMENT_MIN = 50;

const EVENT_CATEGORIES = [
  'Hackathon', 'Coding Contest', 'Workshop', 'Webinar',
  'Meetup', 'Startup Pitch', 'Conference', 'Bootcamp', 'Other'
];

const EVENT_MODES = ['Online', 'Offline', 'Hybrid'];

const ELIGIBILITY_OPTIONS = [
  'Open to everyone', 'College students', 'Freshers',
  'Professionals', 'School students', 'Specific institution'
];

interface FeedProps {
  openCreateModal?: boolean;
}

export function Feed({ openCreateModal }: FeedProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // Core event fields
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    problemStatement: '',
    date: '',
    location: '',
    locationLink: '',
    link: '',
    requiredSkills: [] as string[],
    minTeamSize: '1',
    maxTeamSize: '5',
    // Additional fields
    registrationDeadline: '',
    maxTeams: '',
    prizePool: '',
    eligibility: 'Open to everyone',
    mode: 'Online',
    category: 'Hackathon',
    technologies: [] as string[],
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [newTech, setNewTech] = useState('');
  const [locationLinkError, setLocationLinkError] = useState('');
  const [teamSizeError, setTeamSizeError] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (openCreateModal) setShowCreateModal(true);
  }, [openCreateModal]);

  const loadEvents = async () => {
    try {
      const result = await eventsAPI.getAll();
      setEvents(result.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validateTeamSize = (min: string, max: string) => {
    const minVal = parseInt(min);
    const maxVal = parseInt(max);
    if (isNaN(minVal) || minVal < 1 || minVal > 20) {
      return 'Minimum team size must be between 1 and 20';
    }
    if (isNaN(maxVal) || maxVal < 1 || maxVal > 20) {
      return 'Maximum team size must be between 1 and 20';
    }
    if (maxVal < minVal) {
      return 'Maximum team size must be greater than or equal to minimum';
    }
    return '';
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newEvent.title.trim() || !newEvent.description.trim() || !newEvent.date) {
      setError('Please fill in all required fields (Title, Description, Date & Time)');
      return;
    }

    if (!newEvent.problemStatement.trim()) {
      setError('Problem Statement is required');
      return;
    }
    if (newEvent.problemStatement.trim().length < PROBLEM_STATEMENT_MIN) {
      setError(`Problem Statement must be at least ${PROBLEM_STATEMENT_MIN} characters`);
      return;
    }

    const teamSizeErr = validateTeamSize(newEvent.minTeamSize, newEvent.maxTeamSize);
    if (teamSizeErr) {
      setTeamSizeError(teamSizeErr);
      setError(teamSizeErr);
      return;
    }

    if (newEvent.locationLink.trim()) {
      try { new URL(newEvent.locationLink.trim()); }
      catch { setError('Event location link must be a valid URL'); return; }
    }

    setIsCreating(true);
    try {
      await eventsAPI.create({
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        problemStatement: newEvent.problemStatement.trim(),
        date: newEvent.date,
        location: newEvent.location.trim(),
        locationLink: newEvent.locationLink.trim(),
        link: newEvent.link.trim(),
        requiredSkills: newEvent.requiredSkills,
        minTeamSize: parseInt(newEvent.minTeamSize),
        maxTeamSize: parseInt(newEvent.maxTeamSize),
        registrationDeadline: newEvent.registrationDeadline || null,
        maxTeams: newEvent.maxTeams ? parseInt(newEvent.maxTeams) : null,
        prizePool: newEvent.prizePool.trim() || null,
        eligibility: newEvent.eligibility,
        mode: newEvent.mode,
        category: newEvent.category,
        technologies: newEvent.technologies,
      }, bannerFile || undefined);

      // Persist team-size settings locally so the registration modal can read
      // them even if the backend doesn't return these fields in event listings.
      try {
        const result2 = await eventsAPI.getAll();
        const created = (result2.events || []).find(
          (e: any) => e.title === newEvent.title.trim()
        );
        const eventId = created?.id;
        if (eventId) {
          localStorage.setItem(
            `event_settings_${eventId}`,
            JSON.stringify({
              minTeamSize: parseInt(newEvent.minTeamSize) || 1,
              maxTeamSize: parseInt(newEvent.maxTeamSize) || 5,
              registrationDeadline: newEvent.registrationDeadline || null,
              maxTeams: newEvent.maxTeams ? parseInt(newEvent.maxTeams) : null,
            })
          );
        }
      } catch {
        // non-critical — settings will fall back to defaults
      }

      toast.success('Event created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadEvents();
    } catch (error: any) {
      setError(error.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewEvent({
      title: '', description: '', problemStatement: '', date: '',
      location: '', locationLink: '', link: '', requiredSkills: [],
      minTeamSize: '1', maxTeamSize: '5',
      registrationDeadline: '', maxTeams: '', prizePool: '',
      eligibility: 'Open to everyone', mode: 'Online', category: 'Hackathon',
      technologies: [],
    });
    setBannerFile(null);
    setBannerPreview(null);
    setNewSkill('');
    setNewTech('');
    setLocationLinkError('');
    setTeamSizeError('');
    setShowAdditional(false);
  };

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !newEvent.requiredSkills.includes(s)) {
      setNewEvent(prev => ({ ...prev, requiredSkills: [...prev.requiredSkills, s] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setNewEvent(prev => ({ ...prev, requiredSkills: prev.requiredSkills.filter(s => s !== skill) }));
  };

  const addTech = () => {
    const t = newTech.trim();
    if (t && !newEvent.technologies.includes(t)) {
      setNewEvent(prev => ({ ...prev, technologies: [...prev.technologies, t] }));
      setNewTech('');
    }
  };

  const removeTech = (tech: string) => {
    setNewEvent(prev => ({ ...prev, technologies: prev.technologies.filter(t => t !== tech) }));
  };

  const handleCommentClick = async (event: any) => {
    setSelectedEvent(event);
    try {
      const result = await eventsAPI.getComments(event.id);
      setComments(result.comments || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedEvent) return;
    try {
      await eventsAPI.comment(selectedEvent.id, newComment);
      const result = await eventsAPI.getComments(selectedEvent.id);
      setComments(result.comments || []);
      setNewComment('');
      loadEvents();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const psLen = newEvent.problemStatement.length;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Events Feed */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="mb-2">No events yet</h3>
            <p className="text-muted-foreground">Go to your profile to create your first event!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onCommentClick={handleCommentClick}
              onUpdate={loadEvents}
            />
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event / Hackathon</DialogTitle>
            <DialogDescription className="sr-only">Create a new event or hackathon for the community.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Event Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Annual Hackathon 2025"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Describe your event..."
                rows={4}
                required
              />
            </div>

            {/* Problem Statement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="problemStatement">Problem Statement *</Label>
                <span className={`text-xs ${psLen < PROBLEM_STATEMENT_MIN ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'}`}>
                  {psLen} characters {psLen < PROBLEM_STATEMENT_MIN ? `(min ${PROBLEM_STATEMENT_MIN})` : '✓'}
                </span>
              </div>
              <Textarea
                id="problemStatement"
                value={newEvent.problemStatement}
                onChange={(e) => setNewEvent({ ...newEvent, problemStatement: e.target.value })}
                placeholder="Describe the problem statement, challenge, objectives, expected solution, evaluation criteria, datasets/resources (if any), and any important rules."
                rows={5}
                className="resize-y"
              />
              {psLen > 0 && psLen < PROBLEM_STATEMENT_MIN && (
                <p className="text-xs text-muted-foreground">
                  {PROBLEM_STATEMENT_MIN - psLen} more characters needed
                </p>
              )}
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="date">Date & Time *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="Online / City, Country"
              />
            </div>

            {/* Event Location Link */}
            <div className="space-y-2">
              <Label htmlFor="locationLink">Event Location Link</Label>
              <Input
                id="locationLink"
                type="url"
                value={newEvent.locationLink}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewEvent({ ...newEvent, locationLink: val });
                  if (val.trim()) {
                    try { new URL(val.trim()); setLocationLinkError(''); }
                    catch { setLocationLinkError('Please enter a valid URL'); }
                  } else {
                    setLocationLinkError('');
                  }
                }}
                placeholder="https://maps.google.com/..."
              />
              {locationLinkError && (
                <p className="text-sm text-destructive">{locationLinkError}</p>
              )}
            </div>

            {/* Event Link */}
            <div className="space-y-2">
              <Label htmlFor="link">Event Link</Label>
              <Input
                id="link"
                type="url"
                value={newEvent.link}
                onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Team Size */}
            <div className="space-y-2">
              <Label>Team Size *</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="minTeamSize" className="text-xs text-muted-foreground">
                    Minimum Team Members *
                  </Label>
                  <Input
                    id="minTeamSize"
                    type="number"
                    min={1}
                    max={20}
                    value={newEvent.minTeamSize}
                    onChange={(e) => {
                      setNewEvent({ ...newEvent, minTeamSize: e.target.value });
                      setTeamSizeError(validateTeamSize(e.target.value, newEvent.maxTeamSize));
                    }}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxTeamSize" className="text-xs text-muted-foreground">
                    Maximum Team Members *
                  </Label>
                  <Input
                    id="maxTeamSize"
                    type="number"
                    min={1}
                    max={20}
                    value={newEvent.maxTeamSize}
                    onChange={(e) => {
                      setNewEvent({ ...newEvent, maxTeamSize: e.target.value });
                      setTeamSizeError(validateTeamSize(newEvent.minTeamSize, e.target.value));
                    }}
                    placeholder="5"
                  />
                </div>
              </div>
              {teamSizeError && (
                <p className="text-sm text-destructive">{teamSizeError}</p>
              )}
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <Label>Required Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newEvent.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    #{skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Additional Details toggle */}
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t border-border"
                onClick={() => setShowAdditional(!showAdditional)}
              >
                {showAdditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAdditional ? 'Hide' : 'Show'} Additional Details (optional)
              </button>
            </div>

            {showAdditional && (
              <div className="space-y-4 pt-2">
                {/* Event Banner */}
                <div className="space-y-2">
                  <Label>Event Banner / Poster</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                    {bannerPreview ? (
                      <div className="relative">
                        <img
                          src={bannerPreview}
                          alt="Banner preview"
                          className="w-full h-40 object-cover rounded"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"
                          onClick={(e) => { e.stopPropagation(); setBannerFile(null); setBannerPreview(null); }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload event banner</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP recommended</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Category + Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Event Category</Label>
                    <Select
                      value={newEvent.category}
                      onValueChange={(val) => setNewEvent({ ...newEvent, category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select
                      value={newEvent.mode}
                      onValueChange={(val) => setNewEvent({ ...newEvent, mode: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_MODES.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Eligibility */}
                <div className="space-y-2">
                  <Label>Eligibility</Label>
                  <Select
                    value={newEvent.eligibility}
                    onValueChange={(val) => setNewEvent({ ...newEvent, eligibility: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELIGIBILITY_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Technologies */}
                <div className="space-y-2">
                  <Label>Technologies</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTech}
                      onChange={(e) => setNewTech(e.target.value)}
                      placeholder="e.g., React, AI, Python"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                    />
                    <Button type="button" onClick={addTech} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newEvent.technologies.map((tech) => (
                      <Badge key={tech} variant="outline" className="gap-1">
                        {tech}
                        <button type="button" onClick={() => removeTech(tech)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Prize Pool */}
                <div className="space-y-2">
                  <Label htmlFor="prizePool">Prize Pool</Label>
                  <Input
                    id="prizePool"
                    value={newEvent.prizePool}
                    onChange={(e) => setNewEvent({ ...newEvent, prizePool: e.target.value })}
                    placeholder="e.g., $5,000 in prizes"
                  />
                </div>

                {/* Registration Deadline */}
                <div className="space-y-2">
                  <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                  <Input
                    id="registrationDeadline"
                    type="datetime-local"
                    value={newEvent.registrationDeadline}
                    onChange={(e) => setNewEvent({ ...newEvent, registrationDeadline: e.target.value })}
                  />
                </div>

                {/* Max Teams */}
                <div className="space-y-2">
                  <Label htmlFor="maxTeams">Maximum Teams Allowed</Label>
                  <Input
                    id="maxTeams"
                    type="number"
                    min={1}
                    value={newEvent.maxTeams}
                    onChange={(e) => setNewEvent({ ...newEvent, maxTeams: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1"
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription className="sr-only">View and add comments on this event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEvent && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-2">{selectedEvent.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {comment.user?.profilePicture && (
                            <AvatarFallback>{getInitials(comment.user?.name || 'U')}</AvatarFallback>
                          )}
                          <AvatarFallback>{getInitials(comment.user?.name || 'U')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{comment.user?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                          <p className="mt-1">{comment.text}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button onClick={handleAddComment}>Post</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
