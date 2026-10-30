import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to get authenticated user
const getAuthenticatedUser = async (authHeader: string | null) => {
  if (!authHeader) {
    console.log('No auth header provided');
    return null;
  }
  
  const accessToken = authHeader.split(' ')[1];
  if (!accessToken) {
    console.log('No access token in auth header');
    return null;
  }
  
  console.log('Verifying token with Supabase...');
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
  
  if (!user) {
    console.log('No user found for token');
    return null;
  }
  
  console.log('User authenticated:', user.id);
  return user;
};

// Build a minimal profile object from Supabase auth user data
const buildProfileFromAuthUser = (authUser: any): any => {
  const meta = authUser.user_metadata || {};
  const email = authUser.email || '';
  const baseUsername = (meta.username || email.split('@')[0] || authUser.id.slice(0, 8))
    .replace(/[^a-z0-9_]/gi, '').toLowerCase();
  return {
    id: authUser.id,
    email,
    name: meta.name || authUser.user_metadata?.full_name || email.split('@')[0] || 'User',
    username: baseUsername,
    bio: meta.bio || '',
    location: meta.location || '',
    availability: meta.availability || 'available',
    skills: meta.skills || [],
    followers: 0,
    following: 0,
    profilePicture: meta.avatar_url || meta.profilePicture || null,
    createdAt: authUser.created_at,
  };
};

// Fetch a KV profile, or fall back to Supabase Auth data and auto-create it.
// Never returns null for a valid auth user ID.
const getProfileOrFallback = async (userId: string): Promise<any | null> => {
  if (!userId) return null;
  const existing = await kv.get(`user:${userId}`);
  if (existing) return existing;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return null;
    const profile = buildProfileFromAuthUser(data.user);
    // Persist so subsequent lookups are fast
    await kv.set(`user:${userId}`, profile);
    return profile;
  } catch {
    return null;
  }
};

// Ensure every Supabase Auth user has a KV profile.
// Returns a flat array of all user profiles (from KV, auto-created as needed).
const syncAllAuthUsers = async (currentUserId?: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error || !data?.users) return await kv.getByPrefix('user:');

    const profiles = await Promise.all(
      data.users.map(async (authUser: any) => {
        const existing = await kv.get(`user:${authUser.id}`);
        if (existing) return existing;
        const profile = buildProfileFromAuthUser(authUser);
        await kv.set(`user:${authUser.id}`, profile);
        return profile;
      })
    );

    // Also include any KV profiles whose auth user may have been deleted
    const kvProfiles = await kv.getByPrefix('user:');
    const authIds = new Set(data.users.map((u: any) => u.id));
    const orphanProfiles = kvProfiles.filter((p: any) => p.id && !authIds.has(p.id));

    const allProfiles = [...profiles, ...orphanProfiles];
    if (currentUserId) return allProfiles.filter((p: any) => p.id !== currentUserId);
    return allProfiles;
  } catch {
    // Fall back to KV-only if admin API fails
    return await kv.getByPrefix('user:');
  }
};

// Initialize storage bucket for profile pictures
const initializeStorage = async () => {
  const bucketName = 'make-9386b22c-profile-pictures';
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      });
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('Profile pictures bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Storage initialization error:', error);
  }
};

// Initialize storage on startup
initializeStorage();

// Health check endpoint
app.get("/make-server-9386b22c/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Sign up
app.post("/make-server-9386b22c/auth/signup", async (c) => {
  try {
    const { email, password, name, username, skills, bio, location, availability } = await c.req.json();
    
    if (!email || !password || !name || !username) {
      return c.json({ error: "Email, password, name, and username are required" }, 400);
    }

    // Check if username is already taken
    const normalizedUsername = username.toLowerCase().trim();
    const existingUsername = await kv.get(`username:${normalizedUsername}`);
    if (existingUsername) {
      return c.json({ error: "Username is already taken" }, 400);
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    const userId = data.user.id;
    const userProfile = {
      id: userId,
      email,
      name,
      username: normalizedUsername,
      skills: skills || [],
      bio: bio || "",
      location: location || "",
      profilePicture: null,
      availability: availability || "available",
      createdAt: new Date().toISOString(),
      followers: 0,
      following: 0
    };

    await kv.set(`user:${userId}`, userProfile);
    // Store username mapping for uniqueness and search
    await kv.set(`username:${normalizedUsername}`, userId);

    return c.json({ 
      success: true, 
      user: userProfile
    });
  } catch (error) {
    console.log("Signup catch error:", error);
    return c.json({ error: "Failed to sign up" }, 500);
  }
});

// Sign in
app.post("/make-server-9386b22c/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("Signin error:", error);
      return c.json({ error: error.message }, 401);
    }

    // Get or auto-create the user profile
    const userProfile = await getProfileOrFallback(data.user.id);

    return c.json({
      success: true,
      accessToken: data.session.access_token,
      user: userProfile
    });
  } catch (error) {
    console.log("Signin catch error:", error);
    return c.json({ error: "Failed to sign in" }, 500);
  }
});

// Get current user session
app.get("/make-server-9386b22c/auth/session", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await getProfileOrFallback(user.id);
    return c.json({ user: userProfile });
  } catch (error) {
    console.log("Session error:", error);
    return c.json({ error: "Failed to get session" }, 500);
  }
});

// Sign out
app.post("/make-server-9386b22c/auth/signout", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '');
    
    await supabaseClient.auth.admin.signOut(accessToken || '');

    return c.json({ success: true });
  } catch (error) {
    console.log("Signout error:", error);
    return c.json({ error: "Failed to sign out" }, 500);
  }
});

// ==================== PROFILE ROUTES ====================

