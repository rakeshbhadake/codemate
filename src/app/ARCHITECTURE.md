# Codemate - Technical Architecture

## System Overview

Codemate is a full-stack web application built with a modern three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              React + TypeScript + Tailwind CSS               │
│                    (Static Hosting)                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS/REST
                            │ JWT Auth
┌───────────────────────────▼─────────────────────────────────┐
│                         Backend                              │
│           Deno + Hono.js (Supabase Edge Functions)          │
│                    Business Logic Layer                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQL + KV Store
┌───────────────────────────▼─────────────────────────────────┐
│                        Database                              │
│              PostgreSQL + Supabase Auth                      │
│                  (Managed by Supabase)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **React 18**: UI framework with hooks
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Pre-built accessible components
- **Lucide Icons**: Icon library
- **Context API**: State management

### Component Structure

```
/components
├── auth/
│   ├── LoginForm.tsx          # User login
│   └── RegisterForm.tsx       # User registration
├── layout/
│   └── Navbar.tsx             # Main navigation
├── dashboard/
│   └── Dashboard.tsx          # User dashboard
├── profile/
│   └── ProfileEditor.tsx      # Profile management
├── social/
│   ├── Feed.tsx               # Events feed
│   └── EventCard.tsx          # Event post card
├── matching/
│   ├── MatchingSystem.tsx     # Main discovery interface
│   ├── UserCard.tsx           # User profile card
│   └── AIChat.tsx             # AI chatbot
├── messaging/
│   ├── ConversationList.tsx   # Chat list
│   └── ChatInterface.tsx      # Chat window
└── ui/                        # shadcn/ui components
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    └── ... (40+ components)
```

### State Management

```typescript
// Global Auth State (Context API)
interface AuthContext {
  user: User | null;
  accessToken: string | null;
  login: (email, password) => Promise<void>;
  register: (data) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates) => void;
  isLoading: boolean;
}

// Local Component State (useState/useEffect)
- UI state (modals, forms)
- Data fetching state
- Loading/error states
```

### Routing

Single-page application with view-based routing:
- `dashboard` - Main dashboard
- `profile` - Profile editor
- `discover` - User discovery & matching
- `events` - Event feed
- `messages` - Chat interface

---

## Backend Architecture

### Technology Stack
- **Deno**: Modern JavaScript/TypeScript runtime
- **Hono.js**: Fast web framework
- **Supabase Auth**: Authentication service
- **PostgreSQL**: Relational database (via KV abstraction)

### API Structure

```
/supabase/functions/server/
├── index.tsx              # Main server & routes
└── kv_store.tsx          # Database abstraction (protected)
```

### API Routes

#### Authentication (`/auth/*`)
```typescript
POST   /auth/signup        # Create new user
POST   /auth/signin        # Login user
GET    /auth/session       # Get current session
POST   /auth/signout       # Logout user
```

#### Profile (`/profile/*`)
```typescript
GET    /profile/:userId    # Get user profile
PUT    /profile            # Update own profile
```

#### Social (`/social/*`)
```typescript
POST   /social/follow/:targetUserId       # Follow user
DELETE /social/follow/:targetUserId       # Unfollow user
GET    /social/followers/:userId          # Get followers
GET    /social/following/:userId          # Get following
```

#### Events (`/events/*`)
```typescript
GET    /events                           # Get all events
POST   /events                           # Create event
GET    /events/:eventId                  # Get single event
POST   /events/:eventId/like             # Like event
DELETE /events/:eventId/like             # Unlike event
POST   /events/:eventId/comments         # Add comment
GET    /events/:eventId/comments         # Get comments
```

#### Messaging (`/messages/*`)
```typescript
POST   /messages/send                    # Send message
GET    /messages/:otherUserId            # Get conversation
GET    /messages/conversations/list      # Get all conversations
```

#### Matching (`/matching/*` & `/users/*`)
```typescript
GET    /users/discover                   # Get all users
POST   /matching/ai-suggest              # AI-powered matching
POST   /matching/chatbot                 # AI chatbot
```

### Middleware

```typescript
// CORS - Open for all origins
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// Logger - All requests logged
app.use('*', logger(console.log));

// Auth - Per-route authentication
const getAuthenticatedUser = async (authHeader) => {
  const accessToken = authHeader.split(' ')[1];
  const { data: { user } } = await supabase.auth.getUser(accessToken);
  return user;
};
```

