import React, { useState, useEffect } from 'react';
import { usersAPI, socialAPI, postsAPI, eventsAPI, projectsAPI } from '../../utils/api';
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
import { Loader2, MapPin, ArrowLeft, UserPlus, UserMinus, MessageCircle, Users, UserCheck, Calendar, Briefcase, FileText, Linkedin, Github } from 'lucide-react';

interface UserProfileProps {
  userId: string;
  onBack: () => void;
  onMessageUser: (userId: string, userName: string) => void;
  onViewProfile?: (userId: string) => void;
}

interface UserData {
  id: string;
  name: string;
  username: string;
  bio?: string;
  skills?: string[];
  location?: string;
  availability?: string;
  profilePicture?: string;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
  linkedin_url?: string;
  github_url?: string;
}

export function UserProfile({ userId, onBack, onMessageUser, onViewProfile }: UserProfileProps) {
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
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

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
    fetchUserEvents();
    fetchUserProjects();
  }, [userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getById(userId);
      const user = response.user;
      setUserData(user);
      setIsFollowing(user.isFollowing || false);
      setFollowerCount(user.followers || 0);
      setFollowingCount(user.following || 0);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    setPostsLoading(true);
    try {
      const response = await postsAPI.getByUser(userId);
      setUserPosts(response.posts || []);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchUserEvents = async () => {
    setEventsLoading(true);
    try {
      const response = await eventsAPI.getAll();
      const userEventsFiltered = (response.events || []).filter((event: any) => event.authorId === userId);
      setUserEvents(userEventsFiltered);
    } catch (error) {
      console.error('Error fetching user events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchUserProjects = async () => {
    setProjectsLoading(true);
    try {
      const response = await projectsAPI.getByUser(userId);
      setUserProjects(response.projects || []);
    } catch (error) {
      console.error('Error fetching user projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (actionLoading || userId === currentUser?.id) return;
    
    setActionLoading(true);
    try {
      if (isFollowing) {
        await socialAPI.unfollow(userId);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await socialAPI.follow(userId);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openFollowersModal = (type: 'followers' | 'following') => {
    setModalType(type);
    setModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvailabilityColor = (availability?: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = userId === currentUser?.id;

  const handleBack = () => {
    // Use browser's back if possible, otherwise use the callback
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onBack();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Cover Background */}
          <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 mb-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  {userData.profilePicture && (
                    <AvatarImage src={userData.profilePicture} alt={userData.name} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-3xl">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-background ${getAvailabilityColor(userData.availability)}`}
                  title={userData.availability || 'Status unknown'}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex-1 flex justify-end gap-2 mb-2">
                {!isOwnProfile && (
                  <>
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
                      onClick={handleFollowToggle}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onMessageUser(userId, userData.name)}
                      className="gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Name and Username */}
            <div className="space-y-1 mb-4">
              <h1 className="text-3xl">{userData.name}</h1>
              <p className="text-muted-foreground">@{userData.username}</p>
            </div>

            {/* Bio */}
            {userData.bio && (
              <p className="text-muted-foreground mb-4">{userData.bio}</p>
            )}

            {/* Location and Availability */}
            <div className="flex flex-wrap gap-3 mb-4">
              {userData.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{userData.location}</span>
                </div>
              )}
              {userData.availability && (
                <Badge 
                  variant={userData.availability === 'available' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {userData.availability}
                </Badge>
              )}
            </div>

            {/* Social Links */}
            {(userData.linkedin_url || userData.github_url) && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {userData.linkedin_url && (
                  <a
                    href={userData.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:underline"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {userData.github_url && (
                  <a
                    href={userData.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-foreground hover:underline"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
              </div>
            )}

            {/* Skills */}
            {userData.skills && userData.skills.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {userData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      #{skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Followers and Following Stats */}
            <div className="flex gap-6">
              <button
                onClick={() => openFollowersModal('followers')}
                className="group flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-2xl">{followerCount}</p>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
              </button>

              <button
                onClick={() => openFollowersModal('following')}
                className="group flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-2xl">{followingCount}</p>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="w-4 h-4" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-2">
                <Calendar className="w-4 h-4" />
                Events
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-2">
                <Briefcase className="w-4 h-4" />
                Projects
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4 mt-4">
              {postsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : userPosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No posts yet</p>
                  <p className="text-xs mt-1">Check back later for updates!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onCommentClick={() => {}}
                      onUpdate={fetchUserPosts}
                      onViewProfile={onViewProfile}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-4 mt-4">
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : userEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No events yet</p>
                  <p className="text-xs mt-1">Check back later for updates!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onCommentClick={() => {}}
                      onUpdate={fetchUserEvents}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              {projectsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : userProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No projects yet</p>
                  <p className="text-xs mt-1">Stay tuned for future collaborations!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Followers Modal */}
      <FollowersModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
        userId={userId}
        onMessageUser={onMessageUser}
        onViewProfile={onViewProfile}
      />
    </div>
  );
}
