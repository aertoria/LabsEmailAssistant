# replit.md

## Overview

This is a full-stack Gmail AI assistant application called "MAILLAB" built with React, Express, and PostgreSQL. The application provides intelligent email management features including brain dumping, smart replies, context synthesis, Gmail control via natural language, and contact insights. Users authenticate via Google OAuth to access their Gmail data, which is then processed using OpenAI's API to provide AI-powered email assistance.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and bundling
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Google Identity Services for OAuth2 flow

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Google OAuth2 with googleapis library
- **External APIs**: Gmail API for email operations, OpenAI API for AI features

### Key Design Decisions
- **Monorepo Structure**: Client, server, and shared code organized in separate directories
- **Type Safety**: Shared TypeScript schemas between frontend and backend
- **Database-First**: Using Drizzle with migrations for schema management
- **Session-Based Auth**: Server-side sessions with PostgreSQL persistence for security
- **API-First**: RESTful API design with consistent error handling

## Key Components

### Authentication System
- Google OAuth2 integration with offline access for refresh tokens
- Session management with secure cookies
- Token refresh handling for long-term access
- Gmail scope authorization for reading and modifying emails

### Email Management
- Full Gmail sync with pagination and incremental updates
- Email listing, searching, and detailed view
- Star/unstar, read/unread status management
- Natural language Gmail operations

### AI Features
1. **Brain Dump & Tasks**: Convert unstructured thoughts into organized tasks
2. **Smart Reply**: Generate contextual email responses
3. **Context Synthesis**: Provide background on contacts and conversations
4. **Gmail Control**: Execute Gmail operations via natural language commands
5. **Contact Insights**: Analyze communication patterns and relationships
6. **Project Management**: AI-powered email clustering that organizes emails into project clusters with progress tracking, milestones, and visual timeline
   - Historical Trends View: Animated area charts showing email flow over time
   - Email Activity Timeline: Bar chart visualization of daily email activity
   - Conversation Metrics: KPI dashboard with velocity, response time, and participant tracking
   - Thread Tree Timeline: Hierarchical view of email conversations with expandable threads

### Database Schema
- **Users**: Store user profiles, OAuth tokens, and sync state
- **Emails**: Cached Gmail messages with metadata and content
- Support for incremental sync using Gmail's historyId

## Data Flow

1. **Authentication**: User signs in with Google → OAuth tokens stored → Session established
2. **Email Sync**: Gmail API fetches messages → Stored in PostgreSQL → Presented to user
3. **AI Processing**: User requests → OpenAI API → Processed results → Stored/returned
4. **Real-time Updates**: Gmail webhooks (planned) → Incremental sync → UI updates

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting for production
- **Google Cloud Platform**: OAuth2 credentials and Gmail API access
- **OpenAI API**: GPT models for AI-powered features

### Key Libraries
- **Authentication**: googleapis, google-auth-library
- **Database**: @neondatabase/serverless, drizzle-orm
- **UI Components**: @radix-ui/* for accessible components
- **State Management**: @tanstack/react-query
- **Utilities**: date-fns, clsx, class-variance-authority

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- Express server with TypeScript compilation via tsx
- Database migrations via Drizzle Kit
- CORS enabled for local development

### Production
- Vite build generates static assets
- Express server bundled with esbuild
- Database provisioned via Neon
- Environment variables for API keys and database URL

### Environment Configuration
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for OAuth
- `DATABASE_URL` for PostgreSQL connection
- `OPENAI_API_KEY` for AI features
- `SESSION_SECRET` for session encryption

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 08, 2025. Initial setup
- January 11, 2025. Changed application name from "Labster's MailAssist" to "MAILLAB"
- January 11, 2025. Added Project Management tab with AI-powered email clustering and progress tracking
- January 11, 2025. Simplified Project Management UI to show All Projects view by default without tabs