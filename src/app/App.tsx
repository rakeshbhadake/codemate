import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider, useAuth } from './utils/auth-context';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './components/dashboard/Dashboard';
import { ProfileEditor } from './components/profile/ProfileEditor';
import { OwnProfile } from './components/profile/OwnProfile';
import { UserProfile } from './components/profile/UserProfile';
import { Feed } from './components/social/Feed';
import { PostsFeed } from './components/social/PostsFeed';
import { MatchingSystem } from './components/matching/MatchingSystem';
import { ChatInterface } from './components/messaging/ChatInterface';
import { ConversationList } from './components/messaging/ConversationList';
import { SearchUsers } from './components/search/SearchUsers';
import { Toaster } from './components/ui/sonner';
import { usersAPI } from './utils/api';
import { Loader2, RefreshCw } from 'lucide-react';

// Catches any render-time error in child components and shows a recovery UI
// instead of leaving the screen completely blank.
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error boundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
          <p className="text-muted-foreground text-sm max-w-md">
            Something went wrong while rendering this page.
          </p>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          {this.state.error && (
            <p className="text-xs text-muted-foreground/60 max-w-md font-mono break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user, isLoading, handleEmailVerificationCallback } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentView, setCurrentView] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Email verification callback state
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<'idle' | 'verified' | 'expired' | 'error'>('idle');

  // Deep-link post highlight
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);

  // Messaging state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);

  // User Profile state
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Track whether to auto-open create modal in posts/events
  const [openPostCreate, setOpenPostCreate] = useState(false);
  const [openEventCreate, setOpenEventCreate] = useState(false);

  // Edit profile view: 'own-profile' | 'profile-editor'
  const [profileSubView, setProfileSubView] = useState<'own' | 'editor'>('own');

  // Initialize dark mode from localStorage — default to dark for developer aesthetic
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
      if (!savedTheme) localStorage.setItem('theme', 'dark');
    }
  }, []);

  // Handle Supabase email verification callback (URL hash contains tokens)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') && (hash.includes('type=signup') || hash.includes('type=email_change'))) {
      handleEmailVerificationCallback().then((result) => {
        if (result.verified) {
          setEmailVerificationStatus('verified');
        } else if (result.expired) {
          setEmailVerificationStatus('expired');
        } else {
          setEmailVerificationStatus('error');
        }
        // Clean up the URL hash
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, []);

  // Listen for navigate-to-post events from ChatInterface mention cards
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.postId) {
        setHighlightPostId(detail.postId);
        setCurrentView('posts');
      }
    };
    window.addEventListener('navigate-to-post', handler);
    return () => window.removeEventListener('navigate-to-post', handler);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    // Initialize history state
    if (!window.history.state) {
      window.history.replaceState({ view: currentView, viewingUserId, selectedUserId, selectedUserName }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setCurrentView(event.state.view || 'dashboard');
        setViewingUserId(event.state.viewingUserId || null);
        setSelectedUserId(event.state.selectedUserId || null);
        setSelectedUserName(event.state.selectedUserName || null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update history when view changes
  useEffect(() => {
    if (user && currentView) {
      window.history.pushState(
        { view: currentView, viewingUserId, selectedUserId, selectedUserName },
        '',
        window.location.pathname
      );
    }
  }, [currentView, viewingUserId, selectedUserId, selectedUserName, user]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    if (view !== 'messages') {
      setSelectedUserId(null);
      setSelectedUserName(null);
    }
    if (view !== 'user-profile') {
      setViewingUserId(null);
    }
    if (view === 'profile') {
      setProfileSubView('own');
    }
    // Reset create-modal flags when navigating away
    if (view !== 'posts') setOpenPostCreate(false);
    if (view !== 'events') setOpenEventCreate(false);
  };

  const handleCreatePostFromProfile = () => {
    setOpenPostCreate(true);
    setCurrentView('posts');
  };

  const handleCreateEventFromProfile = () => {
    setOpenEventCreate(true);
    setCurrentView('events');
  };

  const handleViewUserProfile = (userId: string) => {
    setViewingUserId(userId);
    setCurrentView('user-profile');
  };

  const handleSelectConversation = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  const handleMessageUser = async (userId: string, userName?: string) => {
    try {
      // If userName is provided, use it directly
      if (userName) {
        setSelectedUserId(userId);
        setSelectedUserName(userName);
        setCurrentView('messages');
      } else {
        // Otherwise, fetch the user details
        const response = await usersAPI.getById(userId);
        const targetUser = response.user;
        
        setSelectedUserId(targetUser.id);
        setSelectedUserName(targetUser.name);
        setCurrentView('messages');
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Still navigate to messages even if we can't fetch user details
      setCurrentView('messages');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    if (authView === 'login') {
      return (
        <>
          {emailVerificationStatus === 'verified' && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 shadow-md">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✓ Email verified successfully. You can now sign in.
                </p>
              </div>
            </div>
          )}
          {emailVerificationStatus === 'expired' && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 shadow-md">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                  Verification link has expired. Please register again or request a new link.
                </p>
              </div>
            </div>
          )}
          {emailVerificationStatus === 'error' && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 shadow-md">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Invalid or already-used verification link. Please sign in if your account is already active.
                </p>
              </div>
            </div>
          )}
          <LoginForm onSwitchToRegister={() => setAuthView('register')} />
        </>
      );
    }
    return <RegisterForm onSwitchToLogin={() => setAuthView('login')} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <main className="pb-20 md:pb-6">
        <ErrorBoundary>
          {currentView === 'dashboard' && (
            <Dashboard
              onMessageUser={handleMessageUser}
              onViewProfile={handleViewUserProfile}
            />
          )}
          {currentView === 'profile' && profileSubView === 'own' && (
            <OwnProfile
              onCreatePost={handleCreatePostFromProfile}
              onCreateEvent={handleCreateEventFromProfile}
              onEditProfile={() => setProfileSubView('editor')}
              onMessageUser={handleMessageUser}
              onViewProfile={handleViewUserProfile}
            />
          )}
          {currentView === 'profile' && profileSubView === 'editor' && (
            <div>
              <div className="max-w-5xl mx-auto px-4 pt-4">
                <button
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                  onClick={() => setProfileSubView('own')}
                >
                  ← Back to Profile
                </button>
              </div>
              <ProfileEditor onBack={() => setProfileSubView('own')} />
            </div>
          )}
          {currentView === 'user-profile' && viewingUserId && (
            <UserProfile
              userId={viewingUserId}
              onBack={() => handleNavigate('dashboard')}
              onMessageUser={handleMessageUser}
              onViewProfile={handleViewUserProfile}
            />
          )}
          {currentView === 'posts' && (
            <PostsFeed
              onViewProfile={handleViewUserProfile}
              highlightPostId={highlightPostId}
              openCreateModal={openPostCreate}
            />
          )}
          {currentView === 'events' && (
            <Feed openCreateModal={openEventCreate} />
          )}
          {currentView === 'discover' && (
            <MatchingSystem
              onMessage={handleMessageUser}
              onViewProfile={handleViewUserProfile}
            />
          )}
          {currentView === 'search' && (
            <SearchUsers
              onMessageUser={handleMessageUser}
              onViewProfile={handleViewUserProfile}
            />
          )}
          {currentView === 'messages' && (
            <div className="max-w-7xl mx-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${selectedUserId ? 'hidden md:block' : ''}`}>
                  <ConversationList
                    onSelectConversation={handleSelectConversation}
                    selectedUserId={selectedUserId}
                    onViewProfile={handleViewUserProfile}
                  />
                </div>
                <div className={`md:col-span-2 ${!selectedUserId ? 'hidden md:block' : ''}`}>
                  <ChatInterface
                    selectedUserId={selectedUserId}
                    selectedUserName={selectedUserName}
                    onBack={() => setSelectedUserId(null)}
                    onViewProfile={handleViewUserProfile}
                  />
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}
