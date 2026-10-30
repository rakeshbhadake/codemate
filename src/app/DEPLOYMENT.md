# Codemate - AI-Powered Partner Matching Platform

> For this repository's current GitHub, Vercel, and environment-variable setup,
> follow the root [`DEPLOYMENT_GUIDE.md`](../../DEPLOYMENT_GUIDE.md). This file
> remains feature and architecture documentation.

## 🚀 Deployment Guide

This guide covers deploying the complete Codemate platform with frontend, backend, and database.

---

## 📋 Prerequisites

- A Supabase project (already configured)
- Google Gemini API key (optional, for AI features)
- Modern web browser

---

## 🔧 Configuration

### 1. Environment Variables

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in local `.env.local` and
Vercel. Supabase supplies the `SUPABASE_*` runtime variables to the Edge
Function. Set `GEMINI_API_KEY` only in Supabase Edge Function Secrets. See the
root deployment guide for exact steps; do not put service-role or Gemini keys
in the browser or Vercel frontend environment.
- `SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only)
- `SUPABASE_DB_URL` - Database connection string

### 2. Optional: Google Gemini API Key

For AI-powered matching and chatbot features, add your Gemini API key:

1. Get a free API key from: https://makersuite.google.com/app/apikey
2. The system will prompt you to add `GEMINI_API_KEY` when you use AI features

**Note:** The platform works without the Gemini API key using rule-based matching.

---

## 🏗️ Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui components
- **State Management**: React Context API
- **Deployment**: Static hosting (built-in)

### Backend
- **Runtime**: Deno (Supabase Edge Functions)
- **Framework**: Hono.js
- **Database**: PostgreSQL (via Supabase KV store)
- **Authentication**: Supabase Auth
- **Deployment**: Automatic with Supabase

### Database Schema

The application uses a key-value store with the following prefixes:

```
user:{userId}           - User profiles
follow:{userId}:{targetId} - Follow relationships
event:{eventId}         - Event/hackathon posts
event-like:{eventId}:{userId} - Event likes
event-comment:{eventId}:{commentId} - Event comments
message:{conversationId}:{messageId} - Chat messages
conversation:{conversationId} - Conversation metadata
```

---

## 🎯 Features

### ✅ Core Features Implemented

1. **User Authentication**
   - Email/password registration
   - Secure login/logout with JWT
   - Session management
   - Profile management (name, skills, bio, location, availability)

2. **Profile & Matching System**
   - Skill tags (hashtags)
   - AI-powered semantic matching (with Gemini API)
   - Rule-based filtering (location, availability, skills)
   - AI chatbot for natural language partner queries

3. **Social Features**
   - Follow/unfollow users
   - Event/hackathon posts
   - Likes and comments on events
   - News feed with posts

4. **Real-Time Messaging**
   - One-to-one chat
   - Message polling (updates every 3 seconds)
   - Conversation list
   - Message history

5. **UI/UX**
   - Responsive design (mobile, tablet, desktop)
   - Dark/Light mode toggle
   - Dashboard layout
   - Modern component library

---

## 📱 Using the Platform

### Getting Started

1. **Register an Account**
   - Click "Register" on the login page
   - Fill in your name, email, and password
   - Account is created automatically

2. **Set Up Your Profile**
   - Navigate to "Profile" tab
   - Add your bio, location, and availability
   - Add skill tags (e.g., #React, #Python, #MachineLearning)
   - Save changes

3. **Discover Partners**
   - Go to "Discover" tab
   - Use filters for location, availability, and skills
   - Try AI-powered search with natural language queries
   - Use the AI Chat for personalized recommendations

4. **Connect with Others**
   - Follow users you're interested in
   - Send messages to start conversations
   - View messages in the "Messages" tab

5. **Create Events**
   - Go to "Events" tab
   - Click "Create Event"
   - Add event details, date, location, and required skills
   - Post to your feed

6. **Engage with Events**
   - Like events you're interested in
   - Comment on events
   - Click external links to learn more

---

## 🔒 Security Features

- **Password Hashing**: Passwords are hashed using bcrypt (handled by Supabase Auth)
- **JWT Authentication**: Secure token-based authentication
- **Row-Level Security**: Database access is controlled per user
- **API Authorization**: All API endpoints require authentication
- **CORS Protection**: Cross-origin requests are properly configured

---

## 🧪 Testing the Application

### Test Scenarios

1. **User Registration & Login**
   ```
   - Register with email: test@example.com
   - Login with the same credentials
   - Verify profile is accessible
   ```

2. **Profile Management**
   ```
   - Update profile with bio and skills
   - Change availability status
   - Verify changes persist
   ```

3. **Social Features**
   ```
   - Create a second test account
   - Follow the first account
   - Verify follower count updates
   ```

4. **Messaging**
   ```
   - Send a message between accounts
   - Verify real-time updates (refresh after 3s)
   - Check conversation list
   ```

5. **Events**
   ```
   - Create an event post
   - Like and comment on events
   - Verify counts update
   ```

6. **AI Matching** (requires Gemini API key)
   ```
   - Use natural language query: "Find me a React developer"
   - Verify AI returns relevant matches
   - Try the AI chatbot
   ```

---

## 🐛 Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Solution: Log out and log back in
   - Clear localStorage if needed

2. **AI features not working**
   - Solution: Add GEMINI_API_KEY environment variable
   - Alternative: Use rule-based filtering

3. **Messages not updating**
   - Solution: Wait 3 seconds for poll to refresh
   - Check browser console for errors

4. **Events not showing**
   - Solution: Ensure you're logged in
   - Create a test event to populate feed

---

## 📊 API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/signin` - Login user
- `GET /auth/session` - Get current session
- `POST /auth/signout` - Logout user

