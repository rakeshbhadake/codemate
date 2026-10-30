import React, { useState, useEffect, useRef, useCallback } from 'react';
import { postsAPI, usersAPI, messagingAPI } from '../../utils/api';
import { PostCard } from './PostCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Loader2, Upload, X, FileText, Image as ImageIcon, Video, TrendingUp, Bookmark, AtSign } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface PostsFeedProps {
  onViewProfile?: (userId: string) => void;
  highlightPostId?: string | null;
  openCreateModal?: boolean;
}

export function PostsFeed({ onViewProfile, highlightPostId, openCreateModal }: PostsFeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<any[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('feed');

  const [newPost, setNewPost] = useState({
    caption: '',
    link: '',
    linkText: '',
    hashtags: [] as string[]
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearching, setMentionSearching] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postRefs = useRef<{ [postId: string]: HTMLDivElement | null }>({});
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
    loadTrending();
  }, []);

  useEffect(() => {
    if (openCreateModal) setShowCreateModal(true);
  }, [openCreateModal]);

  useEffect(() => {
    if (activeTab === 'bookmarks') {
      loadBookmarks();
    }
  }, [activeTab]);

  // Deep-link: scroll to and highlight a specific post
  useEffect(() => {
    if (!highlightPostId || isLoading) return;

    const tryScroll = () => {
      const el = postRefs.current[highlightPostId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedPostId(highlightPostId);
        setTimeout(() => setHighlightedPostId(null), 3000);
      }
    };

    // Give the feed a moment to render
    const t = setTimeout(tryScroll, 400);
    return () => clearTimeout(t);
  }, [highlightPostId, isLoading]);

  const loadPosts = async () => {
    try {
      const result = await postsAPI.getAll();
      setPosts(result.posts || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      const result = await postsAPI.getTrending();
      setTrendingHashtags(result.trending || []);
    } catch (error) {
      console.error('Failed to load trending hashtags:', error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const result = await postsAPI.getBookmarks();
      setBookmarkedPosts(result.posts || []);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mediaFiles.length > 10) {
      setError('Maximum 10 media files allowed');
      return;
    }

    setMediaFiles(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addHashtag = () => {
    const tag = newHashtag.trim().replace(/^#/, '');
    if (tag && !newPost.hashtags.includes(tag)) {
      setNewPost(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, tag]
      }));
      setNewHashtag('');
    }
  };

  const removeHashtag = (tag: string) => {
    setNewPost(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(h => h !== tag)
    }));
  };

  // Detect @mention while typing in caption
  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewPost(prev => ({ ...prev, caption: value }));

    // Find if cursor is right after an @-mention query
    const cursorPos = e.target.selectionStart ?? value.length;
    const textUpToCursor = value.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentionDropdown(true);

      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      mentionDebounceRef.current = setTimeout(async () => {
        if (query.length >= 1) {
          setMentionSearching(true);
          try {
            const result = await usersAPI.search(query);
            setMentionResults(result.users || []);
          } catch {
            setMentionResults([]);
          } finally {
            setMentionSearching(false);
          }
        } else {
          setMentionResults([]);
        }
      }, 300);
    } else {
      setShowMentionDropdown(false);
      setMentionResults([]);
    }
  };

  const insertMention = (user: any) => {
    const textarea = captionRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? newPost.caption.length;
    const textUpToCursor = newPost.caption.slice(0, cursorPos);
    const textAfterCursor = newPost.caption.slice(cursorPos);

    // Replace the partial @query with @username
    const replaced = textUpToCursor.replace(/@(\w*)$/, `@${user.username} `);
    const newCaption = replaced + textAfterCursor;

    setNewPost(prev => ({ ...prev, caption: newCaption }));
    setShowMentionDropdown(false);
    setMentionResults([]);

    // Restore focus and move cursor after insertion
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = replaced.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Extract @mentions from caption text
  const extractMentions = (caption: string): string[] => {
    const matches = caption.match(/(?:^|\s)@(\w+)/g) || [];
    return matches.map(m => m.trim().slice(1)); // strip leading @
  };

  // Send mention notifications to mentioned users
  const sendMentionNotifications = async (post: any, caption: string) => {
    const mentionedUsernames = extractMentions(caption);
    if (mentionedUsernames.length === 0) return;

    // Search for each mentioned user and send message
    const uniqueUsernames = [...new Set(mentionedUsernames)];
    await Promise.allSettled(
      uniqueUsernames.map(async (username) => {
        try {
          const result = await usersAPI.search(username);
          const matchedUser = (result.users || []).find(
            (u: any) => u.username?.toLowerCase() === username.toLowerCase()
          );
          if (!matchedUser) return;

          const messagePayload = JSON.stringify({
            type: 'mention',
            postId: post.id,
            captionPreview: caption.slice(0, 120)
          });

          await messagingAPI.send(matchedUser.id, messagePayload);
        } catch (err) {
          console.error(`Failed to notify @${username}:`, err);
        }
      })
    );
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);

    if (!newPost.caption.trim()) {
      setError('Please add a caption');
      setIsCreating(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('caption', newPost.caption);
      formData.append('link', newPost.link);
      formData.append('linkText', newPost.linkText);
      formData.append('hashtags', JSON.stringify(newPost.hashtags));

      if (mediaFiles.length > 0) {
        mediaFiles.forEach((file) => {
          formData.append('media', file);
        });
      }

      const result = await postsAPI.create(formData);

      if (result.message && result.message.includes('media upload failed')) {
        toast.warning('Post created but some media failed to upload');
      } else {
        toast.success('Post created successfully!');
      }

      // Send mention notifications
      await sendMentionNotifications(result.post || { id: result.id }, newPost.caption);

      setShowCreateModal(false);
      setNewPost({ caption: '', link: '', linkText: '', hashtags: [] });
      setMediaFiles([]);
      setMediaPreviews([]);
      setShowMentionDropdown(false);
      loadPosts();
      loadTrending();
    } catch (error: any) {
      console.error('Post creation error:', error);
      const errorMessage = error.message || 'Failed to create post';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCommentClick = async (post: any) => {
    setSelectedPost(post);
    try {
      const result = await postsAPI.getComments(post.id);
      setComments(result.comments || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      await postsAPI.comment(selectedPost.id, newComment);
      const result = await postsAPI.getComments(selectedPost.id);
      setComments(result.comments || []);
      setNewComment('');
      loadPosts();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Render caption with highlighted @mentions and #hashtags
  const renderCaptionPreview = (caption: string) => {
    if (!caption) return null;
    const parts = caption.split(/(@\w+|#\w+)/g);
    return (
      <p className="text-sm text-muted-foreground mt-1 break-words">
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return <span key={i} className="text-blue-500 font-medium">{part}</span>;
          }
          if (part.startsWith('#')) {
            return <span key={i} className="text-primary font-medium">{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="bookmarks">
                <Bookmark className="w-4 h-4 mr-2" />
                Saved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="space-y-4 mt-4">
              {posts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="mb-2">No posts yet</h3>
                    <p className="text-muted-foreground">Go to your profile to create your first post!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      ref={(el) => { postRefs.current[post.id] = el; }}
                      className={`transition-all duration-500 ${
                        highlightedPostId === post.id
                          ? 'ring-2 ring-primary rounded-lg shadow-lg scale-[1.01]'
                          : ''
                      }`}
                    >
                      <PostCard
                        post={post}
                        onCommentClick={handleCommentClick}
                        onUpdate={loadPosts}
                        onViewProfile={onViewProfile}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookmarks" className="space-y-4 mt-4">
              {bookmarkedPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="mb-2">No saved posts</h3>
                    <p className="text-muted-foreground">Bookmark posts to see them here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {bookmarkedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onCommentClick={handleCommentClick}
                      onUpdate={() => {
                        loadPosts();
                        loadBookmarks();
                      }}
                      onViewProfile={onViewProfile}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {trendingHashtags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Trending
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingHashtags.map((tag: any, index: number) => (
                  <div key={tag.hashtag} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">#{tag.hashtag}</p>
                      <p className="text-sm text-muted-foreground">{tag.count} posts</p>
                    </div>
                    <Badge variant="secondary">{index + 1}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setShowMentionDropdown(false);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription className="sr-only">Share a post with the community.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePost} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <div className="relative">
                <Textarea
                  id="caption"
                  ref={captionRef}
                  value={newPost.caption}
                  onChange={handleCaptionChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowMentionDropdown(false);
                  }}
                  placeholder="What's on your mind? Use #hashtags and @mentions..."
                  rows={4}
                />

                {/* @mention dropdown */}
                {showMentionDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {mentionSearching ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching...
                      </div>
                    ) : mentionResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {mentionQuery.length >= 1 ? 'No users found' : 'Type to search users'}
                      </div>
                    ) : (
                      mentionResults.slice(0, 6).map((user: any) => (
                        <button
                          key={user.id}
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent textarea blur
                            insertMention(user);
                          }}
                        >
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            {user.profilePicture && (
                              <AvatarFallback className="text-xs">
                                {getInitials(user.name || 'U')}
                              </AvatarFallback>
                            )}
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Caption preview showing highlighted mentions */}
              {newPost.caption && (newPost.caption.includes('@') || newPost.caption.includes('#')) && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground border border-border">
                  <div className="flex items-center gap-1 mb-1 text-xs font-medium">
                    <AtSign className="w-3 h-3" />
                    Preview
                  </div>
                  {renderCaptionPreview(newPost.caption)}
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Media (Images/Videos)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="media-upload"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 10 files (images or videos)
                  </p>
                </label>
              </div>

              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {mediaFiles[index].type.startsWith('video/') ? (
                        <div className="relative">
                          <video src={preview} className="w-full h-24 object-cover rounded" />
                          <Video className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  placeholder="Add hashtag (e.g., tech, ai)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                />
                <Button type="button" onClick={addHashtag} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newPost.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label htmlFor="link">Optional Link</Label>
              <Input
                id="link"
                type="url"
                value={newPost.link}
                onChange={(e) => setNewPost({ ...newPost, link: e.target.value })}
                placeholder="https://github.com/username/project"
              />
              {newPost.link && (
                <Input
                  placeholder="Link text (e.g., View on GitHub)"
                  value={newPost.linkText}
                  onChange={(e) => setNewPost({ ...newPost, linkText: e.target.value })}
                />
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
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
                  'Create Post'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription className="sr-only">View and add comments on this post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPost && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm">{selectedPost.caption}</p>
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
                        <Avatar
                          className="w-8 h-8 flex-shrink-0 cursor-pointer"
                          onClick={() => {
                            setSelectedPost(null);
                            onViewProfile?.(comment.userId);
                          }}
                        >
                          {comment.user?.profilePicture && (
                            <AvatarFallback>
                              {getInitials(comment.user?.name || 'U')}
                            </AvatarFallback>
                          )}
                          <AvatarFallback>
                            {getInitials(comment.user?.name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm cursor-pointer hover:underline"
                            onClick={() => {
                              setSelectedPost(null);
                              onViewProfile?.(comment.userId);
                            }}
                          >
                            {comment.user?.name || 'Unknown'}
                          </p>
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
