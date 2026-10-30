# 🚀 Codemate - AI-Powered Partner Matching Platform

<div align="center">

**Find your perfect coding partner with the power of AI**

[![Built with React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg)](https://supabase.com/)

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Demo](#-demo)

</div>

---

## 📖 About

Codemate is a comprehensive platform that connects developers for hackathons, coding projects, and collaboration. Using AI-powered semantic matching and a robust social networking system, Codemate makes it easy to find developers with complementary skills and shared interests.

### Why Codemate?

- 🤖 **AI-Powered Matching**: Google Gemini integration for intelligent partner suggestions
- 💬 **Real-Time Chat**: Instant messaging between developers
- 📅 **Event Management**: Create and discover hackathons and coding events
- 👥 **Social Network**: Follow, engage, and build your developer network
- 🎨 **Modern UI**: Beautiful, responsive design with dark mode
- 🔒 **Secure**: JWT authentication with bcrypt password hashing

---

## ✨ Features

### 🔐 User Authentication
- ✅ Email/password registration
- ✅ Secure login/logout with JWT tokens
- ✅ Session management
- ✅ Password hashing with bcrypt

### 👤 Profile Management
- ✅ Customizable profiles (name, bio, location, availability)
- ✅ Skill tags with hashtags (#React, #Python, etc.)
- ✅ Profile preview
- ✅ Follower/following counts

### 🧠 AI-Powered Matching
- ✅ Semantic matching using Google Gemini API
- ✅ Rule-based filtering (location, availability, skills)
- ✅ Natural language queries
- ✅ AI chatbot for partner recommendations
- ✅ Fallback to rule-based matching

### 🌐 Social Features
- ✅ Follow/unfollow users
- ✅ User discovery and browsing
- ✅ Event/hackathon posts
- ✅ Like and comment on events
- ✅ News feed with social updates
- ✅ Profile view with engagement stats

### 💬 Real-Time Messaging
- ✅ One-to-one chat
- ✅ Conversation list
- ✅ Message history
- ✅ Auto-refresh (polling every 3 seconds)
- ✅ Online status indicators

### 🎨 UI/UX
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Dark/light mode toggle
- ✅ Modern component library (shadcn/ui)
- ✅ Smooth animations and transitions
- ✅ Accessible design (ARIA labels)
- ✅ Loading states and error handling

---

## 🚀 Quick Start

### 1. Access the Application

The application is already deployed and ready to use!

### 2. Create Your Account

1. Click **"Register"**
2. Enter your name, email, and password
3. Click **"Create Account"**

### 3. Set Up Your Profile

1. Go to **"Profile"** tab
2. Add your bio, location, and skills
3. Set your availability status
4. Click **"Save Changes"**

### 4. Start Exploring

- **Discover**: Find and follow developers
- **Events**: Browse and create hackathon posts
- **Messages**: Chat with your connections
- **AI Chat**: Get personalized recommendations

For detailed instructions, see [QUICKSTART.md](./QUICKSTART.md)

---

## 📚 Documentation

### For Users
- **[Quick Start Guide](./QUICKSTART.md)** - Get started in 5 minutes
- **[Deployment Guide](./DEPLOYMENT.md)** - Full deployment documentation
- **[GitHub and Vercel setup](../../DEPLOYMENT_GUIDE.md)** - Repository-specific deployment steps

### For Developers
- **[Architecture](./ARCHITECTURE.md)** - Technical architecture and design decisions
- **[Environment Setup](./ENV_SETUP.md)** - Configure environment variables

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4.0** - Utility-first styling
- **shadcn/ui** - Component library
- **Lucide Icons** - Icon library

### Backend
- **Deno** - Modern JavaScript runtime
- **Hono.js** - Fast web framework
- **Supabase Edge Functions** - Serverless functions

### Database & Auth
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Supabase Auth** - JWT authentication

### AI
- **Google Gemini API** - AI-powered matching

---

## 📁 Project Structure

```
/
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard components
│   ├── layout/          # Layout components (Navbar)
│   ├── matching/        # Discovery and AI matching
│   ├── messaging/       # Chat components
│   ├── profile/         # Profile management
│   ├── social/          # Events and feed
│   └── ui/              # shadcn/ui components
├── supabase/
│   └── functions/
│       └── server/      # Backend API
│           ├── index.tsx        # Main server & routes
│           └── kv_store.tsx     # Database layer
├── utils/               # Utilities
│   ├── auth-context.tsx # Authentication context
│   ├── api.tsx          # API helper functions
│   └── supabase/        # Supabase client
├── styles/
│   └── globals.css      # Global styles & theme
├── App.tsx              # Main application
├── README.md            # This file
├── QUICKSTART.md        # Quick start guide
├── DEPLOYMENT.md        # Deployment documentation
├── ARCHITECTURE.md      # Technical architecture
└── ENV_SETUP.md         # Environment variables
```

---

## 🎯 Key Capabilities

### For Developers
- Find coding partners for hackathons
- Discover developers with specific skills
- Join coding events and competitions
- Build your professional network
- Collaborate on projects

### For Organizations
- Post hackathon announcements
- Recruit developers
- Build coding communities
- Organize virtual events
- Connect with talent

---

## 🔒 Security

- ✅ **Authentication**: JWT-based secure authentication
- ✅ **Password Security**: bcrypt hashing (handled by Supabase)
- ✅ **Data Protection**: HTTPS encryption
- ✅ **Authorization**: Per-user access control
- ✅ **Input Validation**: Frontend and backend validation
- ✅ **CORS**: Properly configured CORS headers

---

## 🌟 Unique Features

### AI-Powered Matching
```
"Find me a React developer for a startup project in San Francisco"
→ Returns semantically relevant matches ranked by AI
```

### Natural Language Chatbot
```
User: "I need a Python expert for machine learning"
AI: "I found 3 great matches! Sarah has 5 years of ML experience..."
```

### Smart Filtering
- Combine AI matching with rule-based filters
- Location-aware suggestions
- Availability-based matching
- Skill-based recommendations

---

## 📊 Use Cases

### 1. Hackathon Partner Finding
```
Scenario: Developer needs teammate for weekend hackathon
Solution: Use AI search with "hackathon partner, React, available this weekend"
Result: Matched with 5 available React developers
```

### 2. Startup Co-Founder Search
```
Scenario: Entrepreneur needs technical co-founder
Solution: Post event with required skills, chat with AI for recommendations
Result: Connected with experienced full-stack developers
```

### 3. Learning & Collaboration
```
Scenario: Junior developer wants to learn from seniors
Solution: Follow experienced developers, engage on their posts
Result: Built network and got mentorship opportunities
```

---

## 🔮 Roadmap

### Coming Soon
- [ ] WebSocket for true real-time messaging
- [ ] Email notifications
- [ ] GitHub profile integration
- [ ] Advanced search filters
- [ ] Team formation (groups)
- [ ] Video call integration

### Future Enhancements
- [ ] LinkedIn integration
- [ ] Project showcase portfolios
- [ ] Skill endorsements
- [ ] Reputation system
- [ ] Event calendar view
- [ ] Mobile apps (iOS/Android)

---

## 🤝 Contributing

This is a demonstration project built with Figma Make. For improvements or suggestions:

1. Test the application thoroughly
2. Document any issues or feature requests
3. Provide detailed feedback

---

## 📝 License

This project is for educational and demonstration purposes.

---

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **Google Gemini** - AI capabilities
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling system
- **React** - Frontend framework

---

## 📞 Support

### Resources
- [Quick Start Guide](./QUICKSTART.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Architecture Docs](./ARCHITECTURE.md)
- [Environment Setup](./ENV_SETUP.md)

### Troubleshooting
Check the [Deployment Guide](./DEPLOYMENT.md) troubleshooting section for common issues.

---

## 📈 Stats

- **Components**: 15+ custom React components
- **API Endpoints**: 20+ REST endpoints
- **Lines of Code**: ~5000+ LOC
- **Database Tables**: Key-value store with 7+ prefixes
- **Features**: 50+ individual features

---

<div align="center">

**Built with ❤️ using Figma Make**

[Get Started](#-quick-start) • [View Docs](./DEPLOYMENT.md) • [Architecture](./ARCHITECTURE.md)

⭐ **Happy Coding!** ⭐

</div>
