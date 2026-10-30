import React, { useState, useEffect } from 'react';
import { matchingAPI, socialAPI } from '../../utils/api';
import { useAuth } from '../../utils/auth-context';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import {
  Search, Sparkles, Users, Loader2, X, MapPin, MessageCircle,
  RefreshCw, UserPlus, UserMinus, TrendingUp, Compass
} from 'lucide-react';

interface MatchingSystemProps {
  onMessage: (userId: string, userName?: string) => void;
  onViewProfile?: (userId: string) => void;
}

const SUGGESTED_QUERIES = [
  'Find Python developers near me',
  'React developers available for a project',
  'Machine learning developers for AI hackathon',
  'Full-stack developers in Bangalore',
  'Java and Spring Boot developers',
  'Frontend developers available for collaboration',
  'Find developers who know SQL and data analysis',
];

export function MatchingSystem({ onMessage, onViewProfile }: MatchingSystemProps) {
  const { user } = useAuth();

  // Shared data
  const [browseUsers, setBrowseUsers] = useState<any[]>([]);
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());

  // AI Discover state
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [hasAiSearched, setHasAiSearched] = useState(false);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);
  const [aiMatchMethod, setAiMatchMethod] = useState('');

  // Normal Discover filters (client-side)
  const [locationFilter, setLocationFilter] = useState('__all__');
  const [availabilityFilter, setAvailabilityFilter] = useState('__all__');
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    loadBrowseUsers();
  }, []);

  const loadBrowseUsers = async () => {
    setIsBrowseLoading(true);
    try {
      const result = await matchingAPI.discover();
      const users = result.users || [];
      setBrowseUsers(users);
      const locs = Array.from(
        new Set(
          users
            .map((u: any) => (u.location || '').trim())
            .filter(Boolean)
            .map((l: string) => l.charAt(0).toUpperCase() + l.slice(1))
        )
      ).sort() as string[];
      setAvailableLocations(locs);
    } catch { /* silent */ }
    finally { setIsBrowseLoading(false); }
  };

  const handleAiSearch = async (query?: string) => {
    const q = (query ?? aiQuery).trim();
    if (!q) return;
    if (query) setAiQuery(query);

    setIsAiSearching(true);
    setAiSearchError(null);
    setHasAiSearched(true);
    setAiResults([]);

    try {
      const result = await matchingAPI.aiSuggest(q, {});
      setAiResults(result.matches || []);
      setAiMatchMethod(result.method || '');
    } catch {
      setAiSearchError('Search failed. Please try again.');
    } finally {
      setIsAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiQuery('');
    setAiResults([]);
    setHasAiSearched(false);
    setAiSearchError(null);
  };

  const handleFollowToggle = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (followLoading.has(targetId)) return;
    setFollowLoading(prev => new Set(prev).add(targetId));
    try {
      if (followedUsers.has(targetId)) {
        await socialAPI.unfollow(targetId);
        setFollowedUsers(prev => { const s = new Set(prev); s.delete(targetId); return s; });
      } else {
        await socialAPI.follow(targetId);
        setFollowedUsers(prev => new Set(prev).add(targetId));
      }
    } catch { /* silent */ }
    finally {
      setFollowLoading(prev => { const s = new Set(prev); s.delete(targetId); return s; });
    }
  };

  // Filtered list for Normal Discover tab (client-side)
  const filteredUsers = browseUsers.filter(u => {
    if (locationFilter !== '__all__' && (u.location || '').toLowerCase() !== locationFilter.toLowerCase()) return false;
    if (availabilityFilter !== '__all__' && u.availability !== availabilityFilter) return false;
    if (skillSearch.trim()) {
      const q = skillSearch.trim().toLowerCase();
      const skills = (u.skills || []).map((s: string) => s.toLowerCase());
      if (!skills.some((s: string) => s.includes(q))) return false;
    }
    return true;
  });

  const getInitials = (name: string) =>
    (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvailabilityColor = (av?: string) => {
    switch (av) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const DeveloperCard = ({ dev, showScore = false }: { dev: any; showScore?: boolean }) => {
    const isFollowed = followedUsers.has(dev.id);
    const isFollowBusy = followLoading.has(dev.id);
    return (
      <Card
        className="hover:shadow-md transition-all duration-200 cursor-pointer group"
        onClick={() => onViewProfile && onViewProfile(dev.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm font-medium">
                  {getInitials(dev.name)}
                </AvatarFallback>
                {dev.profilePicture && (
                  <AvatarImage src={dev.profilePicture} alt={dev.name} />
                )}
              </Avatar>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${getAvailabilityColor(dev.availability)}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <div className="min-w-0">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">{dev.name}</p>
                  {dev.username && <p className="text-xs text-muted-foreground">@{dev.username}</p>}
                </div>
                {showScore && dev.matchScore != null && (
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-sm font-semibold ${getScoreColor(dev.matchScore)}`}>{dev.matchScore}%</p>
                    <p className="text-xs text-muted-foreground">match</p>
                  </div>
                )}
              </div>

              {dev.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                  <MapPin className="w-3 h-3" />
                  {dev.location}
                </div>
              )}

              {dev.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{dev.bio}</p>
              )}

              {dev.skills && dev.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {dev.skills.slice(0, 5).map((skill: string) => {
                    const isMatched = dev.matchedSkills?.some(
                      (ms: string) => ms.toLowerCase() === skill.toLowerCase()
                    );
                    return (
                      <span
                        key={skill}
                        className={`text-xs px-1.5 py-0.5 rounded ${isMatched ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        #{skill}
                      </span>
                    );
                  })}
                  {dev.skills.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{dev.skills.length - 5}</span>
                  )}
                </div>
              )}

              <div className="mb-2">
                <Badge variant={dev.availability === 'available' ? 'default' : 'secondary'} className="text-xs capitalize">
                  {dev.availability || 'Unknown'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs flex-1"
                  disabled={isFollowBusy}
                  onClick={e => handleFollowToggle(dev.id, e)}
                >
                  {isFollowBusy ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : isFollowed ? (
                    <UserMinus className="w-3 h-3 mr-1" />
                  ) : (
                    <UserPlus className="w-3 h-3 mr-1" />
                  )}
                  {isFollowed ? 'Unfollow' : 'Follow'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs flex-1"
                  onClick={e => { e.stopPropagation(); onMessage(dev.id, dev.name); }}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const LoadingSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </div>
            <div className="h-2 bg-muted rounded" />
            <div className="h-2 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4">
      <Tabs defaultValue="ai-discover" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="ai-discover" className="gap-2">
            <Sparkles className="w-4 h-4" />
            AI Discover
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2">
            <Compass className="w-4 h-4" />
            Discover
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: AI DISCOVER ─────────────────────────── */}
        <TabsContent value="ai-discover" className="space-y-6">
          {/* Gradient search banner */}
          <div className="rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Search className="w-6 h-6 opacity-90" />
                <h2 className="text-2xl font-bold">Find Your Perfect Developer Match</h2>
              </div>
              <p className="text-white/75 text-sm">
                Describe what you are looking for in natural language
              </p>

              {/* Search input row */}
              <div className="flex gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/15 border border-white/25 text-white placeholder:text-white/50 text-sm outline-none focus:bg-white/20 focus:border-white/50 transition-colors"
                    placeholder="e.g. Find Python developers available for an AI hackathon..."
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                  />
                </div>
                <button
                  className="h-11 px-5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 text-white text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  onClick={() => handleAiSearch()}
                  disabled={isAiSearching || !aiQuery.trim()}
                >
                  {isAiSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Search
                </button>
              </div>

              {/* Suggested queries */}
              <div className="space-y-2 mt-2">
                <p className="text-white/60 text-xs">Try a suggested query:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUERIES.map(q => (
                    <button
                      key={q}
                      onClick={() => handleAiSearch(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                {hasAiSearched
                  ? isAiSearching
                    ? 'Searching...'
                    : aiSearchError
                      ? 'Search failed'
                      : `${aiResults.length} result${aiResults.length !== 1 ? 's' : ''} found`
                  : 'All Developers'}
                {hasAiSearched && aiMatchMethod === 'ai-ranked' && !isAiSearching && (
                  <Badge variant="secondary" className="text-xs gap-1 ml-1">
                    <Sparkles className="w-3 h-3" /> AI Ranked
                  </Badge>
                )}
                {hasAiSearched && aiMatchMethod === 'scored' && !isAiSearching && (
                  <Badge variant="outline" className="text-xs gap-1 ml-1">
                    <TrendingUp className="w-3 h-3" /> Scored
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {hasAiSearched && (
                  <Button variant="ghost" size="sm" onClick={clearAiSearch}>
                    <X className="w-4 h-4 mr-1.5" /> Clear
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={hasAiSearched ? () => handleAiSearch() : loadBrowseUsers}
                  disabled={hasAiSearched ? isAiSearching : isBrowseLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${(hasAiSearched ? isAiSearching : isBrowseLoading) ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {aiSearchError && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-destructive mb-3">{aiSearchError}</p>
                  <Button variant="outline" size="sm" onClick={() => handleAiSearch()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {(hasAiSearched ? isAiSearching : isBrowseLoading) && !aiSearchError && <LoadingSkeletons />}

            {!(hasAiSearched ? isAiSearching : isBrowseLoading) && !aiSearchError && (hasAiSearched ? aiResults : browseUsers).length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="mb-2">{hasAiSearched ? 'No matching developers found' : 'No developers found'}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasAiSearched ? 'Try a different search query' : 'Be the first to join Codemate!'}
                  </p>
                  {hasAiSearched && (
                    <Button variant="outline" size="sm" onClick={clearAiSearch}>Browse all developers</Button>
                  )}
                </CardContent>
              </Card>
            )}

            {!(hasAiSearched ? isAiSearching : isBrowseLoading) && !aiSearchError && (hasAiSearched ? aiResults : browseUsers).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(hasAiSearched ? aiResults : browseUsers).map(dev => (
                  <DeveloperCard key={dev.id} dev={dev} showScore={hasAiSearched} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB 2: NORMAL DISCOVER ─────────────────────── */}
        <TabsContent value="discover" className="space-y-6">
          {/* Filters row */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium">Search by Skill</label>
                  <Input
                    placeholder="e.g. React, Python, TypeScript..."
                    value={skillSearch}
                    onChange={e => setSkillSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="w-full sm:w-44 space-y-1.5">
                  <label className="text-sm font-medium">Location</label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Any Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Any Location</SelectItem>
                      {availableLocations.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-40 space-y-1.5">
                  <label className="text-sm font-medium">Availability</label>
                  <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Any</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(locationFilter !== '__all__' || availabilityFilter !== '__all__' || skillSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setLocationFilter('__all__'); setAvailabilityFilter('__all__'); setSkillSearch(''); }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                {isBrowseLoading ? 'Loading...' : `${filteredUsers.length} Developer${filteredUsers.length !== 1 ? 's' : ''}`}
              </h3>
              <Button variant="ghost" size="sm" onClick={loadBrowseUsers} disabled={isBrowseLoading}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${isBrowseLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isBrowseLoading && <LoadingSkeletons />}

            {!isBrowseLoading && filteredUsers.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Compass className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="mb-2">No developers match your filters</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters to find more developers</p>
                </CardContent>
              </Card>
            )}

            {!isBrowseLoading && filteredUsers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map(dev => (
                  <DeveloperCard key={dev.id} dev={dev} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