// Get user profile
app.get("/make-server-9386b22c/profile/:userId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = c.req.param('userId');
    const profile = await getProfileOrFallback(userId);

    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if current user follows this profile
    const isFollowing = await kv.get(`follow:${user.id}:${userId}`);

    return c.json({
      profile: {
        ...profile,
        followers: profile.followers ?? 0,
        following: profile.following ?? 0,
        isFollowing: !!isFollowing,
      }
    });
  } catch (error) {
    console.log("Get profile error:", error);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

// Update user profile
app.put("/make-server-9386b22c/profile", async (c) => {
  try {
    console.log("Profile update request received");
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      console.log("Profile update: Unauthorized - no valid user");
      return c.json({ error: "Unauthorized" }, 401);
    }

    console.log("Profile update for user:", user.id);
    const updates = await c.req.json();
    console.log("Profile updates:", updates);
    
    const currentProfile = await kv.get(`user:${user.id}`) || {};
    console.log("Current profile:", currentProfile);

    // Handle username change
    if (updates.username && updates.username !== currentProfile.username) {
      const normalizedUsername = updates.username.toLowerCase().trim();
      const existingUsername = await kv.get(`username:${normalizedUsername}`);
      
      if (existingUsername && existingUsername !== user.id) {
        return c.json({ error: "Username is already taken" }, 400);
      }
      
      // Remove old username mapping
      if (currentProfile.username) {
        await kv.del(`username:${currentProfile.username}`);
      }
      
      // Add new username mapping
      await kv.set(`username:${normalizedUsername}`, user.id);
      updates.username = normalizedUsername;
    }

    const updatedProfile = {
      ...currentProfile,
      ...updates,
      id: user.id,
      email: currentProfile.email, // Don't allow email updates
      updatedAt: new Date().toISOString()
    };

    console.log("Saving updated profile:", updatedProfile);
    await kv.set(`user:${user.id}`, updatedProfile);

    console.log("Profile updated successfully");
    return c.json({ 
      success: true,
      profile: updatedProfile
    });
  } catch (error) {
    console.log("Update profile error:", error);
    console.error("Full error details:", error);
    return c.json({ error: `Failed to update profile: ${error.message}` }, 500);
  }
});

// Check username availability
app.get("/make-server-9386b22c/profile/check-username/:username", async (c) => {
  try {
    const username = c.req.param('username').toLowerCase().trim();
    const existingUsername = await kv.get(`username:${username}`);
    
    return c.json({ 
      available: !existingUsername,
      username: username
    });
  } catch (error) {
    console.log("Check username error:", error);
    return c.json({ error: "Failed to check username" }, 500);
  }
});

// Upload profile picture
app.post("/make-server-9386b22c/profile/picture", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    // Accept both 'picture' (frontend field name) and legacy 'file'
    const file = (formData.get('picture') || formData.get('file')) as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only JPG, PNG, and WEBP are allowed" }, 400);
    }

    // Validate file size (5MB max)
    if (file.size > 5242880) {
      return c.json({ error: "File size must be less than 5MB" }, 400);
    }

    const bucketName = 'make-9386b22c-profile-pictures';
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    // Delete old profile picture if exists
    const currentProfile = await kv.get(`user:${user.id}`);
    if (currentProfile?.profilePicture) {
      const oldFileName = currentProfile.profilePicture.split('/').pop();
      await supabase.storage.from(bucketName).remove([oldFileName]);
    }

    // Upload new picture
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error("Upload error:", error);
      return c.json({ error: "Failed to upload profile picture" }, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Update profile with new picture URL
    const updatedProfile = {
      ...currentProfile,
      profilePicture: publicUrl,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ 
      success: true,
      profilePicture: publicUrl
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return c.json({ error: "Failed to upload profile picture" }, 500);
  }
});

// Delete profile picture
app.delete("/make-server-9386b22c/profile/picture", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const currentProfile = await kv.get(`user:${user.id}`);
    
    if (currentProfile?.profilePicture) {
      const bucketName = 'make-9386b22c-profile-pictures';
      const fileName = currentProfile.profilePicture.split('/').pop();
      
      await supabase.storage.from(bucketName).remove([fileName]);
      
      const updatedProfile = {
        ...currentProfile,
        profilePicture: null,
        updatedAt: new Date().toISOString()
      };

      await kv.set(`user:${user.id}`, updatedProfile);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete profile picture error:", error);
    return c.json({ error: "Failed to delete profile picture" }, 500);
  }
});

// ==================== SOCIAL ROUTES ====================

// Follow a user
app.post("/make-server-9386b22c/social/follow/:targetUserId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const targetUserId = c.req.param('targetUserId');
    
    if (user.id === targetUserId) {
      return c.json({ error: "Cannot follow yourself" }, 400);
    }

    const targetUser = await getProfileOrFallback(targetUserId);
    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Create follow relationship
    await kv.set(`follow:${user.id}:${targetUserId}`, {
      followerId: user.id,
      followingId: targetUserId,
      createdAt: new Date().toISOString()
    });

    // Update follower counts
    const currentUser = await getProfileOrFallback(user.id) || {};
    const updatedCurrentUser = {
      ...currentUser,
      following: (currentUser.following || 0) + 1
    };
    await kv.set(`user:${user.id}`, updatedCurrentUser);

    const updatedTargetUser = {
      ...targetUser,
      followers: (targetUser.followers || 0) + 1
    };
    await kv.set(`user:${targetUserId}`, updatedTargetUser);

    return c.json({ success: true });
  } catch (error) {
    console.log("Follow error:", error);
    return c.json({ error: "Failed to follow user" }, 500);
  }
});

// Unfollow a user
app.delete("/make-server-9386b22c/social/follow/:targetUserId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const targetUserId = c.req.param('targetUserId');

    // Remove follow relationship
    await kv.del(`follow:${user.id}:${targetUserId}`);

    // Update follower counts
    const currentUser = await getProfileOrFallback(user.id) || {};
    const updatedCurrentUser = {
      ...currentUser,
      following: Math.max(0, (currentUser.following || 0) - 1)
    };
    await kv.set(`user:${user.id}`, updatedCurrentUser);

    const targetUser = await getProfileOrFallback(targetUserId) || {};
    const updatedTargetUser = {
      ...targetUser,
      followers: Math.max(0, (targetUser.followers || 0) - 1)
    };
    await kv.set(`user:${targetUserId}`, updatedTargetUser);

    return c.json({ success: true });
  } catch (error) {
    console.log("Unfollow error:", error);
    return c.json({ error: "Failed to unfollow user" }, 500);
  }
});

