import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Supabase admin client (service role)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

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

// Auth middleware
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// Health check
app.get("/make-server-9386b22c/health", (c) => c.json({ status: "ok" }));

// ===== POSTS API =====

app.get("/make-server-9386b22c/posts", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    const posts = await kv.getByPrefix('post:');
    const sortedPosts = posts.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const enrichedPosts = await Promise.all(sortedPosts.map(async (post: any) => {
      const author = await kv.get(`user:${post.authorId}`);
      const likes = await kv.get(`post:${post.id}:likes`) || [];
      const comments = await kv.getByPrefix(`post:${post.id}:comment:`) || [];
      const bookmarks = user ? (await kv.get(`user:${user.id}:bookmarks`) || []) : [];
      return {
        ...post, author,
        likes: likes.length,
        isLiked: user ? likes.includes(user.id) : false,
        commentCount: comments.length,
        isBookmarked: user ? bookmarks.includes(post.id) : false
      };
    }));
    return c.json({ posts: enrichedPosts });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/posts/bookmarks", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const bookmarks = await kv.get(`user:${user.id}:bookmarks`) || [];
    const posts = await Promise.all(bookmarks.map(async (postId: string) => {
      const post = await kv.get(`post:${postId}`);
      if (!post) return null;
      const author = await kv.get(`user:${post.authorId}`);
      const likes = await kv.get(`post:${post.id}:likes`) || [];
      const comments = await kv.getByPrefix(`post:${post.id}:comment:`) || [];
      return { ...post, author, likes: likes.length, isLiked: likes.includes(user.id), commentCount: comments.length, isBookmarked: true };
    }));
    return c.json({ posts: posts.filter(p => p !== null) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/posts/trending", async (c) => {
  try {
    const trending = await kv.getByPrefix('trending:');
    trending.sort((a: any, b: any) => b.count - a.count);
    return c.json({ trending: trending.slice(0, 10) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get single post
app.get("/make-server-9386b22c/posts/:postId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: 'Post not found' }, 404);
    const author = await kv.get(`user:${post.authorId}`);
    const likes = await kv.get(`post:${postId}:likes`) || [];
    const comments = await kv.getByPrefix(`post:${postId}:comment:`) || [];
    const bookmarks = user ? (await kv.get(`user:${user.id}:bookmarks`) || []) : [];
    return c.json({ post: { ...post, author, likes: likes.length, isLiked: user ? likes.includes(user.id) : false, commentCount: comments.length, isBookmarked: user ? bookmarks.includes(postId) : false } });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/posts/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const currentUser = await getUserFromToken(c.req.header('Authorization'));
    const allPosts = await kv.getByPrefix('post:');
    const userPosts = allPosts.filter((p: any) => p.authorId === userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const enrichedPosts = await Promise.all(userPosts.map(async (post: any) => {
      const author = await kv.get(`user:${post.authorId}`);
      const likes = await kv.get(`post:${post.id}:likes`) || [];
      const comments = await kv.getByPrefix(`post:${post.id}:comment:`) || [];
      const bookmarks = currentUser ? (await kv.get(`user:${currentUser.id}:bookmarks`) || []) : [];
      return { ...post, author, likes: likes.length, isLiked: currentUser ? likes.includes(currentUser.id) : false, commentCount: comments.length, isBookmarked: currentUser ? bookmarks.includes(post.id) : false };
    }));
    return c.json({ posts: enrichedPosts });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-9386b22c/posts", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const formData = await c.req.formData();
    const caption = formData.get('caption') as string || '';
    const link = formData.get('link') as string || '';
    const linkText = formData.get('linkText') as string || '';
    const hashtagsJson = formData.get('hashtags') as string;
    const hashtags = hashtagsJson ? JSON.parse(hashtagsJson) : [];

    const media = [];
    const mediaFiles = formData.getAll('media');

    if (mediaFiles.length > 0) {
      try {
        const bucketName = 'make-9386b22c-media';
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some(b => b.name === bucketName)) {
          await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 52428800 });
        }
        for (const file of mediaFiles) {
          if (file instanceof File && file.size > 0) {
            try {
              const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
              const buffer = new Uint8Array(await file.arrayBuffer());
              const { data, error } = await supabase.storage.from(bucketName).upload(fileName, buffer, { contentType: file.type, upsert: false });
              if (error) continue;
              const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 60 * 60 * 24 * 365);
              if (signedData) media.push({ url: signedData.signedUrl, type: file.type.startsWith('video/') ? 'video' : 'image', fileName });
            } catch {}
          }
        }
      } catch {}
    }

    const postId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const post = { id: postId, authorId: user.id, caption, media, link, linkText, hashtags, createdAt: new Date().toISOString() };

    await kv.set(`post:${postId}`, post);
    await kv.set(`post:${postId}:likes`, []);

    for (const tag of hashtags) {
      const td = await kv.get(`trending:${tag}`) || { hashtag: tag, count: 0 };
      td.count += 1;
      await kv.set(`trending:${tag}`, td);
    }

    return c.json({ post });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to create post' }, 500);
  }
});

app.put("/make-server-9386b22c/posts/:postId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: 'Post not found' }, 404);
    if (post.authorId !== user.id) return c.json({ error: 'Forbidden' }, 403);
    const updates = await c.req.json();
    const updated = { ...post, ...updates, id: postId, authorId: user.id };
    await kv.set(`post:${postId}`, updated);
    return c.json({ post: updated });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-9386b22c/posts/:postId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    if (!post) return c.json({ error: 'Post not found' }, 404);
    if (post.authorId !== user.id) return c.json({ error: 'Forbidden' }, 403);
    await kv.del(`post:${postId}`);
    await kv.del(`post:${postId}:likes`);
    const comments = await kv.getByPrefix(`post:${postId}:comment:`);
    for (const comment of comments) await kv.del(`post:${postId}:comment:${comment.id}`);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-9386b22c/posts/:postId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('postId');
    const likes = await kv.get(`post:${postId}:likes`) || [];
    if (!likes.includes(user.id)) { likes.push(user.id); await kv.set(`post:${postId}:likes`, likes); }
    return c.json({ success: true, likes: likes.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-9386b22c/posts/:postId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('postId');
    const likes = (await kv.get(`post:${postId}:likes`) || []).filter((id: string) => id !== user.id);
    await kv.set(`post:${postId}:likes`, likes);
    return c.json({ success: true, likes: likes.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-9386b22c/posts/:postId/comments", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('postId');
    const { text } = await c.req.json();
    const commentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const comment = { id: commentId, postId, userId: user.id, text, createdAt: new Date().toISOString() };
    await kv.set(`post:${postId}:comment:${commentId}`, comment);
    return c.json({ comment });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/posts/:postId/comments", async (c) => {
  try {
    const postId = c.req.param('postId');
    const comments = await kv.getByPrefix(`post:${postId}:comment:`);
    const enriched = await Promise.all(comments.map(async (comment: any) => {
      const user = await kv.get(`user:${comment.userId}`);
      return { ...comment, user };
    }));
    enriched.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return c.json({ comments: enriched });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-9386b22c/posts/:postId/bookmark", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('postId');
    const bookmarks = await kv.get(`user:${user.id}:bookmarks`) || [];
    if (!bookmarks.includes(postId)) { bookmarks.push(postId); await kv.set(`user:${user.id}:bookmarks`, bookmarks); }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-9386b22c/posts/:postId/bookmark", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('postId');
    const bookmarks = (await kv.get(`user:${user.id}:bookmarks`) || []).filter((id: string) => id !== postId);
    await kv.set(`user:${user.id}:bookmarks`, bookmarks);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== EVENTS API =====

app.get("/make-server-9386b22c/events", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    const events = await kv.getByPrefix('event:');

    // Sort ascending by date (support both `date` and legacy `eventDate` fields)
    const sortedEvents = events.sort((a: any, b: any) => {
      const aDate = a.date || a.eventDate || a.createdAt;
      const bDate = b.date || b.eventDate || b.createdAt;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    const enrichedEvents = await Promise.all(sortedEvents.map(async (event: any) => {
      // Support both new `authorId` and legacy `organizerId`
      const authorId = event.authorId || event.organizerId;
      const author = authorId ? await kv.get(`user:${authorId}`) : null;
      const likes = await kv.get(`event:${event.id}:likes`) || [];
      const comments = await kv.getByPrefix(`event:${event.id}:comment:`) || [];
      return {
        ...event,
        authorId,
        author,
        likes: likes.length,
        isLiked: user ? likes.includes(user.id) : false,
        commentCount: comments.length
      };
    }));

    return c.json({ events: enrichedEvents });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/events/:eventId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);
    if (!event) return c.json({ error: 'Event not found' }, 404);

    const authorId = event.authorId || event.organizerId;
    const author = authorId ? await kv.get(`user:${authorId}`) : null;
    const likes = await kv.get(`event:${event.id}:likes`) || [];
    const comments = await kv.getByPrefix(`event:${event.id}:comment:`) || [];

    return c.json({
      event: {
        ...event, authorId, author,
        likes: likes.length,
        isLiked: user ? likes.includes(user.id) : false,
        commentCount: comments.length
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Create event — handles both JSON and multipart/form-data (banner upload)
app.post("/make-server-9386b22c/events", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const contentType = c.req.header('Content-Type') || '';
    let eventData: any = {};
    let bannerFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      for (const [key, value] of formData.entries()) {
        if (key === 'banner' && value instanceof File) {
          bannerFile = value;
        } else if (typeof value === 'string') {
          try { eventData[key] = JSON.parse(value); } catch { eventData[key] = value; }
        }
      }
    } else {
      eventData = await c.req.json();
    }

    const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let bannerUrl = eventData.bannerUrl || null;

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

    // Store ALL fields from the frontend (title, description, date, location, link,
    // locationLink, requiredSkills, problemStatement, minTeamSize, maxTeamSize,
    // registrationDeadline, maxTeams, prizePool, eligibility, mode, category, technologies, etc.)
    const event = {
      ...eventData,
      id: eventId,
      authorId: user.id,
      bannerUrl,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`event:${eventId}`, event);
    await kv.set(`event:${eventId}:likes`, []);

    return c.json({ event });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-9386b22c/events/:eventId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);
    if (!event) return c.json({ error: 'Event not found' }, 404);
    const ownerId = event.authorId || event.organizerId;
    if (ownerId !== user.id) return c.json({ error: 'Forbidden' }, 403);
    await kv.del(`event:${eventId}`);
    await kv.del(`event:${eventId}:likes`);
    const comments = await kv.getByPrefix(`event:${eventId}:comment:`);
    for (const comment of comments) await kv.del(`event:${eventId}:comment:${comment.id}`);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-9386b22c/events/:eventId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const eventId = c.req.param('eventId');
    const likes = await kv.get(`event:${eventId}:likes`) || [];
    if (!likes.includes(user.id)) { likes.push(user.id); await kv.set(`event:${eventId}:likes`, likes); }
    return c.json({ success: true, likes: likes.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-9386b22c/events/:eventId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const eventId = c.req.param('eventId');
    const likes = (await kv.get(`event:${eventId}:likes`) || []).filter((id: string) => id !== user.id);
    await kv.set(`event:${eventId}:likes`, likes);
    return c.json({ success: true, likes: likes.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-9386b22c/events/:eventId/comments", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const eventId = c.req.param('eventId');
    const { text } = await c.req.json();
    const commentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const comment = { id: commentId, eventId, userId: user.id, text, createdAt: new Date().toISOString() };
    await kv.set(`event:${eventId}:comment:${commentId}`, comment);
    return c.json({ comment });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/events/:eventId/comments", async (c) => {
  try {
    const eventId = c.req.param('eventId');
    const comments = await kv.getByPrefix(`event:${eventId}:comment:`);
    const enriched = await Promise.all(comments.map(async (comment: any) => {
      const user = await kv.get(`user:${comment.userId}`);
      return { ...comment, user };
    }));
    enriched.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return c.json({ comments: enriched });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Event registration endpoints
app.post("/make-server-9386b22c/events/:eventId/register", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);
    if (!event) return c.json({ error: 'Event not found' }, 404);
    const data = await c.req.json();
    const regId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const registration = { id: regId, eventId, userId: user.id, ...data, status: 'pending', createdAt: new Date().toISOString() };
    await kv.set(`event:${eventId}:reg:${regId}`, registration);
    const regList = await kv.get(`event:${eventId}:registrations`) || [];
    if (!regList.includes(regId)) { regList.push(regId); await kv.set(`event:${eventId}:registrations`, regList); }
    return c.json({ registration });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/events/:eventId/registrations", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const eventId = c.req.param('eventId');
    const registrations = await kv.getByPrefix(`event:${eventId}:reg:`);
    const enriched = await Promise.all(registrations.map(async (reg: any) => {
      const regUser = await kv.get(`user:${reg.userId}`);
      return { ...reg, user: regUser };
    }));
    enriched.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return c.json({ registrations: enriched });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-9386b22c/events/:eventId/registrations/:regId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { eventId, regId } = c.req.param();
    const reg = await kv.get(`event:${eventId}:reg:${regId}`);
    if (!reg) return c.json({ error: 'Registration not found' }, 404);
    const updates = await c.req.json();
    const updated = { ...reg, ...updates, id: regId, eventId, updatedAt: new Date().toISOString() };
    await kv.set(`event:${eventId}:reg:${regId}`, updated);
    return c.json({ registration: updated });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== MESSAGES API =====

app.post("/make-server-9386b22c/messages/send", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    // Accept both `receiverId` (backend convention) and `recipientId` (frontend alias)
    const receiverId = body.receiverId || body.recipientId;
    const text = body.text;

    if (!receiverId) return c.json({ error: 'receiverId is required' }, 400);

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = { id: messageId, senderId: user.id, receiverId, text, createdAt: new Date().toISOString(), read: false };

    await kv.set(`message:${messageId}`, message);

    const senderConvos = await kv.get(`user:${user.id}:conversations`) || [];
    const receiverConvos = await kv.get(`user:${receiverId}:conversations`) || [];
    if (!senderConvos.includes(receiverId)) { senderConvos.push(receiverId); await kv.set(`user:${user.id}:conversations`, senderConvos); }
    if (!receiverConvos.includes(user.id)) { receiverConvos.push(user.id); await kv.set(`user:${receiverId}:conversations`, receiverConvos); }

    return c.json({ message });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/messages/conversations/list", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const convoUserIds = await kv.get(`user:${user.id}:conversations`) || [];
    const allMessages = await kv.getByPrefix('message:');
    const conversations = await Promise.all(convoUserIds.map(async (otherUserId: string) => {
      const otherUser = await kv.get(`user:${otherUserId}`);
      const messages = allMessages.filter((msg: any) =>
        (msg.senderId === user.id && msg.receiverId === otherUserId) ||
        (msg.senderId === otherUserId && msg.receiverId === user.id)
      ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { userId: otherUserId, user: otherUser, lastMessage: messages[0], unreadCount: messages.filter((m: any) => m.receiverId === user.id && !m.read).length };
    }));
    conversations.sort((a: any, b: any) => {
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });
    return c.json({ conversations });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/messages/:otherUserId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const otherUserId = c.req.param('otherUserId');
    const allMessages = await kv.getByPrefix('message:');
    const conversation = allMessages.filter((msg: any) =>
      (msg.senderId === user.id && msg.receiverId === otherUserId) ||
      (msg.senderId === otherUserId && msg.receiverId === user.id)
    ).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const msg of conversation) {
      if (msg.receiverId === user.id && !msg.read) { msg.read = true; await kv.set(`message:${msg.id}`, msg); }
    }
    return c.json({ messages: conversation });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== PROFILE API =====

app.get("/make-server-9386b22c/profile/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const currentUser = await getUserFromToken(c.req.header('Authorization'));
    let profile = await kv.get(`user:${userId}`);

    // Auto-create profile for auth users who haven't set one up yet
    if (!profile) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        if (authUser?.user) {
          const meta = authUser.user.user_metadata || {};
          profile = {
            id: userId,
            email: authUser.user.email || '',
            name: meta.name || authUser.user.email?.split('@')[0] || 'User',
            username: meta.username || authUser.user.email?.split('@')[0] || userId.slice(0, 8),
            skills: meta.skills || [],
            bio: meta.bio || '',
            location: meta.location || '',
            availability: meta.availability || 'available',
          };
          await kv.set(`user:${userId}`, profile);
        }
      } catch {}
    }

    if (!profile) return c.json({ error: 'User not found' }, 404);

    const followers = await kv.get(`user:${userId}:followers`) || [];
    const following = await kv.get(`user:${userId}:following`) || [];
    const isFollowing = currentUser ? followers.includes(currentUser.id) : false;

    return c.json({ profile: { ...profile, followersCount: followers.length, followingCount: following.length, isFollowing } });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-9386b22c/profile", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const updates = await c.req.json();
    const current = await kv.get(`user:${user.id}`) || {};
    const updated = { ...current, ...updates, id: user.id, updatedAt: new Date().toISOString() };
    await kv.set(`user:${user.id}`, updated);
    return c.json({ profile: updated });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/profile/check-username/:username", async (c) => {
  try {
    const username = c.req.param('username');
    const allUsers = await kv.getByPrefix('user:');
    const exists = allUsers.some((u: any) => u.username?.toLowerCase() === username.toLowerCase());
    return c.json({ available: !exists });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Upload profile picture — accepts `picture` field (matches frontend FormData)
app.post("/make-server-9386b22c/profile/picture", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const formData = await c.req.formData();
    // Accept either 'picture' (legacy) or 'file' (current frontend)
    const file = (formData.get('picture') || formData.get('file')) as File;
    if (!file || !(file instanceof File)) return c.json({ error: 'No file provided' }, 400);

    const bucketName = 'make-9386b22c-media';
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 52428800 });
    }

    const fileName = `profile/${user.id}/${Date.now()}_${file.name}`;
    const buffer = new Uint8Array(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage.from(bucketName).upload(fileName, buffer, { contentType: file.type, upsert: true });
    if (uploadErr) return c.json({ error: uploadErr.message }, 500);

    const { data: signedData, error: signError } = await supabase.storage.from(bucketName).createSignedUrl(fileName, 60 * 60 * 24 * 365);
    if (signError) return c.json({ error: signError.message }, 500);

    const profile = await kv.get(`user:${user.id}`) || {};
    profile.profilePicture = signedData.signedUrl;
    await kv.set(`user:${user.id}`, profile);

    return c.json({ url: signedData.signedUrl });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-9386b22c/profile/picture", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const profile = await kv.get(`user:${user.id}`) || {};
    profile.profilePicture = null;
    await kv.set(`user:${user.id}`, profile);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== USERS API =====

app.get("/make-server-9386b22c/users/search", async (c) => {
  try {
    const query = c.req.query('q')?.toLowerCase() || '';
    if (!query) return c.json({ users: [] });
    const allUsers = await kv.getByPrefix('user:');
    const matching = allUsers.filter((u: any) =>
      u.name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.bio?.toLowerCase().includes(query)
    );
    return c.json({ users: matching });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/users/discover", async (c) => {
  try {
    const currentUser = await getUserFromToken(c.req.header('Authorization'));
    const allUsers = await kv.getByPrefix('user:');
    let discover = allUsers.filter((u: any) => currentUser ? u.id !== currentUser.id : true);
    if (currentUser) {
      const following = await kv.get(`user:${currentUser.id}:following`) || [];
      discover = discover.filter((u: any) => !following.includes(u.id));
    }
    const shuffled = discover.sort(() => Math.random() - 0.5).slice(0, 20);
    return c.json({ users: shuffled });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/users/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ user });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== SOCIAL API =====

app.post("/make-server-9386b22c/social/follow/:userId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const targetId = c.req.param('userId');
    if (user.id === targetId) return c.json({ error: 'Cannot follow yourself' }, 400);
    const following = await kv.get(`user:${user.id}:following`) || [];
    if (!following.includes(targetId)) { following.push(targetId); await kv.set(`user:${user.id}:following`, following); }
    const followers = await kv.get(`user:${targetId}:followers`) || [];
    if (!followers.includes(user.id)) { followers.push(user.id); await kv.set(`user:${targetId}:followers`, followers); }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-9386b22c/social/follow/:userId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const targetId = c.req.param('userId');
    await kv.set(`user:${user.id}:following`, (await kv.get(`user:${user.id}:following`) || []).filter((id: string) => id !== targetId));
    await kv.set(`user:${targetId}:followers`, (await kv.get(`user:${targetId}:followers`) || []).filter((id: string) => id !== user.id));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/social/followers/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const followerIds = await kv.get(`user:${userId}:followers`) || [];
    const followers = (await Promise.all(followerIds.map((id: string) => kv.get(`user:${id}`)))).filter(Boolean);
    return c.json({ followers });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-9386b22c/social/following/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const followingIds = await kv.get(`user:${userId}:following`) || [];
    const following = (await Promise.all(followingIds.map((id: string) => kv.get(`user:${id}`)))).filter(Boolean);
    return c.json({ following });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== MATCHING API =====

app.post("/make-server-9386b22c/matching/ai-suggest", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { preferences } = await c.req.json();
    const allUsers = await kv.getByPrefix('user:');
    const following = await kv.get(`user:${user.id}:following`) || [];
    const matched = allUsers
      .filter((u: any) => u.id !== user.id && !following.includes(u.id))
      .map((u: any) => {
        let score = 0;
        if (preferences?.interests && u.interests) score += preferences.interests.filter((i: string) => u.interests.includes(i)).length * 10;
        if (preferences?.location && u.location?.toLowerCase().includes(preferences.location.toLowerCase())) score += 5;
        return { user: u, matchScore: score };
      })
      .filter(m => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
    return c.json({ suggestions: matched });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-9386b22c/matching/chatbot", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { message } = await c.req.json();
    const lower = message.toLowerCase();
    let response = lower.includes('hello') || lower.includes('hi')
      ? "Hello! I'm here to help you find the perfect coding partner. What are you looking for?"
      : lower.includes('help')
      ? "I can help you find people with similar skills, discover events, and grow your network. What interests you?"
      : lower.includes('events')
      ? "There are great hackathons and coding events coming up! Check the Events tab to see what's happening."
      : lower.includes('friends') || lower.includes('people') || lower.includes('partner')
      ? "I can suggest developers who match your skills and interests. What are you passionate about building?"
      : "Interesting! Tell me more about your goals and I'll help connect you with the right people.";
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`chatbot:${user.id}:${id}`, { id, userId: user.id, userMessage: message, botResponse: response, createdAt: new Date().toISOString() });
    return c.json({ response });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Initialize storage bucket on startup
(async () => {
  try {
    const bucketName = 'make-9386b22c-media';
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 52428800 });
    }
  } catch (e) {
    console.error('Error initializing storage:', e);
  }
})();

Deno.serve(app.fetch);