---

## Database Architecture

### Storage Model

Using **Key-Value Store** pattern with PostgreSQL:

```
Key Pattern                     Value Type          Purpose
──────────────────────────────  ──────────────────  ─────────────────────
user:{userId}                   JSON                User profile
follow:{userId}:{targetId}      JSON                Follow relationship
event:{eventId}                 JSON                Event post
event-like:{eventId}:{userId}   JSON                Event like
event-comment:{eventId}:{cId}   JSON                Event comment
message:{convId}:{msgId}        JSON                Chat message
conversation:{conversationId}   JSON                Conversation metadata
```

### Data Models

#### User Profile
```typescript
{
  id: string;
  email: string;
  name: string;
  skills: string[];
  bio: string;
  location: string;
  availability: 'available' | 'busy' | 'unavailable';
  followers: number;
  following: number;
  createdAt: string;
}
```

#### Event Post
```typescript
{
  id: string;
  authorId: string;
  title: string;
  description: string;
  date: string;
  location: string;
  link: string;
  requiredSkills: string[];
  likes: number;
  commentCount: number;
  createdAt: string;
}
```

#### Message
```typescript
{
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  read: boolean;
  createdAt: string;
}
```

### Indexing Strategy

Key prefixes enable efficient queries:
- `getByPrefix('user:')` - Get all users
- `getByPrefix('follow:{userId}:')` - Get user's following list
- `getByPrefix('event:')` - Get all events
- `getByPrefix('message:{convId}:')` - Get conversation messages

---

## Authentication Flow

### Registration Flow

```
1. User submits registration form
   ↓
2. Frontend → POST /auth/signup
   ↓
3. Backend creates user via Supabase Auth
   (Password automatically hashed with bcrypt)
   ↓
4. Backend stores user profile in KV store
   ↓
5. Backend returns success
   ↓
6. Frontend auto-logins user
```

### Login Flow

```
1. User submits login form
   ↓
2. Frontend → POST /auth/signin
   ↓
3. Backend verifies credentials via Supabase Auth
   ↓
4. Backend fetches user profile from KV store
   ↓
5. Backend returns JWT access token + profile
   ↓
6. Frontend stores token in localStorage
   ↓
7. Frontend stores user in Context
```

### Authenticated Request Flow

```
1. User makes request (e.g., create event)
   ↓
2. Frontend adds JWT to Authorization header
   ↓
3. Backend extracts token from header
   ↓
4. Backend validates token with Supabase Auth
   ↓
5. Backend processes request with user context
   ↓
6. Backend returns response
```

---

## AI Integration

### Google Gemini API

```typescript
// Semantic Matching
const prompt = `
  Current user: ${userProfile}
  Query: "${userQuery}"
  Candidates: [list of users]
  
  Rank candidates by compatibility.
  Return JSON array of indices.
`;

// Chatbot
const prompt = `
  You are Codemate AI.
  User message: "${message}"
  Available developers: [list]
  
  Respond conversationally and suggest matches.
`;
```

### Fallback Strategy

```
1. Try AI matching with Gemini API
   ↓ (if fails or API key missing)
2. Fall back to rule-based filtering
   - Filter by location
   - Filter by availability
   - Filter by skill overlap
   ↓
3. Return top matches
```

---

## Real-Time Features

### Message Polling

```typescript
// Frontend polls every 3 seconds
useEffect(() => {
  const interval = setInterval(loadMessages, 3000);
  return () => clearInterval(interval);
}, [selectedUserId]);
```

### Future: WebSocket Implementation

For true real-time, consider:
- Supabase Realtime subscriptions
- Socket.IO integration
- Server-sent events (SSE)

---

## Security Architecture

### Authentication Security
- ✅ JWT-based authentication
- ✅ Passwords hashed with bcrypt (Supabase)
- ✅ Secure token storage (localStorage)
- ✅ Token validation on every request

### Authorization
- ✅ User can only edit own profile
- ✅ User must be authenticated for all actions
- ✅ API endpoints protected with auth middleware