// Get followers list
app.get("/make-server-9386b22c/social/followers/:userId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = c.req.param('userId');
    const follows = await kv.getByPrefix(`follow:`);

    const followerIds = follows
      .filter((f: any) => f.followingId === userId)
      .map((f: any) => f.followerId);

    // Use getProfileOrFallback so users without KV profiles are still resolved
    const followerProfiles = await Promise.all(
      followerIds.map((id: string) => getProfileOrFallback(id))
    );

    const currentUserFollowing = await kv.getByPrefix(`follow:${user.id}:`);
    const followingIds = new Set(currentUserFollowing.map((f: any) => f.followingId));

    const followersWithStatus = followerProfiles
      .filter(Boolean)
      .map((profile: any) => ({
        ...profile,
        isFollowing: followingIds.has(profile.id)
      }));

    return c.json({ users: followersWithStatus });
  } catch (error) {
    console.log("Get followers error:", error);
    return c.json({ error: "Failed to get followers" }, 500);
  }
});

// Get following list
app.get("/make-server-9386b22c/social/following/:userId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = c.req.param('userId');
    const follows = await kv.getByPrefix(`follow:${userId}:`);

    const followingIds2 = follows.map((f: any) => f.followingId);

    const followingProfiles = await Promise.all(
      followingIds2.map((id: string) => getProfileOrFallback(id))
    );

    const currentUserFollowing = await kv.getByPrefix(`follow:${user.id}:`);
    const currentFollowingSet = new Set(currentUserFollowing.map((f: any) => f.followingId));

    const followingWithStatus = followingProfiles
      .filter(Boolean)
      .map((profile: any) => ({
        ...profile,
        isFollowing: currentFollowingSet.has(profile.id)
      }));

    return c.json({ users: followingWithStatus });
  } catch (error) {
    console.log("Get following error:", error);
    return c.json({ error: "Failed to get following" }, 500);
  }
});

// ==================== EVENT ROUTES ====================

// Create event post
app.post("/make-server-9386b22c/events", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const contentType = c.req.header('Content-Type') || '';
    let body: any = {};
    let bannerFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      for (const [key, value] of formData.entries()) {
        if (key === 'banner' && value instanceof File) {
          bannerFile = value;
        } else if (typeof value === 'string') {
          try { body[key] = JSON.parse(value); } catch { body[key] = value; }
        }
      }
    } else {
      body = await c.req.json();
    }

    const { title, description, date } = body;
    if (!title || !description || !date) {
      return c.json({ error: "Title, description, and date are required" }, 400);
    }

    const eventId = generateId();
    let bannerUrl = body.bannerUrl || null;

    if (bannerFile) {
      try {
        const bucketName = 'make-9386b22c-media';
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some(b => b.name === bucketName)) {
          await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 52428800 });
        }
        const fileName = `events/${eventId}/${Date.now()}_${bannerFile.name}`;
        const buffer = new Uint8Array(await bannerFile.arrayBuffer());
        const { error: uploadErr } = await supabase.storage.from(bucketName).upload(fileName, buffer, { contentType: bannerFile.type, upsert: false });
        if (!uploadErr) {
          const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 60 * 60 * 24 * 365);
          if (signedData) bannerUrl = signedData.signedUrl;
        }
      } catch (e) { console.error('Banner upload error:', e); }
    }

    // Store ALL fields from the frontend — never discard any known field
    const event = {
      id: eventId,
      authorId: user.id,
      title,
      description,
      date,
      location: body.location || "",
      locationLink: body.locationLink || "",
      link: body.link || "",
      requiredSkills: body.requiredSkills || [],
      problemStatement: body.problemStatement || "",
      minTeamSize: body.minTeamSize || 1,
      maxTeamSize: body.maxTeamSize || 5,
      registrationDeadline: body.registrationDeadline || null,
      maxTeams: body.maxTeams || null,
      prizePool: body.prizePool || null,
      eligibility: body.eligibility || "Open to everyone",
      mode: body.mode || "Online",
      category: body.category || "Hackathon",
      technologies: body.technologies || [],
      bannerUrl,
      likes: 0,
      commentCount: 0,
      createdAt: new Date().toISOString()
    };

    await kv.set(`event:${eventId}`, event);

    return c.json({ success: true, event });
  } catch (error) {
    console.log("Create event error:", error);
    return c.json({ error: "Failed to create event" }, 500);
  }
});

// Get all events (feed)
app.get("/make-server-9386b22c/events", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const allEventEntries = await kv.getByPrefix(`event:`);
    // Filter to only top-level event objects (not likes/comments/regs stored under event: prefix)
    const events = allEventEntries.filter((e: any) => e.id && e.authorId && e.title);

    const eventsWithAuthors = await Promise.all(
      events.map(async (event: any) => {
        const author = await getProfileOrFallback(event.authorId);
        const isLiked = await kv.get(`event-like:${event.id}:${user.id}`);
        return {
          ...event,
          author,
          isLiked: !!isLiked
        };
      })
    );

    // Sort by event date ascending, fall back to creation date
    eventsWithAuthors.sort((a, b) => {
      const aDate = a.date || a.createdAt;
      const bDate = b.date || b.createdAt;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    return c.json({ events: eventsWithAuthors });
  } catch (error) {
    console.log("Get events error:", error);
    return c.json({ error: "Failed to get events" }, 500);
  }
});

// Get single event
app.get("/make-server-9386b22c/events/:eventId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    const author = await getProfileOrFallback(event.authorId);
    const isLiked = await kv.get(`event-like:${event.id}:${user.id}`);

    return c.json({
      event: {
        ...event,
        author,
        isLiked: !!isLiked
      }
    });
  } catch (error) {
    console.log("Get event error:", error);
    return c.json({ error: "Failed to get event" }, 500);
  }
});

// Like event
app.post("/make-server-9386b22c/events/:eventId/like", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    // Check if already liked
    const existingLike = await kv.get(`event-like:${eventId}:${user.id}`);
    if (existingLike) {
      return c.json({ error: "Already liked" }, 400);
    }

    // Create like
    await kv.set(`event-like:${eventId}:${user.id}`, {
      eventId,
      userId: user.id,
      createdAt: new Date().toISOString()
    });

    // Update like count
    const updatedEvent = {
      ...event,
      likes: (event.likes || 0) + 1
    };
    await kv.set(`event:${eventId}`, updatedEvent);

    return c.json({ success: true, likes: updatedEvent.likes });
  } catch (error) {
    console.log("Like event error:", error);
    return c.json({ error: "Failed to like event" }, 500);
  }
});

