import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/auth-context';
import { profileAPI } from '../../utils/api';
import {
  Users, Calendar, MessageCircle, Sparkles, UserCheck, UsersRound,
  ArrowUpRight, Code2, GitBranch, Zap, Terminal
} from 'lucide-react';
import { FollowersModal } from './FollowersModal';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onMessageUser?: (userId: string, userName: string) => void;
  onViewProfile?: (userId: string) => void;
}

const AVAILABILITY_CONFIG = {
  available: { color: 'bg-green-500', label: 'Available', textColor: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  busy: { color: 'bg-yellow-500', label: 'Busy', textColor: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  unavailable: { color: 'bg-slate-400', label: 'Unavailable', textColor: 'text-muted-foreground', bg: 'bg-muted/50 border-border' },
};

const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    label: 'AI Discover',
    desc: 'Find your perfect coding match with semantic search',
    view: 'discover',
    accent: 'text-violet-500',
    bg: 'hover:bg-primary/5 hover:border-primary/20',
  },
  {
    icon: Users,
    label: 'Browse Developers',
    desc: 'Filter by skill, location, and availability',
    view: 'discover',
    accent: 'text-cyan-500',
    bg: 'hover:bg-cyan-500/5 hover:border-cyan-500/20',
  },
  {
    icon: Calendar,
    label: 'Hackathons & Events',
    desc: 'Find upcoming events and form teams',
    view: 'events',
    accent: 'text-amber-500',
    bg: 'hover:bg-amber-500/5 hover:border-amber-500/20',
  },
  {
    icon: MessageCircle,
    label: 'Messages',
    desc: 'Chat with your collaborators in real time',
    view: 'messages',
    accent: 'text-emerald-500',
    bg: 'hover:bg-emerald-500/5 hover:border-emerald-500/20',
  },
];

export function Dashboard({ onNavigate, onMessageUser, onViewProfile }: DashboardProps) {
  const { user, updateUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');

  useEffect(() => {
    if (!user?.id) return;
    profileAPI.get(user.id).then((data: any) => {
      const p = data?.profile || data?.user;
      if (!p) return;
      updateUser({
        followers: p.followers ?? p.followersCount ?? user.followers ?? 0,
        following: p.following ?? p.followingCount ?? user.following ?? 0,
        skills: p.skills || user.skills || [],
        bio: p.bio || user.bio,
        location: p.location || user.location,
        availability: p.availability || user.availability,
        name: p.name || user.name,
      });
    }).catch(() => {});
  }, [user?.id]);

  const handleOpenModal = (type: 'followers' | 'following') => {
    setModalType(type);
    setModalOpen(true);
  };

  const avail = AVAILABILITY_CONFIG[user?.availability as keyof typeof AVAILABILITY_CONFIG] || AVAILABILITY_CONFIG.available;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header strip */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h1 className="font-mono text-sm text-muted-foreground font-medium">
              ~/dashboard
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Welcome back, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
          </h2>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium self-start sm:self-auto ${avail.bg} ${avail.textColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${avail.color} animate-pulse`} />
          {avail.label}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => handleOpenModal('followers')}
          className="group flex flex-col gap-1 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <UserCheck className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
          </div>
          <p className="font-mono text-2xl font-bold text-foreground mt-1">{user?.followers || 0}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </button>

        <button
          onClick={() => handleOpenModal('following')}
          className="group flex flex-col gap-1 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <UsersRound className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
          </div>
          <p className="font-mono text-2xl font-bold text-foreground mt-1">{user?.following || 0}</p>
          <p className="text-xs text-muted-foreground">Following</p>
        </button>

        <div className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <Code2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="font-mono text-2xl font-bold text-foreground mt-1">{user?.skills?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Skills</p>
        </div>
      </div>

      {/* Skills + bio */}
      {(user?.bio || (user?.skills && user.skills.length > 0)) && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {user?.bio && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">About</p>
              <p className="text-sm text-foreground leading-relaxed">{user.bio}</p>
            </div>
          )}
          {user?.skills && user.skills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {user.skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 border border-primary/15 text-primary text-xs font-mono font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick actions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate(action.view)}
              className={`group flex items-center gap-3 p-4 rounded-xl border border-border bg-card transition-all text-left ${action.bg}`}
            >
              <span className={`flex items-center justify-center w-8 h-8 rounded-lg bg-current/10 border border-current/15 shrink-0 ${action.accent}`}>
                <action.icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{action.desc}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Platform features strip */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">What you can do with Codemate</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y divide-border">
          {[
            { emoji: '🤖', title: 'AI Matching', desc: 'Semantic partner search' },
            { emoji: '💬', title: 'Real-time Chat', desc: 'Instant messaging' },
            { emoji: '📅', title: 'Events', desc: 'Hackathons & meetups' },
            { emoji: '👥', title: 'Social', desc: 'Posts, follows, projects' },
          ].map((f) => (
            <div key={f.title} className="p-4 space-y-1.5">
              <span className="text-xl">{f.emoji}</span>
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <FollowersModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
        userId={user?.id || ''}
        onMessageUser={onMessageUser}
        onViewProfile={onViewProfile}
      />
    </div>
  );
}