### Data Protection
- ✅ HTTPS encryption (Supabase)
- ✅ Row-level security (Supabase)
- ✅ Input sanitization (frontend)
- ✅ SQL injection prevention (parameterized queries)

### CORS Policy
- ⚠️ Currently open (`origin: "*"`)
- 🔒 Production should restrict to app domain

---

## Performance Optimization

### Frontend
- ✅ Component lazy loading
- ✅ Memoization of expensive computations
- ✅ Efficient re-rendering with React hooks
- ✅ Tailwind CSS tree-shaking

### Backend
- ✅ Key-value store for fast lookups
- ✅ Efficient prefix-based queries
- ✅ Edge function deployment (low latency)
- ✅ Connection pooling (Supabase)

### Database
- ✅ Indexed key patterns
- ✅ Denormalized data for read performance
- ✅ Atomic updates for counters
- ✅ Efficient pagination (prefix queries)

---

## Scalability Considerations

### Current Limitations
- Message polling (not true real-time)
- No pagination for large lists
- In-memory state (no persistence)
- Single-region deployment

### Scaling Strategy

**Phase 1: Optimize Current Stack**
- Add pagination to all list endpoints
- Implement caching layer (Redis)
- Add rate limiting
- Optimize database queries

**Phase 2: Real-Time Infrastructure**
- Implement WebSocket connections
- Add message queue (RabbitMQ/Redis)
- Background job processing
- Event-driven architecture

**Phase 3: Distributed System**
- Multi-region deployment
- Load balancing
- Database replication
- CDN for static assets

---

## Monitoring & Observability

### Current Logging
```typescript
// Request logging
app.use('*', logger(console.log));

// Error logging
console.log("Error context:", error);
```

### Production Needs
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- Usage analytics (Mixpanel)
- Uptime monitoring (Pingdom)
- Log aggregation (Datadog)

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Figma Make Platform              │
│  (Static hosting + Edge Functions)       │
│                                          │
│  ┌────────────┐      ┌────────────┐     │
│  │  Frontend  │      │  Backend   │     │
│  │   React    │◄─────┤   Deno     │     │
│  └────────────┘      └──────┬─────┘     │
└──────────────────────────────┼──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Supabase Cloud    │
                    │  - PostgreSQL DB    │
                    │  - Auth Service     │
                    │  - Edge Functions   │
                    └────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Google Cloud       │
                    │  Gemini API         │
                    └────────────────────┘
```

---

## Technology Choices - Rationale

### React
- ✅ Industry standard
- ✅ Large ecosystem
- ✅ Great developer experience
- ✅ Strong TypeScript support

### Tailwind CSS
- ✅ Rapid development
- ✅ Consistent design
- ✅ Small bundle size
- ✅ Built-in responsive design

### Supabase
- ✅ All-in-one backend platform
- ✅ Built-in authentication
- ✅ PostgreSQL database
- ✅ Edge functions support
- ✅ Free tier for prototyping

### Deno + Hono
- ✅ Modern runtime (secure by default)
- ✅ Native TypeScript support
- ✅ Fast performance
- ✅ Simple API design

### Key-Value Store
- ✅ Simple data model
- ✅ Fast reads/writes
- ✅ Easy to understand
- ✅ Good for prototyping
- ⚠️ May need migration to relational for scale

---

## Code Quality Standards

### TypeScript
- ✅ Strict type checking
- ✅ Interface definitions
- ✅ Type inference
- ✅ No `any` types (except edge cases)

### React
- ✅ Functional components only
- ✅ Custom hooks for reusable logic
- ✅ Props interface definitions
- ✅ Error boundaries (TODO)

### Code Organization
- ✅ Feature-based structure
- ✅ Separation of concerns
- ✅ Reusable utility functions
- ✅ Consistent naming conventions

---

## Future Architecture Evolution

### Short-term (1-3 months)
- Add caching layer
- Implement WebSockets
- Add pagination
- Improve error handling

### Mid-term (3-6 months)
- Migrate to relational schema
- Add background jobs
- Implement notifications
- Add file uploads

### Long-term (6-12 months)
- Microservices architecture
- GraphQL API
- Event-driven system
- Multi-tenant support

---

**Architecture Document Version**: 1.0  
**Last Updated**: 2025-01-01  
**Maintained By**: Development Team