// Unlike event
app.delete("/make-server-9386b22c/events/:eventId/like", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    // Remove like
    await kv.del(`event-like:${eventId}:${user.id}`);

    // Update like count
    const updatedEvent = {
      ...event,
      likes: Math.max(0, (event.likes || 0) - 1)
    };
    await kv.set(`event:${eventId}`, updatedEvent);

    return c.json({ success: true, likes: updatedEvent.likes });
  } catch (error) {
    console.log("Unlike event error:", error);
    return c.json({ error: "Failed to unlike event" }, 500);
  }
});

// Delete event
app.delete("/make-server-9386b22c/events/:eventId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    // Only the author can delete their event
    if (event.authorId !== user.id) {
      return c.json({ error: "Forbidden: You can only delete your own events" }, 403);
    }

    // Delete the event
    await kv.del(`event:${eventId}`);

    // Delete all likes for this event
    const likes = await kv.getByPrefix(`event-like:${eventId}:`);
    for (const like of likes) {
      await kv.del(`event-like:${eventId}:${like.userId}`);
    }

    // Delete all comments for this event
    const comments = await kv.getByPrefix(`event-comment:${eventId}:`);
    for (const comment of comments) {
      await kv.del(`event-comment:${eventId}:${comment.id}`);
    }

    return c.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.log("Delete event error:", error);
    return c.json({ error: "Failed to delete event" }, 500);
  }
});

// Comment on event
app.post("/make-server-9386b22c/events/:eventId/comments", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');
    const { text } = await c.req.json();

    if (!text) {
      return c.json({ error: "Comment text is required" }, 400);
    }

    const event = await kv.get(`event:${eventId}`);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    const commentId = generateId();
    const comment = {
      id: commentId,
      eventId,
      userId: user.id,
      text,
      createdAt: new Date().toISOString()
    };

    await kv.set(`event-comment:${eventId}:${commentId}`, comment);

    // Update comment count
    const updatedEvent = {
      ...event,
      commentCount: (event.commentCount || 0) + 1
    };
    await kv.set(`event:${eventId}`, updatedEvent);

    // Get user profile for response
    const userProfile = await getProfileOrFallback(user.id);

    return c.json({
      success: true,
      comment: {
        ...comment,
        user: userProfile
      }
    });
  } catch (error) {
    console.log("Comment error:", error);
    return c.json({ error: "Failed to add comment" }, 500);
  }
});

// Get event comments
app.get("/make-server-9386b22c/events/:eventId/comments", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const eventId = c.req.param('eventId');
    const comments = await kv.getByPrefix(`event-comment:${eventId}:`);

    // Get user profiles for each comment
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment: any) => {
        const userProfile = await getProfileOrFallback(comment.userId);
        return {
          ...comment,
          user: userProfile
        };
      })
    );

    // Sort by creation date (oldest first)
    commentsWithUsers.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return c.json({ comments: commentsWithUsers });
  } catch (error) {
    console.log("Get comments error:", error);
    return c.json({ error: "Failed to get comments" }, 500);
  }
});

// ==================== MESSAGING ROUTES ====================

// Send message
app.post("/make-server-9386b22c/messages/send", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { recipientId, text } = await c.req.json();

    if (!recipientId || !text) {
      return c.json({ error: "Recipient ID and text are required" }, 400);
    }

    const recipient = await getProfileOrFallback(recipientId);
    if (!recipient) {
      return c.json({ error: "Recipient not found" }, 404);
    }

    const messageId = generateId();
    // Create conversation ID (always use smaller userId first for consistency)
    const conversationId = [user.id, recipientId].sort().join(':');
    
    const message = {
      id: messageId,
      conversationId,
      senderId: user.id,
      recipientId,
      text,
      read: false,
      createdAt: new Date().toISOString()
    };

    await kv.set(`message:${conversationId}:${messageId}`, message);

    // Update conversation metadata
    await kv.set(`conversation:${conversationId}`, {
      id: conversationId,
      participants: [user.id, recipientId],
      lastMessage: text,
      lastMessageAt: message.createdAt
    });

    return c.json({ success: true, message });
  } catch (error) {
    console.log("Send message error:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Get conversation messages
app.get("/make-server-9386b22c/messages/:otherUserId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    const conversationId = [user.id, otherUserId].sort().join(':');

    const messages = await kv.getByPrefix(`message:${conversationId}:`);

    // Sort by creation date (oldest first)
    messages.sort((a: any, b: any) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return c.json({ messages });
  } catch (error) {
    console.log("Get messages error:", error);
    return c.json({ error: "Failed to get messages" }, 500);
  }
});

// Get all conversations
app.get("/make-server-9386b22c/messages/conversations/list", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const allConversations = await kv.getByPrefix(`conversation:`);
    
    // Filter conversations where user is a participant
    const userConversations = allConversations.filter((conv: any) => 
      conv.participants.includes(user.id)
    );

    const conversationsWithProfiles = await Promise.all(
      userConversations.map(async (conv: any) => {
        const otherUserId = conv.participants?.find((id: string) => id !== user.id);
        const otherUser = otherUserId ? await getProfileOrFallback(otherUserId) : null;
        return {
          ...conv,
          otherUser
        };
      })
    );

    // Sort by last message time
    conversationsWithProfiles.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return c.json({ conversations: conversationsWithProfiles });
  } catch (error) {
    console.log("Get conversations error:", error);
    return c.json({ error: "Failed to get conversations" }, 500);
  }
});

// ==================== MATCHING ROUTES ====================

// Search users by username or name (MUST come before other routes to avoid conflicts)
app.get("/make-server-9386b22c/users/search", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const query = c.req.query('q')?.toLowerCase().trim() || '';

    if (!query) {
      return c.json({ users: [] });
    }

    // Sync all auth users to KV so we don't miss anyone who registered
    const allUsers = await syncAllAuthUsers(user.id);

    const matchingUsers = allUsers.filter((u: any) =>
      u.id && u.id !== user.id && (
        u.username?.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.skills?.some((s: string) => s.toLowerCase().includes(query)) ||
        u.bio?.toLowerCase().includes(query) ||
        u.location?.toLowerCase().includes(query)
      )
    );

    const usersWithFollowStatus = await Promise.all(
      matchingUsers.slice(0, 20).map(async (u: any) => {
        const isFollowing = await kv.get(`follow:${user.id}:${u.id}`);
        return { ...u, isFollowing: !!isFollowing };
      })
    );

    return c.json({ users: usersWithFollowStatus });
  } catch (error) {
    console.log("Search users error:", error);
    return c.json({ error: "Failed to search users" }, 500);
  }
});

