import React, { useState } from 'react';
import { socialAPI } from '../../utils/api';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MapPin, UserPlus, UserMinus, MessageCircle } from 'lucide-react';

interface UserCardProps {
  user: any;
  onUpdate: () => void;
  onMessage?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

export function UserCard({ user, onUpdate, onMessage, onViewProfile }: UserCardProps) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isFollowing) {
        await socialAPI.unfollow(user.id);
      } else {
        await socialAPI.follow(user.id);
      }
      setIsFollowing(!isFollowing);
      onUpdate();
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'default';
      case 'busy': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div 
          className="flex items-start gap-3 cursor-pointer" 
          onClick={() => onViewProfile && onViewProfile(user.id)}
        >
          <Avatar className="w-12 h-12">
            {user.profilePicture && (
              <AvatarImage src={user.profilePicture} alt={user.name} />
            )}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="truncate hover:underline">{user.name}</h3>
            {user.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {user.location}
              </p>
            )}
            <Badge variant={getStatusColor(user.availability)} className="mt-1">
              {user.availability || 'available'}
            </Badge>
          </div>
        </div>

        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
        )}

        {user.skills && user.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {user.skills.slice(0, 5).map((skill: string) => (
              <Badge key={skill} variant="outline" className="text-xs">
                #{skill}
              </Badge>
            ))}
            {user.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{user.skills.length - 5}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant={isFollowing ? 'outline' : 'default'}
            size="sm"
            onClick={handleFollowToggle}
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            {isFollowing ? (
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
          {onMessage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMessage(user.id)}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
          )}
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <div>
            <span>{user.followers || 0}</span> followers
          </div>
          <div>
            <span>{user.following || 0}</span> following
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
