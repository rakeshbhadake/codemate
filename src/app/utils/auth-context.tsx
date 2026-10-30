import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseUrl } from './supabase/info';
import { createClient } from './supabase/client';

const API_BASE = `${supabaseUrl}/functions/v1/make-server-9386b22c`;

interface User {
  id: string;
  email: string;
  name: string;
  skills: string[];
  bio: string;
  location: string;
  availability: string;
  followers: number;
  following: number;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  handleEmailVerificationCallback: () => Promise<{ verified: boolean; alreadyVerified?: boolean; expired?: boolean }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fetch the user's KV profile from the edge function.
// If it doesn't exist yet (new user), create it from the fallback data supplied by the caller.
// Normalize API response field names — edge function returns followersCount/followingCount
// but the rest of the app reads followers/following.
function normalizeProfile(raw: any): any {
  if (!raw) return raw;
  return {
    ...raw,
    followers: raw.followers ?? raw.followersCount ?? 0,
    following: raw.following ?? raw.followingCount ?? 0,
    skills: raw.skills || [],
  };
}

async function fetchOrCreateProfile(userId: string, token: string, fallback: any = {}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const body = await res.json();
      const profile = body.profile || body.user;
      if (profile) return normalizeProfile(profile);
    }
  } catch {}

  // Build a minimal profile from what we know
  const profile: any = {
    id: userId,
    email: fallback.email || '',
    name: fallback.name || fallback.email?.split('@')[0] || 'User',
    username: fallback.username || fallback.email?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '') || userId.slice(0, 8),
    skills: fallback.skills || [],
    bio: fallback.bio || '',
    location: fallback.location || '',
    availability: fallback.availability || 'available',
    followers: 0,
    following: 0,
  };

  // Persist it to the KV store — omit followers/following so existing counts aren't overwritten
  const { followers: _f, following: _fo, ...profileWithoutCounts } = profile;
  try {
    await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profileWithoutCounts),
    });
  } catch {}

  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Immediately restore from localStorage so the UI doesn't flash a login screen
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    }

    // Then verify/refresh the session via Supabase (handles token expiry, etc.)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const token = data.session.access_token;
        const meta = data.session.user.user_metadata || {};
        // Refresh profile from server to get latest followers/following/skills
        const profile = await fetchOrCreateProfile(data.session.user.id, token, {
          email: data.session.user.email,
          name: meta.name,
          username: meta.username,
          skills: meta.skills,
          bio: meta.bio,
          location: meta.location,
          availability: meta.availability,
        });
        setAccessToken(token);
        setUser(profile);
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(profile));
      } else if (!storedToken) {
        // No session anywhere — clear any stale state
        setAccessToken(null);
        setUser(null);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    // Keep token refreshed automatically as Supabase rotates it
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        const token = session.access_token;
        setAccessToken(token);
        localStorage.setItem('accessToken', token);
        // Update stored user with latest token but keep profile data
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
          try {
            const u = JSON.parse(storedUserStr);
            setUser(u);
          } catch {}
        }
      } else if (event === 'SIGNED_OUT') {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Login failed. Please try again.');

    const token = data.session.access_token;
    const meta = data.user.user_metadata || {};

    const profile = await fetchOrCreateProfile(data.user.id, token, {
      email: data.user.email,
      name: meta.name,
      username: meta.username,
      skills: meta.skills,
      bio: meta.bio,
      location: meta.location,
      availability: meta.availability,
    });

    setAccessToken(token);
    setUser(profile);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(profile));
  };

  const register = async (userData: any) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          username: userData.username,
          skills: userData.skills || [],
          bio: userData.bio || '',
          location: userData.location || '',
          availability: userData.availability || 'available',
        }
      }
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Registration failed. Please try again.');

    // If Supabase email confirmation is disabled, a session is returned immediately.
    // Create the KV profile right now so the user can use the app.
    if (data.session) {
      await fetchOrCreateProfile(data.user.id, data.session.access_token, userData);
    }
    // Otherwise the user must click the verification email.
    // Profile will be created inside handleEmailVerificationCallback.
  };

  const handleEmailVerificationCallback = async (): Promise<{
    verified: boolean;
    alreadyVerified?: boolean;
    expired?: boolean;
  }> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('expired') || msg.includes('invalid')) {
          return { verified: false, expired: true };
        }
        return { verified: false };
      }

      if (data.session) {
        const token = data.session.access_token;
        const meta = data.session.user.user_metadata || {};
        try {
          const profile = await fetchOrCreateProfile(data.session.user.id, token, {
            email: data.session.user.email,
            name: meta.name,
            username: meta.username,
            skills: meta.skills,
            bio: meta.bio,
            location: meta.location,
            availability: meta.availability,
          });
          setAccessToken(token);
          setUser(profile);
          localStorage.setItem('accessToken', token);
          localStorage.setItem('user', JSON.stringify(profile));
        } catch {}
        return { verified: true };
      }

      return { verified: false };
    } catch {
      return { verified: false };
    }
  };

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, register, logout, updateUser, handleEmailVerificationCallback, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