// Get all users for discovery (MUST come before /:userId to avoid matching "discover" as a userId)
app.get("/make-server-9386b22c/users/discover", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Sync all auth users to KV so newly registered users appear immediately
    const allUsers = await syncAllAuthUsers(user.id);

    const usersWithFollowStatus = await Promise.all(
      allUsers.filter((u: any) => u.id).map(async (u: any) => {
        const isFollowing = await kv.get(`follow:${user.id}:${u.id}`);
        return { ...u, isFollowing: !!isFollowing };
      })
    );

    return c.json({ users: usersWithFollowStatus });
  } catch (error) {
    console.log("Discover users error:", error);
    return c.json({ error: "Failed to discover users" }, 500);
  }
});

// Get single user by ID (MUST come after /discover to avoid route conflicts)
app.get("/make-server-9386b22c/users/:userId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = c.req.param('userId');
    const userProfile = await getProfileOrFallback(userId);

    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const isFollowing = await kv.get(`follow:${user.id}:${userId}`);

    return c.json({ 
      user: {
        ...userProfile,
        isFollowing: !!isFollowing
      }
    });
  } catch (error) {
    console.log("Get user error:", error);
    return c.json({ error: "Failed to get user" }, 500);
  }
});

// AI-powered matching with Google Gemini
app.post("/make-server-9386b22c/matching/ai-suggest", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { query, filters } = await c.req.json();
    const currentUserProfile = await getProfileOrFallback(user.id);
    const allUsers = await syncAllAuthUsers(user.id);

    // --- Step 1: Parse query into structured criteria using Gemini or keyword extraction ---
    let criteria: any = {
      skills: [] as string[],
      location: filters?.location && filters.location !== 'any' ? filters.location : '',
      availability: filters?.availability && filters.availability !== 'any' ? filters.availability : '',
      interests: [] as string[],
    };

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiApiKey && query) {
      try {
        const parsePrompt = `Extract structured search criteria from this developer search query. Return ONLY valid JSON, nothing else.

Query: "${query}"

Return JSON with these keys:
{
  "skills": [array of programming languages/technologies mentioned],
  "location": "city or region mentioned, or empty string",
  "availability": "available|busy|any if mentioned",
  "interests": [any project types, domains, or collaboration interests mentioned]
}`;

        const parseRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: parsePrompt }] }] })
          }
        );
        if (parseRes.ok) {
          const parseData = await parseRes.json();
          const rawText = parseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            criteria = {
              skills: parsed.skills || criteria.skills,
              location: parsed.location || criteria.location,
              availability: parsed.availability && parsed.availability !== 'any' ? parsed.availability : criteria.availability,
              interests: parsed.interests || criteria.interests,
            };
          }
        }
      } catch { /* fall through to keyword extraction */ }
    }

    // Keyword fallback: extract skills/location from query text
    if (query && criteria.skills.length === 0) {
      const techKeywords = ['python', 'javascript', 'typescript', 'react', 'node', 'java', 'kotlin', 'swift',
        'flutter', 'dart', 'go', 'rust', 'c++', 'c#', 'ruby', 'php', 'sql', 'mongodb', 'postgresql',
        'aws', 'docker', 'kubernetes', 'machine learning', 'ml', 'ai', 'tensorflow', 'pytorch',
        'django', 'flask', 'spring', 'angular', 'vue', 'next.js', 'graphql', 'redis', 'firebase'];
      const qLower = query.toLowerCase();
      criteria.skills = techKeywords.filter(k => qLower.includes(k));
    }

    // Merge with explicit filters
    if (filters?.skills?.length > 0) {
      criteria.skills = [...new Set([...criteria.skills, ...filters.skills])];
    }

    // --- Step 2: Score each user with a weighted algorithm ---
    // Weights: Skills 40%, Availability 15%, Location 20%, Bio/interests 25%
    const scoreUser = (u: any): { score: number; matchedSkills: string[] } => {
      let total = 0;
      const matchedSkills: string[] = [];

      // Skill relevance (40 pts)
      if (criteria.skills.length > 0 && u.skills?.length > 0) {
        const userSkillsLower = (u.skills as string[]).map((s: string) => s.toLowerCase());
        criteria.skills.forEach((cs: string) => {
          const csLower = cs.toLowerCase();
          const match = userSkillsLower.find((us: string) => us.includes(csLower) || csLower.includes(us));
          if (match) {
            matchedSkills.push(u.skills[userSkillsLower.indexOf(match)]);
            total += 40 / criteria.skills.length;
          }
        });
      } else if (criteria.skills.length === 0) {
        total += 20; // no skill filter — partial credit
      }

      // Availability (15 pts)
      if (criteria.availability) {
        if (u.availability?.toLowerCase() === criteria.availability.toLowerCase()) total += 15;
      } else {
        if (u.availability === 'available') total += 10;
        else total += 5;
      }

      // Location (20 pts)
      if (criteria.location) {
        const uLoc = u.location?.toLowerCase() || '';
        const cLoc = criteria.location.toLowerCase();
        if (uLoc === cLoc) total += 20;
        else if (uLoc.includes(cLoc) || cLoc.includes(uLoc)) total += 12;
      } else {
        total += 10; // no location filter — neutral
      }

      // Bio/interests relevance (25 pts)
      const bioText = `${u.bio || ''} ${(u.skills || []).join(' ')}`.toLowerCase();
      if (query) {
        const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        const matchCount = queryWords.filter((w: string) => bioText.includes(w)).length;
        total += Math.min(25, (matchCount / Math.max(1, queryWords.length)) * 25);
      } else if (criteria.interests.length > 0) {
        const interestMatches = criteria.interests.filter((i: string) => bioText.includes(i.toLowerCase())).length;
        total += Math.min(25, (interestMatches / criteria.interests.length) * 25);
      } else {
        total += 12;
      }

      return { score: Math.round(Math.min(100, Math.max(0, total))), matchedSkills };
    };

    // Score and filter
    const scoredUsers = allUsers
      .filter((u: any) => u && u.id)
      .map((u: any) => {
        const { score, matchedSkills } = scoreUser(u);
        return { ...u, matchScore: score, matchedSkills };
      })
      .filter((u: any) => {
        // Must have at least minimal relevance
        if (criteria.skills.length > 0 && u.matchedSkills.length === 0 && query) return u.matchScore >= 20;
        return u.matchScore >= 15;
      })
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 20);

    // If we have Gemini and a query, use it for final re-ranking
    if (geminiApiKey && query && scoredUsers.length > 1) {
      try {
        const rankPrompt = `Re-rank these developer profiles for the query: "${query}"

Profiles:
${scoredUsers.slice(0, 15).map((u: any, i: number) =>
  `${i + 1}. ${u.name} | Skills: ${u.skills?.join(', ') || 'None'} | Bio: ${(u.bio || '').slice(0, 100)} | Location: ${u.location || 'N/A'}`
).join('\n')}

Return ONLY a JSON array of 1-based indices in order of relevance (best match first), e.g.: [3,1,5,2]`;

        const rankRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: rankPrompt }] }] })
          }
        );
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          const rankText = rankData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const rankMatch = rankText.match(/\[[\d,\s]+\]/);
          if (rankMatch) {
            const ranking: number[] = JSON.parse(rankMatch[0]);
            const reranked = ranking
              .map((idx: number) => scoredUsers[idx - 1])
              .filter(Boolean);
            // Preserve any users not in ranking
            const inRanking = new Set(ranking.map((idx: number) => idx - 1));
            const rest = scoredUsers.filter((_: any, i: number) => !inRanking.has(i));
            return c.json({ matches: [...reranked, ...rest].slice(0, 15), criteria, method: 'ai-ranked' });
          }
        }
      } catch { /* fall through */ }
    }

    return c.json({ matches: scoredUsers.slice(0, 15), criteria, method: query ? 'scored' : 'browse' });
  } catch (error) {
    console.log("Matching error:", error);
    return c.json({ error: "Failed to find matches" }, 500);
  }
});

