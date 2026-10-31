import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../utils/auth-context';
import { messagingAPI, usersAPI } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Send, ArrowLeft, Loader2, AtSign, ExternalLink } from 'lucide-react';

interface ChatInterfaceProps {
  selectedUserId: string | null;
  selectedUserName: string | null;
  onBack: () => void;
  onViewProfile?: (userId: string) => void;
}

export function ChatInterface({ selectedUserId, selectedUserName, onBack, onViewProfile }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserData, setOtherUserData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages();
      loadOtherUserData();
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUserId]);

  const loadOtherUserData = async () => {
    if (!selectedUserId) return;
    try {
      const response = await usersAPI.getById(selectedUserId);
      setOtherUserData(response.user);
    } catch (error) {
      console.error('Failed to load other user data:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedUserId) return;

    try {
      const result = await messagingAPI.getMessages(selectedUserId);
      setMessages(result.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId || isSending) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage('');

    try {
      await messagingAPI.send(selectedUserId, messageText);
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Parse a message to check if it's a mention notification
  const parseMentionMessage = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'mention' && parsed.postId) return parsed;
    } catch {
      // Not JSON, plain message
    }
    return null;
  };

  const handleViewPost = (postId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-post', { detail: { postId } }));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date for separators (Today, Yesterday, or date string)
  const formatDateSeparator = (dateString: string) => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to midnight for accurate comparison
    const resetTime = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const messageDateOnly = resetTime(messageDate);
    const todayOnly = resetTime(today);
    const yesterdayOnly = resetTime(yesterday);

    if (messageDateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      // Show day name if within last week
      const daysDiff = Math.floor((todayOnly.getTime() - messageDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        return messageDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      // Otherwise show full date
      return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  // Get date key for grouping (YYYY-MM-DD format)
  const getDateKey = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const grouped: { [key: string]: any[] } = {};

    messages.forEach(message => {
      const dateKey = getDateKey(message.createdAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });

    return grouped;
  };

  const messagesByDate = groupMessagesByDate();

  const renderSharedPost = (message: any) => {
    const sharedPost = message.sharedPost;
    if (!sharedPost) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          This shared post is no longer available.
        </div>
      );
    }

    const postAuthor = sharedPost.author || {};
    const authorName = postAuthor.name || 'Unknown';
    const firstMedia = Array.isArray(sharedPost.media) ? sharedPost.media[0] : null;

    return (
      <div className="rounded-lg border border-border bg-card p-3 text-left shadow-sm">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {message.senderId === user?.id ? 'You shared a post' : 'Shared a post with you'}
        </p>
        <div className="mb-2 flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {postAuthor.profilePicture && <AvatarImage src={postAuthor.profilePicture} alt={authorName} />}
            <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{authorName}</p>
            {postAuthor.username && <p className="truncate text-xs text-muted-foreground">@{postAuthor.username}</p>}
          </div>
        </div>
        {sharedPost.caption && <p className="mb-2 whitespace-pre-wrap break-words text-sm line-clamp-4">{sharedPost.caption}</p>}
        {!sharedPost.caption && sharedPost.link && (
          <p className="mb-2 truncate text-sm text-primary">{sharedPost.linkText || sharedPost.link}</p>
        )}
        {firstMedia?.url && (firstMedia.type === 'video' ? (
          <video src={firstMedia.url} controls className="mb-2 max-h-48 w-full rounded-md bg-black object-contain" />
        ) : (
          <img src={firstMedia.url} alt="Shared post" className="mb-2 max-h-48 w-full rounded-md object-cover" />
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => handleViewPost(sharedPost.id || message.sharedPostId)}
        >
          <ExternalLink className="w-3 h-3" />
          View Post
        </Button>
      </div>
    );
  };

  if (!selectedUserId) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <p className="text-muted-foreground">Select a conversation to start chatting</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar 
            className="cursor-pointer" 
            onClick={() => onViewProfile && selectedUserId && onViewProfile(selectedUserId)}
            title="View profile"
          >
            {otherUserData?.profilePicture && (
              <AvatarImage src={otherUserData.profilePicture} alt={selectedUserName || 'User'} />
            )}
            <AvatarFallback>{getInitials(selectedUserName || 'U')}</AvatarFallback>
          </Avatar>
          <CardTitle 
            className="text-lg cursor-pointer hover:underline"
            onClick={() => onViewProfile && selectedUserId && onViewProfile(selectedUserId)}
          >
            {selectedUserName}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            Object.keys(messagesByDate).sort().map((dateKey) => {
              const dayMessages = messagesByDate[dateKey];
              const firstMessage = dayMessages[0];

              return (
                <div key={dateKey} className="space-y-4">
                  {/* Date Separator */}
                  <div className="sticky top-0 z-10 flex items-center justify-center py-4">
                    <div className="bg-background px-4 py-1.5 rounded-full border border-border shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatDateSeparator(firstMessage.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Messages for this day */}
                  <div className="space-y-4 px-1">
                    {dayMessages.map((message: any) => {
                      const isOwn = message.senderId === user?.id;
                      const mentionData = parseMentionMessage(message.text);
                      const isSharedPost = message.messageType === 'shared_post' || message.type === 'shared_post';

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                        >
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            {isOwn ? (
                              <>
                                {(user as any)?.profilePicture && (
                                  <AvatarImage src={(user as any).profilePicture} alt={user?.name || 'You'} />
                                )}
                                <AvatarFallback>
                                  {getInitials(user?.name || 'U')}
                                </AvatarFallback>
                              </>
                            ) : (
                              <>
                                {otherUserData?.profilePicture && (
                                  <AvatarImage src={otherUserData.profilePicture} alt={selectedUserName || 'User'} />
                                )}
                                <AvatarFallback>
                                  {getInitials(selectedUserName || 'U')}
                                </AvatarFallback>
                              </>
                            )}
                          </Avatar>

                          {mentionData ? (
                            // Mention notification card
                            <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                              <div className="rounded-lg border border-border bg-card p-3 space-y-2 shadow-sm">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <AtSign className="w-3 h-3" />
                                  <span className="font-medium">
                                    {isOwn ? 'You mentioned someone in a post' : `${selectedUserName} mentioned you in a post`}
                                  </span>
                                </div>
                                {mentionData.captionPreview && (
                                  <p className="text-sm text-foreground line-clamp-3 border-l-2 border-primary pl-2">
                                    {mentionData.captionPreview}
                                    {mentionData.captionPreview.length >= 120 ? '…' : ''}
                                  </p>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleViewPost(mentionData.postId)}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View Post
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          ) : isSharedPost ? (
                            <div className={`max-w-[80%] ${isOwn ? 'text-right' : ''}`}>
                              {renderSharedPost(message)}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          ) : (
                            <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                              <div
                                className={`rounded-lg p-3 ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm break-words">{message.text}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={isSending || !newMessage.trim()} size="icon">
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
