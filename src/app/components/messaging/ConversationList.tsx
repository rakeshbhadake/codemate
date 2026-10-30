import React, { useState, useEffect } from 'react';
import { messagingAPI } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MessageCircle, Loader2 } from 'lucide-react';

interface ConversationListProps {
  onSelectConversation: (userId: string, userName: string) => void;
  selectedUserId: string | null;
  onViewProfile?: (userId: string) => void;
}

export function ConversationList({ onSelectConversation, selectedUserId, onViewProfile }: ConversationListProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      // Check if we have a token before making the request
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.warn('No access token found in localStorage');
        setConversations([]);
        setIsLoading(false);
        return;
      }
      
      const result = await messagingAPI.getConversations();
      setConversations(result.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // If unauthorized, clear conversations but don't crash
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        console.error('Token may be expired or invalid');
        setConversations([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // Reset time to midnight for date comparison
    const resetTime = (d: Date) => {
      const newDate = new Date(d);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    };

    const messageDate = resetTime(date);
    const today = resetTime(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if today
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    // Check if yesterday
    if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    // Within last week - show day name
    const daysDiff = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    // Older - show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Start chatting with other developers!
            </p>
          </div>
        ) : (
          conversations
            .filter((conversation) => conversation.otherUser)
            .map((conversation) => {
              const other = conversation.otherUser;
              const otherId = other?.id || conversation.participants?.find((id: string) => id !== conversation.id);
              if (!other || !otherId) return null;
              return (
                <div
                  key={conversation.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedUserId === otherId
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <Avatar
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => onViewProfile && onViewProfile(otherId)}
                    title="View profile"
                  >
                    {other.profilePicture && (
                      <AvatarImage src={other.profilePicture} alt={other.name || 'User'} />
                    )}
                    <AvatarFallback>
                      {getInitials(other.name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelectConversation(otherId, other.name || 'Unknown')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="font-medium truncate hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProfile && onViewProfile(otherId);
                        }}
                      >
                        {other.name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatTime(conversation.lastMessageAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </CardContent>
    </Card>
  );
}
