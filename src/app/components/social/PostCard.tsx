import React, { useState } from 'react';
import { useAuth } from '../../utils/auth-context';
import { postsAPI } from '../../utils/api';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ShareModal } from './ShareModal';
import { SendPostModal } from './SendPostModal';
import { Heart, MessageCircle, Share2, Send, Bookmark, MoreVertical, Trash2, Edit, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PostCardProps {
  post: any;
  onCommentClick: (post: any) => void;
  onUpdate: () => void;
  onViewProfile?: (userId: string) => void;
}

export function PostCard({ post, onCommentClick, onUpdate, onViewProfile }: PostCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSendPostModal, setShowSendPostModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    try {
      if (post.isLiked) {
        await postsAPI.unlike(post.id);
      } else {
        await postsAPI.like(post.id);
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);

    try {
      if (post.isBookmarked) {
        await postsAPI.unbookmark(post.id);
        toast.success('Removed from bookmarks');
      } else {
        await postsAPI.bookmark(post.id);
        toast.success('Added to bookmarks');
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to bookmark/unbookmark post:', error);
      toast.error('Failed to update bookmark');
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await postsAPI.delete(post.id);
      toast.success('Post deleted');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    const mediaItems = post.media;

    if (mediaItems.length === 1) {
      const media = mediaItems[0];
      if (media.type === 'video') {
        return (
          <video
            src={media.url}
            controls
            className="w-full rounded-lg max-h-[500px] object-contain bg-black"
          />
        );
      }
      return (
        <img
          src={media.url}
          alt="Post media"
          className="w-full rounded-lg max-h-[500px] object-cover"
        />
      );
    }

    return (
      <div className={`grid gap-2 rounded-lg overflow-hidden ${
        mediaItems.length === 2 ? 'grid-cols-2' :
        mediaItems.length === 3 ? 'grid-cols-2' :
        'grid-cols-2'
      }`}>
        {mediaItems.slice(0, 4).map((media: any, index: number) => (
          <div key={index} className={`relative ${
            mediaItems.length === 3 && index === 0 ? 'col-span-2' : ''
          }`}>
            {media.type === 'video' ? (
              <video
                src={media.url}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={media.url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-cover"
              />
            )}
            {index === 3 && mediaItems.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl">
                +{mediaItems.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const parseContent = (content: string) => {
    const parts = content.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return <Badge key={index} variant="secondary" className="mx-1">{part}</Badge>;
      }
      if (part.startsWith('@')) {
        return <span key={index} className="text-primary font-medium">{part}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Author Info */}
          <div className="flex items-start gap-3">
            <Avatar
              className="cursor-pointer"
              onClick={() => onViewProfile?.(post.authorId)}
            >
              {post.author?.profilePicture && (
                <AvatarImage src={post.author.profilePicture} alt={post.author.name || 'User'} />
              )}
              <AvatarFallback>{getInitials(post.author?.name || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p
                className="cursor-pointer hover:underline"
                onClick={() => onViewProfile?.(post.authorId)}
              >
                {post.author?.name || 'Unknown'}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* 3-dot Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {user?.id === post.authorId && (
                  <>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Post Content */}
          <div className="space-y-3">
            {post.caption && (
              <p className="whitespace-pre-wrap">{parseContent(post.caption)}</p>
            )}

            {/* Media */}
            {renderMedia()}

            {/* Link */}
            {post.link && (
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {post.linkText || 'View Link'}
              </a>
            )}

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag: string) => (
                  <Badge key={tag} variant="outline">#{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className="gap-2"
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{post.likes || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCommentClick(post)}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentCount || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSendPostModal(true)}
              className="gap-2"
              title="Send post to CodeMate users"
            >
              <Send className="w-4 h-4" />
            </Button>

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleBookmark}
              disabled={isBookmarking}
            >
              <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        itemId={post.id}
        itemType="post"
        title={post.caption?.substring(0, 50) || 'Check out this post'}
      />

      <SendPostModal
        open={showSendPostModal}
        onOpenChange={setShowSendPostModal}
        post={post}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
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
    </>
  );
}
