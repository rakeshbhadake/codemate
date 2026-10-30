import React, { useState, useEffect } from 'react';
import { usersAPI, socialAPI } from '../../utils/api';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Search, Loader2, UserPlus, UserCheck, MessageCircle, User2 } from 'lucide-react';
import { useAuth } from '../../utils/auth-context';

interface User {
  id: string;
  name: string;
  username: string;
  bio: string;
  skills: string[];
  location: string;
  profilePicture: string | null;
  isFollowing: boolean;
}

interface SearchUsersProps {
  onMessageUser?: (userId: string, userName: string) => void;
  onViewProfile?: (userId: string) => void;
}

export function SearchUsers({ onMessageUser, onViewProfile }: SearchUsersProps) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const timeout = setTimeout(async () => {
      try {
        const data = await usersAPI.search(query);
        setResults(data.users || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchError('Search failed. Please try again.');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [query]);

  const handleFollow = async (userId: string) => {
    setLoadingActions(prev => ({ ...prev, [userId]: true }));
    try {
      await socialAPI.follow(userId);
      setResults(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, isFollowing: true } : user
        )
      );
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfollow = async (userId: string) => {
    setLoadingActions(prev => ({ ...prev, [userId]: true }));
    try {
      await socialAPI.unfollow(userId);
      setResults(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, isFollowing: false } : user
        )
      );
    } catch (error) {
      console.error('Unfollow error:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [userId]: false }));
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Search Header */}
      <div className="space-y-2">
        <h1 className="text-2xl">Search Users</h1>
        <p className="text-muted-foreground">
          Find developers by username, name, skills, or location
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by username, name, skill, or location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      <div className="space-y-3">
        {query && !isSearching && searchError && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User2 className="w-12 h-12 text-destructive mb-4" />
              <p className="text-destructive text-center">{searchError}</p>
            </CardContent>
          </Card>
        )}
        {query && !isSearching && !searchError && results.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User2 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No users found for "{query}"
              </p>
            </CardContent>
          </Card>
        )}

        {results.map((user) => (
          <Card key={user.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Profile Picture - Clickable */}
                <Avatar 
                  className="w-14 h-14 cursor-pointer" 
                  onClick={() => onViewProfile && onViewProfile(user.id)}
                >
                  <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer" 
                      onClick={() => onViewProfile && onViewProfile(user.id)}
                    >
                      <h3 className="truncate hover:underline">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {user.isFollowing ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnfollow(user.id)}
                          disabled={loadingActions[user.id]}
                        >
                          {loadingActions[user.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Following
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleFollow(user.id)}
                          disabled={loadingActions[user.id]}
                        >
                          {loadingActions[user.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Follow
                            </>
                          )}
                        </Button>
                      )}
                      {onMessageUser && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMessageUser(user.id, user.name)}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {user.bio}
                    </p>
                  )}

                  {/* Location */}
                  {user.location && (
                    <p className="text-sm text-muted-foreground mt-1">
                      📍 {user.location}
                    </p>
                  )}

                  {/* Skills */}
                  {user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.skills.slice(0, 5).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          #{skill}
                        </Badge>
                      ))}
                      {user.skills.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{user.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      {!query && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="mb-2">Find Your Coding Partners</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Start typing to search for users by their username or name.
              Connect with developers who share your interests!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