// AI Chatbot for natural language partner queries
app.post("/make-server-9386b22c/matching/chatbot", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { message } = await c.req.json();
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return c.json({ 
        response: "I'm sorry, but the AI chatbot is not configured yet. Please ask the administrator to add a GEMINI_API_KEY.",
        suggestions: []
      });
    }

    const currentUserProfile = await getProfileOrFallback(user.id);
    const otherUsers = await syncAllAuthUsers(user.id);

    const prompt = `You are a friendly AI matchmaking assistant called "Codemate AI" that helps developers find coding partners.

Current user profile:
- Name: ${currentUserProfile.name}
- Skills: ${currentUserProfile.skills?.join(', ') || 'None'}
- Bio: ${currentUserProfile.bio || 'None'}
- Location: ${currentUserProfile.location || 'Not specified'}

User message: "${message}"

Available developers in the platform:
${otherUsers.slice(0, 15).map((u: any) => 
  `- ${u.name}: Skills: ${u.skills?.join(', ') || 'None'}, Location: ${u.location || 'Unknown'}, Bio: ${u.bio || 'No bio'}`
).join('\n')}

Respond in a friendly, conversational way. If the user is asking for partner recommendations, suggest 2-3 specific developers from the list above and explain why they're good matches. Keep your response concise (2-3 sentences max).`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process your request.";

    return c.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log("Chatbot error:", error);
    return c.json({ error: "Failed to process chatbot request" }, 500);
  }
});

// ==================== EVENT REGISTRATION ROUTES ====================

app.post("/make-server-9386b22c/events/:eventId/register", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);
    if (!event) return c.json({ error: "Event not found" }, 404);
    const data = await c.req.json();
    const regId = generateId();
    const registration = { id: regId, eventId, userId: user.id, ...data, status: 'pending', createdAt: new Date().toISOString() };
    await kv.set(`event-reg:${eventId}:${regId}`, registration);
    const regList = await kv.get(`event-regs:${eventId}`) || [];
    if (!regList.includes(regId)) { regList.push(regId); await kv.set(`event-regs:${eventId}`, regList); }
    return c.json({ success: true, registration });
  } catch (error) {
    console.log("Register event error:", error);
    return c.json({ error: "Failed to register for event" }, 500);
  }
});

app.get("/make-server-9386b22c/events/:eventId/registrations", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const eventId = c.req.param('eventId');
    const registrations = await kv.getByPrefix(`event-reg:${eventId}:`);
    const enriched = await Promise.all(registrations.map(async (reg: any) => {
      const regUser = await getProfileOrFallback(reg.userId);
      return { ...reg, user: regUser };
    }));
    enriched.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return c.json({ registrations: enriched });
  } catch (error) {
    console.log("Get registrations error:", error);
    return c.json({ error: "Failed to get registrations" }, 500);
  }
});

app.put("/make-server-9386b22c/events/:eventId/registrations/:regId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { eventId, regId } = c.req.param();
    const reg = await kv.get(`event-reg:${eventId}:${regId}`);
    if (!reg) return c.json({ error: "Registration not found" }, 404);
    const updates = await c.req.json();
    const updated = { ...reg, ...updates, id: regId, eventId, updatedAt: new Date().toISOString() };
    await kv.set(`event-reg:${eventId}:${regId}`, updated);
    return c.json({ success: true, registration: updated });
  } catch (error) {
    console.log("Update registration error:", error);
    return c.json({ error: "Failed to update registration" }, 500);
  }
});

// ==================== POSTS ROUTES ====================

app.get("/make-server-9386b22c/posts/bookmarks", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const bookmarkKeys = await kv.getByPrefix(`bookmark:${user.id}:`);
    const posts = await Promise.all(bookmarkKeys.map(async (bm: any) => {
      const post = await kv.get(`post:${bm.postId}`);
      if (!post) return null;
      const author = await getProfileOrFallback(post.authorId);
      const liked = await kv.get(`post-like:${bm.postId}:${user.id}`);
      const comments = await kv.getByPrefix(`post-comment:${bm.postId}:`);
      return { ...post, author, likes: post.likes || 0, isLiked: !!liked, commentCount: comments.length, isBookmarked: true };
    }));
    return c.json({ posts: posts.filter(Boolean) });
  } catch (error) {
    return c.json({ error: "Failed to get bookmarks" }, 500);
  }
});

