import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { socialAPI } from '../../utils/api';
import { useAuth } from '../../utils/auth-context';
import { Loader2, UserPlus, UserMinus, MessageCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  username: string;
  bio?: string;
  skills?: string[];
  availability?: string;
  profilePicture?: string;
  isFollowing?: boolean;
}

interface FollowersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'followers' | 'following';
  userId: string;
  onMessageUser?: (userId: string, userName: string) => void;
  onViewProfile?: (userId: string) => void;
}

export function FollowersModal({ open, onOpenChange, type, userId, onMessageUser, onViewProfile }: FollowersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, type, userId]);

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = type === 'followers'
        ? await socialAPI.getFollowers(userId)
        : await socialAPI.getFollowing(userId);
      setUsers(response.users || []);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setFetchError('Failed to load. Please close and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (actionLoading || targetUserId === currentUser?.id) return;
    
    setActionLoading(targetUserId);
    try {
      if (isCurrentlyFollowing) {
        await socialAPI.unfollow(targetUserId);
      } else {
        await socialAPI.follow(targetUserId);
      }
      
      // Update local state
      setUsers(users.map(u => 
        u.id === targetUserId 
          ? { ...u, isFollowing: !isCurrentlyFollowing }
          : u
      ));
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = (targetUserId: string, userName: string) => {
    if (onMessageUser) {
      onMessageUser(targetUserId, userName);
      onOpenChange(false);
    }
  };

  const handleViewProfile = (targetUserId: string) => {
    if (onViewProfile) {
      onViewProfile(targetUserId);
      onOpenChange(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'followers' ? '👤 Followers' : '👥 Following'}
            <Badge variant="secondary" className="ml-2">
              {users.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {type === 'followers' 
              ? 'View and manage your followers. Follow them back or send a message to connect.'
              : 'View and manage who you follow. Unfollow or send a message to stay connected.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive mb-2">{fetchError}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-2">
              {type === 'followers'
                ? 'No followers yet'
                : 'Not following anyone yet'}
            </p>
            <p className="text-sm text-muted-foreground">
              {type === 'followers'
                ? 'Start sharing your profile to gain followers!'
                : 'Discover and follow developers to build your network!'}
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto pr-2 space-y-3">
            {users.map((user) => (
              <div 
                key={user.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Avatar with availability indicator - Clickable */}
                <div 
                  className="relative cursor-pointer" 
                  onClick={() => handleViewProfile(user.id)}
                  title="View profile"
                >
                  <Avatar className="w-12 h-12">
                    {user.profilePicture && (
                      <AvatarImage src={user.profilePicture} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${getAvailabilityColor(user.availability)}`}
                  />
                </div>

                {/* User Info - Clickable */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer" 
                  onClick={() => handleViewProfile(user.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="truncate hover:underline">{user.name}</h4>
                    <span className="text-sm text-muted-foreground">@{user.username}</span>
                  </div>

                  {user.bio && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {user.bio}
                    </p>
                  )}

                  {user.skills && user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {user.skills.slice(0, 5).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          #{skill}
                        </Badge>
                      ))}
                      {user.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {user.availability && (
                    <Badge 
                      variant={user.availability === 'available' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {user.availability}
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                {user.id !== currentUser?.id && (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={user.isFollowing ? 'outline' : 'default'}
                      onClick={() => handleFollowToggle(user.id, user.isFollowing || false)}
                      disabled={actionLoading === user.id}
                      className="whitespace-nowrap"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : user.isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-1" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMessage(user.id, user.name)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
