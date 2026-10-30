import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Supabase client
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

// Health check endpoint
app.get("/make-server-9386b22c/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== POSTS API =====

// Get all posts
app.get("/make-server-9386b22c/posts", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    const posts = await kv.getByPrefix('post:');

    // Sort by createdAt descending
    const sortedPosts = posts.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Add user data and interaction flags
    const enrichedPosts = await Promise.all(sortedPosts.map(async (post: any) => {
      const author = await kv.get(`user:${post.authorId}`);
      const likes = await kv.get(`post:${post.id}:likes`) || [];
      const comments = await kv.getByPrefix(`post:${post.id}:comment:`) || [];
      const bookmarks = user ? (await kv.get(`user:${user.id}:bookmarks`) || []) : [];

      return {
        ...post,
        author,
        likes: likes.length,
        isLiked: user ? likes.includes(user.id) : false,
        commentCount: comments.length,
        isBookmarked: user ? bookmarks.includes(post.id) : false
      };
    }));

    return c.json({ posts: enrichedPosts });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get posts by user
app.get("/make-server-9386b22c/posts/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const currentUser = await getUserFromToken(c.req.header('Authorization'));

    const allPosts = await kv.getByPrefix('post:');
    const userPosts = allPosts.filter((post: any) => post.authorId === userId);

    // Sort by createdAt descending
    const sortedPosts = userPosts.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Enrich with interaction data
    const enrichedPosts = await Promise.all(sortedPosts.map(async (post: any) => {
      const author = await kv.get(`user:${post.authorId}`);
      const likes = await kv.get(`post:${post.id}:likes`) || [];
      const comments = await kv.getByPrefix(`post:${post.id}:comment:`) || [];
      const bookmarks = currentUser ? (await kv.get(`user:${currentUser.id}:bookmarks`) || []) : [];

      return {
        ...post,
        author,
        likes: likes.length,
        isLiked: currentUser ? likes.includes(currentUser.id) : false,
        commentCount: comments.length,
        isBookmarked: currentUser ? bookmarks.includes(post.id) : false
      };
    }));

    return c.json({ posts: enrichedPosts });
  } catch (error: any) {
    console.error('Error fetching user posts:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create post
app.post("/make-server-9386b22c/posts", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      console.error('Unauthorized: No user from token');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('Creating post for user:', user.id);

    const formData = await c.req.formData();
    const caption = formData.get('caption') as string || '';
    const link = formData.get('link') as string || '';
    const linkText = formData.get('linkText') as string || '';
    const hashtagsJson = formData.get('hashtags') as string;
    const hashtags = hashtagsJson ? JSON.parse(hashtagsJson) : [];

    console.log('Post data:', { caption, link, hashtags });

    // Handle media files (optional - post can be created without media)
    const media = [];
    const mediaFiles = formData.getAll('media');

    console.log('Processing media files:', mediaFiles.length);

    if (mediaFiles.length > 0) {
      // Only try to upload if there are media files
      try {
        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketName = 'make-9386b22c-media';
        const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

        if (!bucketExists) {
          console.log('Creating storage bucket:', bucketName);
          const { data: newBucket, error: bucketError } = await supabase.storage.createBucket(bucketName, {
            public: false,
            fileSizeLimit: 52428800 // 50MB
          });
          if (bucketError) {
            console.error('Bucket creation error:', bucketError);
            console.warn('Proceeding without media upload due to bucket creation failure');
          } else {
            console.log('Bucket created successfully:', newBucket);
          }
        }

        // Try to upload each file
        for (const file of mediaFiles) {
          if (file instanceof File && file.size > 0) {
            try {
              const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
              const arrayBuffer = await file.arrayBuffer();
              const buffer = new Uint8Array(arrayBuffer);

              console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);

              // Upload to Supabase Storage
              const { data, error } = await supabase.storage
                .from('make-9386b22c-media')
                .upload(fileName, buffer, {
                  contentType: file.type,
                  upsert: false
                });

              if (error) {
                console.error('Upload error for file', fileName, ':', error);
                continue; // Skip this file but continue with others
              }

              console.log('File uploaded successfully:', data);

              // Get signed URL
              const { data: signedData, error: signError } = await supabase.storage
                .from('make-9386b22c-media')
                .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

              if (signError) {
                console.error('Signed URL error:', signError);
                continue;
              }

              if (signedData) {
                media.push({
                  url: signedData.signedUrl,
                  type: file.type.startsWith('video/') ? 'video' : 'image',
                  fileName
                });
              }
            } catch (fileError) {
              console.error('Error processing file:', fileError);
              // Continue with other files
            }
          }
        }
      } catch (storageError) {
        console.error('Storage system error:', storageError);
        console.warn('Proceeding to create post without media due to storage error');
        // Don't fail the entire post creation due to storage issues
      }
    }

    console.log('Media processed:', media.length, 'files uploaded successfully');

    const postId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const post = {
      id: postId,
      authorId: user.id,
      caption,
      media,
      link,
      linkText,
      hashtags,
      createdAt: new Date().toISOString()
    };

    await kv.set(`post:${postId}`, post);
    await kv.set(`post:${postId}:likes`, []);

    // Update trending hashtags
    for (const tag of hashtags) {
      const trendingKey = `trending:${tag}`;
      const trendingData = await kv.get(trendingKey) || { hashtag: tag, count: 0 };
      trendingData.count += 1;
      await kv.set(trendingKey, trendingData);
    }

    console.log('Post created successfully:', postId);

    return c.json({ post, message: media.length === 0 && mediaFiles.length > 0 ? 'Post created but media upload failed' : 'Post created successfully' });
  } catch (error: any) {
    console.error('Error creating post (detailed):', error);
    return c.json({ error: error.message || 'Failed to create post' }, 500);
  }
});

// Delete post
app.delete("/make-server-9386b22c/posts/:postId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    if (post.authorId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await kv.del(`post:${postId}`);
    await kv.del(`post:${postId}:likes`);

    // Delete comments
    const comments = await kv.getByPrefix(`post:${postId}:comment:`);
    for (const comment of comments) {
      await kv.del(`post:${postId}:comment:${comment.id}`);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Like post
app.post("/make-server-9386b22c/posts/:postId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const likes = await kv.get(`post:${postId}:likes`) || [];

    if (!likes.includes(user.id)) {
      likes.push(user.id);
      await kv.set(`post:${postId}:likes`, likes);
    }

    return c.json({ success: true, likes: likes.length });
  } catch (error: any) {
    console.error('Error liking post:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Unlike post
app.delete("/make-server-9386b22c/posts/:postId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const likes = await kv.get(`post:${postId}:likes`) || [];
    const filtered = likes.filter((id: string) => id !== user.id);

    await kv.set(`post:${postId}:likes`, filtered);

    return c.json({ success: true, likes: filtered.length });
  } catch (error: any) {
    console.error('Error unliking post:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Comment on post
app.post("/make-server-9386b22c/posts/:postId/comments", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const { text } = await c.req.json();

    const commentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const comment = {
      id: commentId,
      postId,
      userId: user.id,
      text,
      createdAt: new Date().toISOString()
    };

    await kv.set(`post:${postId}:comment:${commentId}`, comment);

    return c.json({ comment });
  } catch (error: any) {
    console.error('Error commenting on post:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get post comments
app.get("/make-server-9386b22c/posts/:postId/comments", async (c) => {
  try {
    const postId = c.req.param('postId');
    const comments = await kv.getByPrefix(`post:${postId}:comment:`);

    // Add user data to comments
    const enrichedComments = await Promise.all(comments.map(async (comment: any) => {
      const user = await kv.get(`user:${comment.userId}`);
      return { ...comment, user };
    }));

    // Sort by createdAt ascending
    enrichedComments.sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return c.json({ comments: enrichedComments });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bookmark post
app.post("/make-server-9386b22c/posts/:postId/bookmark", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const bookmarks = await kv.get(`user:${user.id}:bookmarks`) || [];

    if (!bookmarks.includes(postId)) {
      bookmarks.push(postId);
      await kv.set(`user:${user.id}:bookmarks`, bookmarks);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error bookmarking post:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Unbookmark post
app.delete("/make-server-9386b22c/posts/:postId/bookmark", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const bookmarks = await kv.get(`user:${user.id}:bookmarks`) || [];
    const filtered = bookmarks.filter((id: string) => id !== postId);

    await kv.set(`user:${user.id}:bookmarks`, filtered);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error removing bookmark:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get bookmarked posts
app.get("/make-server-9386b22c/posts/bookmarks", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookmarks = await kv.get(`user:${user.id}:bookmarks`) || [];
    const posts = await Promise.all(
      bookmarks.map(async (postId: string) => {
        const post = await kv.get(`post:${postId}`);
        if (!post) return null;

        const author = await kv.get(`user:${post.authorId}`);
        const likes = await kv.get(`post:${post.id}:likes`) || [];
        const comments = await kv.getByPrefix(`post:${post.id}:comment:`) || [];

        return {
          ...post,
          author,
          likes: likes.length,
          isLiked: likes.includes(user.id),
          commentCount: comments.length,
          isBookmarked: true
        };
      })
    );

    const validPosts = posts.filter(p => p !== null);

    return c.json({ posts: validPosts });
  } catch (error: any) {
    console.error('Error fetching bookmarks:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get trending hashtags
app.get("/make-server-9386b22c/posts/trending", async (c) => {
  try {
    const trending = await kv.getByPrefix('trending:');

    // Sort by count descending
    trending.sort((a: any, b: any) => b.count - a.count);

    return c.json({ trending: trending.slice(0, 10) });
  } catch (error: any) {
    console.error('Error fetching trending:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== EVENTS API =====

// Get all events
app.get("/make-server-9386b22c/events", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    const events = await kv.getByPrefix('event:');

    // Sort by eventDate ascending
    const sortedEvents = events.sort((a: any, b: any) =>
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );

    // Add user data and interaction flags
    const enrichedEvents = await Promise.all(sortedEvents.map(async (event: any) => {
      const organizer = await kv.get(`user:${event.organizerId}`);
      const likes = await kv.get(`event:${event.id}:likes`) || [];
      const comments = await kv.getByPrefix(`event:${event.id}:comment:`) || [];

      return {
        ...event,
        organizer,
        likes: likes.length,
        isLiked: user ? likes.includes(user.id) : false,
        commentCount: comments.length
      };
    }));

    return c.json({ events: enrichedEvents });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get one event
app.get("/make-server-9386b22c/events/:eventId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);

    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const organizer = await kv.get(`user:${event.organizerId}`);
    const likes = await kv.get(`event:${event.id}:likes`) || [];
    const comments = await kv.getByPrefix(`event:${event.id}:comment:`) || [];

    const enrichedEvent = {
      ...event,
      organizer,
      likes: likes.length,
      isLiked: user ? likes.includes(user.id) : false,
      commentCount: comments.length
    };

    return c.json({ event: enrichedEvent });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create event
app.post("/make-server-9386b22c/events", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { title, description, eventDate, location, imageUrl } = await c.req.json();

    const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const event = {
      id: eventId,
      organizerId: user.id,
      title,
      description,
      eventDate,
      location,
      imageUrl,
      createdAt: new Date().toISOString()
    };

    await kv.set(`event:${eventId}`, event);
    await kv.set(`event:${eventId}:likes`, []);

    return c.json({ event });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete event
app.delete("/make-server-9386b22c/events/:eventId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const eventId = c.req.param('eventId');
    const event = await kv.get(`event:${eventId}`);

    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    if (event.organizerId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await kv.del(`event:${eventId}`);
    await kv.del(`event:${eventId}:likes`);

    // Delete comments
    const comments = await kv.getByPrefix(`event:${eventId}:comment:`);
    for (const comment of comments) {
      await kv.del(`event:${eventId}:comment:${comment.id}`);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Like event
app.post("/make-server-9386b22c/events/:eventId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const eventId = c.req.param('eventId');
    const likes = await kv.get(`event:${eventId}:likes`) || [];

    if (!likes.includes(user.id)) {
      likes.push(user.id);
      await kv.set(`event:${eventId}:likes`, likes);
    }

    return c.json({ success: true, likes: likes.length });
  } catch (error: any) {
    console.error('Error liking event:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Unlike event
app.delete("/make-server-9386b22c/events/:eventId/like", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const eventId = c.req.param('eventId');
    const likes = await kv.get(`event:${eventId}:likes`) || [];
    const filtered = likes.filter((id: string) => id !== user.id);

    await kv.set(`event:${eventId}:likes`, filtered);

    return c.json({ success: true, likes: filtered.length });
  } catch (error: any) {
    console.error('Error unliking event:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Add comment to event
app.post("/make-server-9386b22c/events/:eventId/comments", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const eventId = c.req.param('eventId');
    const { text } = await c.req.json();

    const commentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const comment = {
      id: commentId,
      eventId,
      userId: user.id,
      text,
      createdAt: new Date().toISOString()
    };

    await kv.set(`event:${eventId}:comment:${commentId}`, comment);

    return c.json({ comment });
  } catch (error: any) {
    console.error('Error commenting on event:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get event comments
app.get("/make-server-9386b22c/events/:eventId/comments", async (c) => {
  try {
    const eventId = c.req.param('eventId');
    const comments = await kv.getByPrefix(`event:${eventId}:comment:`);

    // Add user data to comments
    const enrichedComments = await Promise.all(comments.map(async (comment: any) => {
      const user = await kv.get(`user:${comment.userId}`);
      return { ...comment, user };
    }));

    // Sort by createdAt ascending
    enrichedComments.sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return c.json({ comments: enrichedComments });
  } catch (error: any) {
    console.error('Error fetching event comments:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== MESSAGES API =====

// Send message
app.post("/make-server-9386b22c/messages/send", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { receiverId, text } = await c.req.json();

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id: messageId,
      senderId: user.id,
      receiverId,
      text,
      createdAt: new Date().toISOString(),
      read: false
    };

    await kv.set(`message:${messageId}`, message);

    // Update conversation list for both users
    const senderConversations = await kv.get(`user:${user.id}:conversations`) || [];
    const receiverConversations = await kv.get(`user:${receiverId}:conversations`) || [];

    if (!senderConversations.includes(receiverId)) {
      senderConversations.push(receiverId);
      await kv.set(`user:${user.id}:conversations`, senderConversations);
    }

    if (!receiverConversations.includes(user.id)) {
      receiverConversations.push(user.id);
      await kv.set(`user:${receiverId}:conversations`, receiverConversations);
    }

    return c.json({ message });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get messages with user
app.get("/make-server-9386b22c/messages/:otherUserId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    const allMessages = await kv.getByPrefix('message:');

    // Filter messages between current user and other user
    const conversation = allMessages.filter((msg: any) =>
      (msg.senderId === user.id && msg.receiverId === otherUserId) ||
      (msg.senderId === otherUserId && msg.receiverId === user.id)
    );

    // Sort by createdAt ascending
    conversation.sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Mark messages as read
    for (const msg of conversation) {
      if (msg.receiverId === user.id && !msg.read) {
        msg.read = true;
        await kv.set(`message:${msg.id}`, msg);
      }
    }

    return c.json({ messages: conversation });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all conversations
app.get("/make-server-9386b22c/messages/conversations/list", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const conversationUserIds = await kv.get(`user:${user.id}:conversations`) || [];
    const allMessages = await kv.getByPrefix('message:');

    const conversations = await Promise.all(
      conversationUserIds.map(async (otherUserId: string) => {
        const otherUser = await kv.get(`user:${otherUserId}`);

        // Get messages with this user
        const messages = allMessages.filter((msg: any) =>
          (msg.senderId === user.id && msg.receiverId === otherUserId) ||
          (msg.senderId === otherUserId && msg.receiverId === user.id)
        );

        // Sort by createdAt and get last message
        messages.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const lastMessage = messages[0];
        const unreadCount = messages.filter((msg: any) =>
          msg.receiverId === user.id && !msg.read
        ).length;

        return {
          userId: otherUserId,
          user: otherUser,
          lastMessage,
          unreadCount
        };
      })
    );

    // Sort by last message time
    conversations.sort((a: any, b: any) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return c.json({ conversations });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== PROFILE API =====

// Get profile
app.get("/make-server-9386b22c/profile/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const currentUser = await getUserFromToken(c.req.header('Authorization'));

    const profile = await kv.get(`user:${userId}`);

    if (!profile) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get follower/following counts
    const followers = await kv.get(`user:${userId}:followers`) || [];
    const following = await kv.get(`user:${userId}:following`) || [];

    // Check if current user is following this user
    const isFollowing = currentUser ? followers.includes(currentUser.id) : false;

    const enrichedProfile = {
      ...profile,
      followersCount: followers.length,
      followingCount: following.length,
      isFollowing
    };

    return c.json({ profile: enrichedProfile });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update own profile
app.put("/make-server-9386b22c/profile", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const updates = await c.req.json();
    const currentProfile = await kv.get(`user:${user.id}`) || {};

    const updatedProfile = {
      ...currentProfile,
      ...updates,
      id: user.id, // Ensure ID is not changed
      updatedAt: new Date().toISOString()
    };

    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Check username availability
app.get("/make-server-9386b22c/profile/check-username/:username", async (c) => {
  try {
    const username = c.req.param('username');
    const allUsers = await kv.getByPrefix('user:');

    const exists = allUsers.some((user: any) =>
      user.username?.toLowerCase() === username.toLowerCase()
    );

    return c.json({ available: !exists });
  } catch (error: any) {
    console.error('Error checking username:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Upload profile picture
app.post("/make-server-9386b22c/profile/picture", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('picture') as File;

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'make-9386b22c-media';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800 // 50MB
      });
    }

    const fileName = `profile/${user.id}/${Date.now()}_${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('make-9386b22c-media')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // Get signed URL
    const { data: signedData, error: signError } = await supabase.storage
      .from('make-9386b22c-media')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

    if (signError) {
      return c.json({ error: signError.message }, 500);
    }

    // Update user profile
    const profile = await kv.get(`user:${user.id}`) || {};
    profile.profilePicture = signedData.signedUrl;
    await kv.set(`user:${user.id}`, profile);

    return c.json({ url: signedData.signedUrl });
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete profile picture
app.delete("/make-server-9386b22c/profile/picture", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}`) || {};
    profile.profilePicture = null;
    await kv.set(`user:${user.id}`, profile);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting profile picture:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== USERS API =====

// Get user by ID
app.get("/make-server-9386b22c/users/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Search users
app.get("/make-server-9386b22c/users/search", async (c) => {
  try {
    const query = c.req.query('q')?.toLowerCase() || '';

    if (!query) {
      return c.json({ users: [] });
    }

    const allUsers = await kv.getByPrefix('user:');

    const matchingUsers = allUsers.filter((user: any) => {
      const name = user.name?.toLowerCase() || '';
      const username = user.username?.toLowerCase() || '';
      const bio = user.bio?.toLowerCase() || '';

      return name.includes(query) || username.includes(query) || bio.includes(query);
    });

    return c.json({ users: matchingUsers });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Discover users
app.get("/make-server-9386b22c/users/discover", async (c) => {
  try {
    const currentUser = await getUserFromToken(c.req.header('Authorization'));
    const allUsers = await kv.getByPrefix('user:');

    // Filter out current user
    let discoverUsers = allUsers.filter((user: any) =>
      currentUser ? user.id !== currentUser.id : true
    );

    // If user is logged in, filter out users they already follow
    if (currentUser) {
      const following = await kv.get(`user:${currentUser.id}:following`) || [];
      discoverUsers = discoverUsers.filter((user: any) =>
        !following.includes(user.id)
      );
    }

    // Randomize and limit to 20 users
    const shuffled = discoverUsers.sort(() => Math.random() - 0.5);
    const limitedUsers = shuffled.slice(0, 20);

    return c.json({ users: limitedUsers });
  } catch (error: any) {
    console.error('Error discovering users:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== SOCIAL API =====

// Follow user
app.post("/make-server-9386b22c/social/follow/:userId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const targetUserId = c.req.param('userId');

    if (user.id === targetUserId) {
      return c.json({ error: 'Cannot follow yourself' }, 400);
    }

    // Add to current user's following list
    const following = await kv.get(`user:${user.id}:following`) || [];
    if (!following.includes(targetUserId)) {
      following.push(targetUserId);
      await kv.set(`user:${user.id}:following`, following);
    }

    // Add to target user's followers list
    const followers = await kv.get(`user:${targetUserId}:followers`) || [];
    if (!followers.includes(user.id)) {
      followers.push(user.id);
      await kv.set(`user:${targetUserId}:followers`, followers);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error following user:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Unfollow user
app.delete("/make-server-9386b22c/social/follow/:userId", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const targetUserId = c.req.param('userId');

    // Remove from current user's following list
    const following = await kv.get(`user:${user.id}:following`) || [];
    const filteredFollowing = following.filter((id: string) => id !== targetUserId);
    await kv.set(`user:${user.id}:following`, filteredFollowing);

    // Remove from target user's followers list
    const followers = await kv.get(`user:${targetUserId}:followers`) || [];
    const filteredFollowers = followers.filter((id: string) => id !== user.id);
    await kv.set(`user:${targetUserId}:followers`, filteredFollowers);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get followers
app.get("/make-server-9386b22c/social/followers/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const followerIds = await kv.get(`user:${userId}:followers`) || [];

    const followers = await Promise.all(
      followerIds.map(async (followerId: string) => {
        return await kv.get(`user:${followerId}`);
      })
    );

    const validFollowers = followers.filter(f => f !== null);

    return c.json({ followers: validFollowers });
  } catch (error: any) {
    console.error('Error fetching followers:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get following
app.get("/make-server-9386b22c/social/following/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const followingIds = await kv.get(`user:${userId}:following`) || [];

    const following = await Promise.all(
      followingIds.map(async (followingId: string) => {
        return await kv.get(`user:${followingId}`);
      })
    );

    const validFollowing = following.filter(f => f !== null);

    return c.json({ following: validFollowing });
  } catch (error: any) {
    console.error('Error fetching following:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== MATCHING API =====

// AI matching suggestions
app.post("/make-server-9386b22c/matching/ai-suggest", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { preferences } = await c.req.json();

    // Get current user profile
    const currentProfile = await kv.get(`user:${user.id}`) || {};

    // Get all users
    const allUsers = await kv.getByPrefix('user:');

    // Filter out current user
    const otherUsers = allUsers.filter((u: any) => u.id !== user.id);

    // Get users current user is already following
    const following = await kv.get(`user:${user.id}:following`) || [];

    // Simple matching algorithm based on preferences
    const matchedUsers = otherUsers
      .filter((u: any) => !following.includes(u.id))
      .map((u: any) => {
        let score = 0;

        // Match based on interests
        if (preferences?.interests && u.interests) {
          const commonInterests = preferences.interests.filter((i: string) =>
            u.interests.includes(i)
          );
          score += commonInterests.length * 10;
        }

        // Match based on location
        if (preferences?.location && u.location) {
          if (u.location.toLowerCase().includes(preferences.location.toLowerCase())) {
            score += 5;
          }
        }

        return { user: u, matchScore: score };
      })
      .filter(m => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    return c.json({ suggestions: matchedUsers });
  } catch (error: any) {
    console.error('Error generating AI suggestions:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Chatbot interaction
app.post("/make-server-9386b22c/matching/chatbot", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { message } = await c.req.json();

    // Simple chatbot logic - this would be replaced with actual AI in production
    let response = '';

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = 'Hello! I am here to help you find meaningful connections. What are you looking for?';
    } else if (lowerMessage.includes('help')) {
      response = 'I can help you find people with similar interests, suggest events, and connect you with your community. What would you like to explore?';
    } else if (lowerMessage.includes('events')) {
      response = 'I can show you upcoming events in your area. Would you like to see events related to specific interests?';
    } else if (lowerMessage.includes('friends') || lowerMessage.includes('people')) {
      response = 'I can help you discover people with similar interests. What are you passionate about?';
    } else {
      response = 'That is interesting! Tell me more about what you are looking for, and I will help you find the right connections.';
    }

    // Store conversation history
    const conversationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const conversation = {
      id: conversationId,
      userId: user.id,
      userMessage: message,
      botResponse: response,
      createdAt: new Date().toISOString()
    };

    await kv.set(`chatbot:${user.id}:${conversationId}`, conversation);

    return c.json({ response });
  } catch (error: any) {
    console.error('Error in chatbot:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Initialize storage bucket on startup
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'make-9386b22c-media';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      console.log('Creating storage bucket:', bucketName);
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800 // 50MB
      });
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
})();

Deno.serve(app.fetch);