app.get("/make-server-9386b22c/posts/trending", async (c) => {
  try {
    const trending = await kv.getByPrefix('trending:');
    trending.sort((a: any, b: any) => b.count - a.count);
    return c.json({ trending: trending.slice(0, 10) });
  } catch (error) {
    return c.json({ error: "Failed to get trending" }, 500);
  }
});

app.get("/make-server-9386b22c/posts/user/:userId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param('userId');
    const allPosts = await kv.getByPrefix('post:');
    const userPosts = allPosts
      .filter((p: any) => p.authorId === userId && !p.postId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const enriched = await Promise.all(userPosts.map(async (post: any) => {
      const author = await getProfileOrFallback(post.authorId);
      const liked = await kv.get(`post-like:${post.id}:${user.id}`);
      const bmKey = await kv.get(`bookmark:${user.id}:${post.id}`);
      const comments = await kv.getByPrefix(`post-comment:${post.id}:`);
      return { ...post, author, likes: post.likes || 0, isLiked: !!liked, commentCount: comments.length, isBookmarked: !!bmKey };
    }));
    return c.json({ posts: enriched });
  } catch (error) {
    return c.json({ error: "Failed to get user posts" }, 500);
  }
});

app.get("/make-server-9386b22c/posts/:postId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: "Post not found" }, 404);
    const author = await getProfileOrFallback(post.authorId);
    const liked = await kv.get(`post-like:${postId}:${user.id}`);
    const bmKey = await kv.get(`bookmark:${user.id}:${postId}`);
    const comments = await kv.getByPrefix(`post-comment:${postId}:`);
    return c.json({ post: { ...post, author, likes: post.likes || 0, isLiked: !!liked, commentCount: comments.length, isBookmarked: !!bmKey } });
  } catch (error) {
    return c.json({ error: "Failed to get post" }, 500);
  }
});

app.get("/make-server-9386b22c/posts", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const allPosts = await kv.getByPrefix('post:');
    // Filter out sub-keys (comments, likes stored under post: prefix by accident)
    const posts = allPosts
      .filter((p: any) => p.id && p.authorId && p.createdAt && !p.postId && !p.userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const enriched = await Promise.all(posts.map(async (post: any) => {
      const author = await getProfileOrFallback(post.authorId);
      const liked = await kv.get(`post-like:${post.id}:${user.id}`);
      const bmKey = await kv.get(`bookmark:${user.id}:${post.id}`);
      const comments = await kv.getByPrefix(`post-comment:${post.id}:`);
      return { ...post, author, likes: post.likes || 0, isLiked: !!liked, commentCount: comments.length, isBookmarked: !!bmKey };
    }));
    return c.json({ posts: enriched });
  } catch (error) {
    return c.json({ error: "Failed to get posts" }, 500);
  }
});

app.post("/make-server-9386b22c/posts", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const contentType = c.req.header('Content-Type') || '';
    let caption = '', link = '', linkText = '', hashtags: string[] = [];
    const media: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      caption = formData.get('caption') as string || '';
      link = formData.get('link') as string || '';
      linkText = formData.get('linkText') as string || '';
      const hashtagsJson = formData.get('hashtags') as string;
      hashtags = hashtagsJson ? JSON.parse(hashtagsJson) : [];

      const mediaFiles = formData.getAll('media');
      if (mediaFiles.length > 0) {
        const bucketName = 'make-9386b22c-media';
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some(b => b.name === bucketName)) {
          await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 52428800 });
        }
        for (const file of mediaFiles) {
          if (file instanceof File && file.size > 0) {
            try {
              const fileName = `posts/${user.id}/${Date.now()}_${file.name}`;
              const buffer = new Uint8Array(await file.arrayBuffer());
              const { error: uploadErr } = await supabase.storage.from(bucketName).upload(fileName, buffer, { contentType: file.type });
              if (!uploadErr) {
                const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 60 * 60 * 24 * 365);
                if (signedData) media.push({ url: signedData.signedUrl, type: file.type.startsWith('video/') ? 'video' : 'image', fileName });
              }
            } catch {}
          }
        }
      }
    } else {
      const body = await c.req.json();
      caption = body.caption || '';
      link = body.link || '';
      linkText = body.linkText || '';
      hashtags = body.hashtags || [];
    }

    const postId = generateId();
    const post = { id: postId, authorId: user.id, caption, media, link, linkText, hashtags, likes: 0, createdAt: new Date().toISOString() };
    await kv.set(`post:${postId}`, post);

    for (const tag of hashtags) {
      const td = await kv.get(`trending:${tag}`) || { hashtag: tag, count: 0 };
      td.count += 1;
      await kv.set(`trending:${tag}`, td);
    }

    return c.json({ post });
  } catch (error) {
    console.log("Create post error:", error);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

app.put("/make-server-9386b22c/posts/:postId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: "Post not found" }, 404);
    if (post.authorId !== user.id) return c.json({ error: "Forbidden" }, 403);
    const updates = await c.req.json();
    const updated = { ...post, ...updates, id: postId, authorId: user.id };
    await kv.set(`post:${postId}`, updated);
    return c.json({ post: updated });
  } catch (error) {
    return c.json({ error: "Failed to update post" }, 500);
  }
});