### Profile
- `GET /profile/:userId` - Get user profile
- `PUT /profile` - Update own profile

### Social
- `POST /social/follow/:targetUserId` - Follow user
- `DELETE /social/follow/:targetUserId` - Unfollow user
- `GET /social/followers/:userId` - Get followers
- `GET /social/following/:userId` - Get following

### Events
- `GET /events` - Get all events
- `POST /events` - Create event
- `GET /events/:eventId` - Get single event
- `POST /events/:eventId/like` - Like event
- `DELETE /events/:eventId/like` - Unlike event
- `POST /events/:eventId/comments` - Add comment
- `GET /events/:eventId/comments` - Get comments

### Messages
- `POST /messages/send` - Send message
- `GET /messages/:otherUserId` - Get conversation
- `GET /messages/conversations/list` - Get all conversations

### Matching
- `GET /users/discover` - Get all users
- `POST /matching/ai-suggest` - AI-powered matching
- `POST /matching/chatbot` - AI chatbot

---

## 🎨 Customization

### Theme Colors
Edit `/styles/globals.css` to customize the color scheme:
- `--primary` - Primary brand color
- `--secondary` - Secondary color
- `--accent` - Accent color
- `--background` - Background color
- `--foreground` - Text color

### Adding Features
1. Create new components in `/components`
2. Add API routes in `/supabase/functions/server/index.tsx`
3. Update routing in `/App.tsx`

---

## 📚 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide icons
- **Backend**: Deno, Hono.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (JWT)
- **AI**: Google Gemini API
- **Real-time**: Polling (message updates every 3s)

---

## 🌟 Future Enhancements

Potential features to add:
- [ ] WebSocket for real-time messaging (replace polling)
- [ ] GitHub/LinkedIn profile integration
- [ ] Advanced search and filters for events
- [ ] Notification system
- [ ] Email notifications
- [ ] File sharing in chat
- [ ] Video call integration
- [ ] Team formation (multi-user groups)
- [ ] Project showcase portfolios

---

## 📝 Notes

- This is a prototype/MVP designed for learning and demonstration
- Not production-ready for handling sensitive PII at scale
- Requires regular backups of database
- Consider rate limiting for production use
- Add input validation and sanitization for production

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify environment variables are set
4. Test with multiple accounts for social features

---

## 📄 License

This project is for educational and demonstration purposes.

---

**Built with ❤️ using Figma Make**
