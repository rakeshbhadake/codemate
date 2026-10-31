import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Search, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../utils/auth-context';
import { messagingAPI, usersAPI } from '../../utils/api';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';

interface SendPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: any;
}

interface Recipient {
  id: string;
  name?: string;
  username?: string;
  profilePicture?: string | null;
}

const makeRequestId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `share-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getInitials = (name?: string) =>
  (name || 'User').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'U';

export function SendPostModal({ open, onOpenChange, post }: SendPostModalProps) {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<Recipient[]>([]);
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Recipient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestIdRef = useRef<string | null>(null);
  const searchSequenceRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadError('');
    setIsLoadingUsers(true);

    usersAPI.discover()
      .then((result) => {
        if (cancelled) return;
        const eligibleUsers = (result.users || []).filter((candidate: Recipient) => candidate.id && candidate.id !== user?.id);
        setAllUsers(eligibleUsers);
        setSearchResults(eligibleUsers);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load CodeMate recipients:', error);
        setLoadError('Could not load CodeMate users. Please try closing and reopening this window.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUsers(false);
      });

    return () => { cancelled = true; };
  }, [open, user?.id]);

  useEffect(() => {
    const query = searchQuery.trim();
    const sequence = ++searchSequenceRef.current;
    if (!open) return;
    if (!query) {
      setSearchResults(allUsers);
      setIsSearching(false);
      setLoadError('');
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      usersAPI.search(query)
        .then((result) => {
          if (sequence !== searchSequenceRef.current) return;
          setSearchResults((result.users || []).filter((candidate: Recipient) => candidate.id && candidate.id !== user?.id));
          setLoadError('');
        })
        .catch((error) => {
          if (sequence !== searchSequenceRef.current) return;
          console.error('Failed to search CodeMate recipients:', error);
          setLoadError('Could not search users. Check your connection and try again.');
        })
        .finally(() => {
          if (sequence === searchSequenceRef.current) setIsSearching(false);
        });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [open, searchQuery, allUsers, user?.id]);

  const visibleUsers = searchResults;

  const toggleUser = (candidate: Recipient) => {
    setSelectedUsers((current) => {
      if (current.some((selected) => selected.id === candidate.id)) {
        return current.filter((selected) => selected.id !== candidate.id);
      }
      return [...current, candidate];
    });
  };

  const handleSend = async () => {
    if (!post?.id || selectedUsers.length === 0 || isSending) return;
    setIsSending(true);
    const clientMessageId = requestIdRef.current || makeRequestId();
    requestIdRef.current = clientMessageId;

    try {
      const results = await Promise.allSettled(
        selectedUsers.map((recipient) => messagingAPI.sendSharedPost(recipient.id, post.id, clientMessageId)),
      );
      const delivered = results.filter((result) => result.status === 'fulfilled').length;
      const failures = results.length - delivered;

      if (failures > 0) {
        const firstFailure = results.find((result) => result.status === 'rejected');
        const reason = firstFailure?.status === 'rejected' ? firstFailure.reason : null;
        const message = reason instanceof Error ? reason.message : 'Please try again.';
        toast.error(delivered > 0
          ? `Sent to ${delivered} of ${results.length}. Retry to deliver the rest. ${message}`
          : `Post could not be sent. ${message}`);
        return;
      }

      toast.success(`Post sent to ${delivered} ${delivered === 1 ? 'person' : 'people'}`);
      setSelectedUsers([]);
      setSearchQuery('');
      requestIdRef.current = null;
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  const getName = (recipient: Recipient) => recipient.name || recipient.username || 'CodeMate user';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Post</DialogTitle>
          <DialogDescription>Choose CodeMate users to share this post in Messages.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or username..."
              className="pl-9"
              aria-label="Search CodeMate users"
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Selected recipients">
              {selectedUsers.map((recipient) => (
                <button
                  type="button"
                  key={recipient.id}
                  onClick={() => toggleUser(recipient)}
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pl-1 pr-2 text-sm text-foreground hover:bg-primary/15 disabled:opacity-60"
                  aria-label={`Remove ${getName(recipient)}`}
                >
                  <Avatar className="h-6 w-6">
                    {recipient.profilePicture && <AvatarImage src={recipient.profilePicture} alt="" />}
                    <AvatarFallback className="text-[10px]">{getInitials(getName(recipient))}</AvatarFallback>
                  </Avatar>
                  <span>{getName(recipient)}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {isLoadingUsers || isSearching ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isLoadingUsers ? 'Loading CodeMate users...' : 'Searching...'}
              </div>
            ) : loadError ? (
              <p className="px-4 py-8 text-center text-sm text-destructive">{loadError}</p>
            ) : visibleUsers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {searchQuery.trim() ? 'No users match your search.' : 'No other CodeMate users are available yet.'}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {visibleUsers.map((recipient) => (
                  (() => {
                    const selected = selectedUsers.some((candidate) => candidate.id === recipient.id);
                    return (
                      <button
                        type="button"
                        key={recipient.id}
                        onClick={() => toggleUser(recipient)}
                        disabled={isSending}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'bg-primary/10' : 'hover:bg-accent'}`}
                        aria-pressed={selected}
                      >
                        <Avatar className="h-10 w-10">
                          {recipient.profilePicture && <AvatarImage src={recipient.profilePicture} alt="" />}
                          <AvatarFallback>{getInitials(getName(recipient))}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{getName(recipient)}</span>
                          <span className="block truncate text-xs text-muted-foreground">@{recipient.username || 'user'}</span>
                        </span>
                        {selected
                          ? <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"><Check className="h-3 w-3" />Selected</span>
                          : <span className="rounded-md border border-primary/40 px-2 py-1 text-xs text-primary">Select</span>
                        }
                      </button>
                    );
                  })()
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={selectedUsers.length === 0 || isSending || isLoadingUsers}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSending ? 'Sending...' : `Send${selectedUsers.length ? ` (${selectedUsers.length})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
