import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/auth-context';
import {
  Home, Search, Users, Calendar, MessageCircle, User,
  Moon, Sun, LogOut, FileText, Terminal, Menu, X
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'discover', label: 'Discover', icon: Users },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
];

export function Navbar({ currentView, onNavigate, isDarkMode, toggleDarkMode }: NavbarProps) {
  const { logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-card/90 backdrop-blur-md border-b border-border shadow-[0_1px_0_0_rgba(139,92,246,0.08)]'
            : 'bg-card border-b border-border'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-1">

            {/* Brand */}
            <button
              onClick={() => handleNav('dashboard')}
              className="flex items-center gap-2 mr-4 shrink-0 group"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <Terminal className="w-4 h-4 text-primary" />
              </span>
              <span className="font-mono font-semibold text-sm tracking-tight text-foreground">
                codemate<span className="text-primary animate-pulse">_</span>
              </span>
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center flex-1 gap-0.5">
              {navItems.map((item) => {
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      active
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={toggleDarkMode}
                title={isDarkMode ? 'Light mode' : 'Dark mode'}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={logout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-3 py-3 grid grid-cols-4 gap-1">
              {navItems.map((item) => {
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md text-[10px] font-medium transition-colors ${
                      active
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={logout}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-md text-[10px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav (always visible on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.slice(0, 5).map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-md transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
