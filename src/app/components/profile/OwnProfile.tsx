import React, { useState, useEffect, useRef } from 'react';
import { profileAPI, postsAPI, eventsAPI, projectsAPI } from '../../utils/api';
import { useAuth } from '../../utils/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FollowersModal } from '../dashboard/FollowersModal';
import { PostCard } from '../social/PostCard';
import { EventCard } from '../social/EventCard';
import { ProjectCard } from '../projects/ProjectCard';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import {
  Loader2, MapPin, Users, UserCheck, Calendar, Briefcase, FileText,
  PenSquare, CalendarPlus, FolderPlus, Settings, LogOut, Edit3, Pencil,
  ChevronDown, Linkedin, Github
} from 'lucide-react';
import { toast } from 'sonner';
import { PROFILE_IMAGE_ACCEPT, validateProfileImageFile } from '../../utils/profile-images';

interface OwnProfileProps {
  onCreatePost: () => void;
  onCreateEvent: () => void;
  onEditProfile: () => void;
  onMessageUser?: (userId: string, userName: string) => void;
  onViewProfile?: (userId: string) => void;
}

export function OwnProfile({
  onCreatePost,
  onCreateEvent,
  onEditProfile,
  onMessageUser,
  onViewProfile,
}: OwnProfileProps) {
  const { user, logout, updateUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const coverPictureInputRef = useRef<HTMLInputElement>(null);
  const [imageUploadInProgress, setImageUploadInProgress] = useState<'profile' | 'cover' | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchPosts();
      fetchEvents();
      fetchProjects();
    }
  }, [user?.id]);

  // Close settings dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      if (!user?.id) return;
      const res = await profileAPI.get(user.id);
      const p = res.profile || res.user || user;
      setProfileData(p);
      const fc = p.followers ?? p.followersCount ?? user.followers ?? 0;
      const foc = p.following ?? p.followingCount ?? user.following ?? 0;
      setFollowerCount(fc);
      setFollowingCount(foc);
      updateUser({ followers: fc, following: foc, skills: p.skills || user.skills || [] });
    } catch {
      setProfileData(user);
      setFollowerCount(user?.followers || 0);
      setFollowingCount(user?.following || 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!user?.id) return;
    setPostsLoading(true);
    try {
      const res = await postsAPI.getByUser(user.id);
      setUserPosts(res.posts || []);
    } catch { /* silent */ } finally {
      setPostsLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!user?.id) return;
    setEventsLoading(true);
    try {
      const res = await eventsAPI.getAll();
      setUserEvents((res.events || []).filter((e: any) => e.authorId === user.id));
    } catch { /* silent */ } finally {
      setEventsLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!user?.id) return;
    setProjectsLoading(true);
    try {
      const res = await projectsAPI.getByUser(user.id);
      setUserProjects(res.projects || []);
    } catch { /* silent */ } finally {
      setProjectsLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const getAvailabilityColor = (av?: string) => {
    switch (av) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const handleLogout = async () => {
    setSettingsOpen(false);
    await logout();
  };

  const handleEditProfile = () => {
    setSettingsOpen(false);
    onEditProfile();
  };

  const handleImageSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: 'profile' | 'cover',
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validationError = validateProfileImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setImageUploadInProgress(imageType);
    try {
      const result = imageType === 'profile'
        ? await profileAPI.uploadPicture(file)
        : await profileAPI.uploadCoverPicture(file);
      const imageUrl = imageType === 'profile' ? result.profilePicture : result.coverPicture;
      if (typeof imageUrl !== 'string' || !imageUrl) {
        throw new Error('The image upload did not return a saved image URL.');
      }

      const profileField = imageType === 'profile' ? 'profilePicture' : 'coverPicture';
      setProfileData((current: any) => ({ ...(current || user || {}), [profileField]: imageUrl }));
      updateUser({ [profileField]: imageUrl } as any);
      toast.success(imageType === 'profile' ? 'Profile picture updated.' : 'Cover photo updated.');
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Image upload failed. Please try again.');
    } finally {
      setImageUploadInProgress(null);
    }
  };

  const profile = profileData || user;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Cover */}
          <div className="h-36 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 relative overflow-hidden">
            {profile.coverPicture && (
              <img
                src={profile.coverPicture}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <input
              ref={coverPictureInputRef}
              type="file"
              accept={PROFILE_IMAGE_ACCEPT}
              className="hidden"
              aria-label="Choose a cover photo"
              onChange={(event) => void handleImageSelection(event, 'cover')}
            />
            <button
              type="button"
              title="Change cover photo"
              aria-label="Change cover photo"
              aria-busy={imageUploadInProgress === 'cover'}
              disabled={imageUploadInProgress !== null}
              onClick={() => coverPictureInputRef.current?.click()}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait"
            >
              {imageUploadInProgress === 'cover'
                ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                : <Pencil aria-hidden="true" className="h-4 w-4" />}
            </button>
            {imageUploadInProgress === 'cover' && (
              <span className="sr-only" role="status">Uploading cover photo</span>
            )}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px"
            }} />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar + Actions row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 mb-4">
              <div className="relative flex-shrink-0">
                <input
                  ref={profilePictureInputRef}
                  type="file"
                  accept={PROFILE_IMAGE_ACCEPT}
                  className="hidden"
                  aria-label="Choose a profile picture"
                  onChange={(event) => void handleImageSelection(event, 'profile')}
                />
                <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
                  {profile.profilePicture && (
                    <AvatarImage src={profile.profilePicture} alt={profile.name} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl">
                    {getInitials(profile.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  title="Change profile picture"
                  aria-label="Change profile picture"
                  aria-busy={imageUploadInProgress === 'profile'}
                  disabled={imageUploadInProgress !== null}
                  onClick={() => profilePictureInputRef.current?.click()}
                  className="absolute bottom-0 right-0 z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-background text-foreground shadow transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
                >
                  {imageUploadInProgress === 'profile'
                    ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    : <Pencil aria-hidden="true" className="h-4 w-4" />}
                </button>
                {imageUploadInProgress === 'profile' && (
                  <span className="sr-only" role="status">Uploading profile picture</span>
                )}
                <div
                  className={`absolute bottom-2 left-2 w-5 h-5 rounded-full border-4 border-background ${getAvailabilityColor(profile.availability)}`}
                  title={profile.availability || 'Status unknown'}
                />
              </div>

              {/* Owner Action Buttons */}
              <div className="flex-1 flex flex-wrap items-center justify-end gap-2 pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={onCreatePost}
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  Create Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={onCreateEvent}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Create Event
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Add Project
                </Button>

                {/* Settings Menu */}
                <div className="relative" ref={settingsRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSettingsOpen(v => !v)}
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                    <ChevronDown className={`w-3 h-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {settingsOpen && (
                    <div className="absolute right-0 mt-1 w-44 rounded-md border border-border bg-background shadow-lg z-50 py-1">
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={handleEditProfile}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Name and Username */}
            <div className="space-y-0.5 mb-3">
              <h1 className="text-2xl font-semibold">{profile.name || 'Your Name'}</h1>
              <p className="text-muted-foreground">@{profile.username || 'username'}</p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mb-3">{profile.bio}</p>
            )}

            {/* Location and availability */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {profile.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              {profile.availability && (
                <Badge
                  variant={profile.availability === 'available' ? 'default' : 'secondary'}
                  className="capitalize text-xs"
                >
                  {profile.availability}
                </Badge>
              )}
            </div>

            {/* Social Links */}
            {(profile.linkedin_url || profile.github_url) && (
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-foreground hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
              </div>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      #{skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Followers / Following stats */}
            <div className="flex gap-6">
              <button
                onClick={() => { setModalType('followers'); setModalOpen(true); }}
                className="group flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xl font-semibold leading-none">{followerCount}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              </button>
              <button
                onClick={() => { setModalType('following'); setModalOpen(true); }}
                className="group flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xl font-semibold leading-none">{followingCount}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Posts
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Events
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Projects
              </TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts" className="mt-4 space-y-4">
              {postsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : userPosts.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No posts yet</p>
                  <p className="text-xs text-muted-foreground/60">Share your thoughts with the community!</p>
                  <Button size="sm" variant="outline" onClick={onCreatePost} className="mt-2 gap-1.5">
                    <PenSquare className="w-3.5 h-3.5" /> Create Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onCommentClick={() => {}}
                      onUpdate={fetchPosts}
                      onViewProfile={onViewProfile}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-4 space-y-4">
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : userEvents.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No events yet</p>
                  <p className="text-xs text-muted-foreground/60">Organize a hackathon or workshop!</p>
                  <Button size="sm" variant="outline" onClick={onCreateEvent} className="mt-2 gap-1.5">
                    <CalendarPlus className="w-3.5 h-3.5" /> Create Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onCommentClick={() => {}}
                      onUpdate={fetchEvents}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="mt-4">
              {projectsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : userProjects.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No projects yet</p>
                  <p className="text-xs text-muted-foreground/60">Showcase what you are building!</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 gap-1.5"
                    onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Add Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onUpdate={fetchProjects}
                      onEdit={(p) => { setEditingProject(p); setShowProjectModal(true); }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Followers Modal */}
      {user?.id && (
        <FollowersModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          type={modalType}
          userId={user.id}
          onMessageUser={onMessageUser}
          onViewProfile={onViewProfile}
        />
      )}

      {/* Create / Edit Project Modal */}
      <CreateProjectModal
        open={showProjectModal}
        onOpenChange={setShowProjectModal}
        onCreated={fetchProjects}
        editProject={editingProject}
      />
    </div>
  );
}