app.delete("/make-server-9386b22c/posts/:postId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: "Post not found" }, 404);
    if (post.authorId !== user.id) return c.json({ error: "Forbidden" }, 403);
    await kv.del(`post:${postId}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete post" }, 500);
  }
});

app.post("/make-server-9386b22c/posts/:postId/like", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: "Post not found" }, 404);
    const existing = await kv.get(`post-like:${postId}:${user.id}`);
    if (existing) return c.json({ success: true, likes: post.likes || 0 });
    await kv.set(`post-like:${postId}:${user.id}`, { postId, userId: user.id, createdAt: new Date().toISOString() });
    const updated = { ...post, likes: (post.likes || 0) + 1 };
    await kv.set(`post:${postId}`, updated);
    return c.json({ success: true, likes: updated.likes });
  } catch (error) {
    return c.json({ error: "Failed to like post" }, 500);
  }
});

app.delete("/make-server-9386b22c/posts/:postId/like", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: "Post not found" }, 404);
    await kv.del(`post-like:${postId}:${user.id}`);
    const updated = { ...post, likes: Math.max(0, (post.likes || 0) - 1) };
    await kv.set(`post:${postId}`, updated);
    return c.json({ success: true, likes: updated.likes });
  } catch (error) {
    return c.json({ error: "Failed to unlike post" }, 500);
  }
});

app.post("/make-server-9386b22c/posts/:postId/comments", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    const { text } = await c.req.json();
    const commentId = generateId();
    const comment = { id: commentId, postId, userId: user.id, text, createdAt: new Date().toISOString() };
    await kv.set(`post-comment:${postId}:${commentId}`, comment);
    return c.json({ comment });
  } catch (error) {
    return c.json({ error: "Failed to add comment" }, 500);
  }
});

app.get("/make-server-9386b22c/posts/:postId/comments", async (c) => {
  try {
    const postId = c.req.param('postId');
    const comments = await kv.getByPrefix(`post-comment:${postId}:`);
    const enriched = await Promise.all(comments.map(async (comment: any) => {
      const author = await getProfileOrFallback(comment.userId);
      return { ...comment, user: author };
    }));
    enriched.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return c.json({ comments: enriched });
  } catch (error) {
    return c.json({ error: "Failed to get comments" }, 500);
  }
});

app.post("/make-server-9386b22c/posts/:postId/bookmark", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    await kv.set(`bookmark:${user.id}:${postId}`, { userId: user.id, postId, createdAt: new Date().toISOString() });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to bookmark post" }, 500);
  }
});

app.delete("/make-server-9386b22c/posts/:postId/bookmark", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const postId = c.req.param('postId');
    await kv.del(`bookmark:${user.id}:${postId}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to remove bookmark" }, 500);
  }
});

// ==================== PROJECTS ROUTES ====================

// Create a project
app.post("/make-server-9386b22c/projects", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    let projectData: any = {};
    const contentType = c.req.header('Content-Type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const thumbnailFile = formData.get('thumbnail') as File | null;

      // Parse array fields from JSON strings
      const parseField = (v: FormDataEntryValue | null) => {
        if (!v) return undefined;
        const s = v.toString();
        try { return JSON.parse(s); } catch { return s; }
      };

      projectData = {
        title: formData.get('title')?.toString() || '',
        shortDescription: formData.get('shortDescription')?.toString() || '',
        description: formData.get('description')?.toString() || '',
        technologies: parseField(formData.get('technologies')) || [],
        category: formData.get('category')?.toString() || 'Other',
        githubUrl: formData.get('githubUrl')?.toString() || '',
        demoUrl: formData.get('demoUrl')?.toString() || '',
        status: formData.get('status')?.toString() || 'In Progress',
        tags: parseField(formData.get('tags')) || [],
      };

      if (thumbnailFile && thumbnailFile.size > 0) {
        const bucketName = 'make-9386b22c-profile-pictures';
        const ext = thumbnailFile.name.split('.').pop();
        const fileName = `project-${user.id}-${Date.now()}.${ext}`;
        const arrayBuf = await thumbnailFile.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, arrayBuf, { contentType: thumbnailFile.type, upsert: false });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
          projectData.thumbnailUrl = urlData.publicUrl;
        }
      }
    } else {
      projectData = await c.req.json();
    }

    if (!projectData.title) return c.json({ error: "Project title is required" }, 400);

    const projectId = generateId();
    const project = {
      id: projectId,
      authorId: user.id,
      title: projectData.title,
      shortDescription: projectData.shortDescription || '',
      description: projectData.description || '',
      technologies: projectData.technologies || [],
      category: projectData.category || 'Other',
      githubUrl: projectData.githubUrl || '',
      demoUrl: projectData.demoUrl || '',
      status: projectData.status || 'In Progress',
      tags: projectData.tags || [],
      thumbnailUrl: projectData.thumbnailUrl || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`project:${projectId}`, project);

    const author = await getProfileOrFallback(user.id);
    return c.json({ success: true, project: { ...project, author } });
  } catch (error) {
    console.log("Create project error:", error);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

// Get projects by user
app.get("/make-server-9386b22c/projects/user/:userId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const userId = c.req.param('userId');
    const allProjects = await kv.getByPrefix('project:');
    const userProjects = allProjects
      .filter((p: any) => p && p.authorId === userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const author = await getProfileOrFallback(userId);
    const projectsWithAuthor = userProjects.map((p: any) => ({ ...p, author }));
    return c.json({ projects: projectsWithAuthor });
  } catch (error) {
    console.log("Get projects by user error:", error);
    return c.json({ error: "Failed to get projects" }, 500);
  }
});

// Get single project
app.get("/make-server-9386b22c/projects/:projectId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param('projectId');
    const project = await kv.get(`project:${projectId}`);
    if (!project) return c.json({ error: "Project not found" }, 404);

    const author = await getProfileOrFallback(project.authorId);
    return c.json({ project: { ...project, author } });
  } catch (error) {
    return c.json({ error: "Failed to get project" }, 500);
  }
});

// Update project (owner only)
app.put("/make-server-9386b22c/projects/:projectId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param('projectId');
    const project = await kv.get(`project:${projectId}`);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.authorId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const updates = await c.req.json();
    const updated = { ...project, ...updates, id: projectId, authorId: user.id, updatedAt: new Date().toISOString() };
    await kv.set(`project:${projectId}`, updated);
    return c.json({ success: true, project: updated });
  } catch (error) {
    return c.json({ error: "Failed to update project" }, 500);
  }
});

// Delete project (owner only)
app.delete("/make-server-9386b22c/projects/:projectId", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param('projectId');
    const project = await kv.get(`project:${projectId}`);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.authorId !== user.id) return c.json({ error: "Forbidden" }, 403);

    await kv.del(`project:${projectId}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete project" }, 500);
  }
});

Deno.serve(app.fetch);
