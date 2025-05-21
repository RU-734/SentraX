# SentraX
Advanced AI for adversarial simulation and vulnerability enumeration. SentraX blends reconnaissance, analysis, and exploitation into one streamlined toolkit.

## Overview
This repository contains a web application for cybersecurity professionals, specifically focused on red team operations. The application provides functionality for asset scanning, vulnerability identification, exploitation, and reporting. It's built with a modern React frontend and an Express.js backend, with Drizzle ORM for database operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The application uses a React-based frontend with the following key technologies:

- **React**: Core UI framework
- **Tailwind CSS**: For styling components with a utility-first approach
- **shadcn/ui**: Component library built on Radix UI primitives
- **Wouter**: For client-side routing, providing a lightweight alternative to React Router
- **React Query**: Data fetching and state management

The frontend follows a component-based architecture with:
- Reusable UI components (in `client/src/components/ui`)
- Page components (in `client/src/pages`)
- Context providers for application-wide state (theme, operational security settings)

### Backend

The backend is an Express.js server that:

- Serves the frontend application
- Provides API endpoints for the frontend to consume
- Handles authentication and data persistence

The server is structured with:
- Main entry point (`server/index.ts`)
- Route handlers (`server/routes.ts`)
- Storage abstraction (`server/storage.ts`)

### Data Storage

The application uses Drizzle ORM with schema definitions for various entities like:
- Users
- Assets (computers, servers, network devices)
- Vulnerabilities

The database schema is defined in `shared/schema.ts` and includes relationships between these entities.

## Key Components

### Authentication System

The application includes user authentication with:
- Username/password login
- Role-based access control
- Session management

### Asset Management

Users can:
- Add and monitor networked assets (servers, workstations, network devices)
- Categorize assets by type, tags, and operating system
- Track vulnerabilities associated with assets

### Vulnerability Scanning

Features for vulnerability detection include:
- Network reconnaissance
- AI-assisted scanning
- Vulnerability database integration

### Exploitation Framework

Tools for testing and exploiting vulnerabilities:
- Exploit chain building
- Console interface
- Targeting specific vulnerabilities

### Reporting System

Comprehensive reporting features:
- Report generation
- Templates
- Historical report storage

### OPSEC Mode

Special "OPSEC Mode" for stealthy operations:
- Traffic obfuscation
- Scan delay settings
- Randomized port usage

## Data Flow

1. **Authentication Flow**:
   - User provides credentials via the login form
   - Server validates credentials and establishes a session
   - User receives access to protected routes

2. **Asset Discovery Flow**:
   - User initiates a network scan via the AI Recon page
   - Server performs the scan and identifies assets
   - Results are stored in the database and displayed to the user

3. **Vulnerability Assessment Flow**:
   - System scans assets for vulnerabilities
   - Vulnerabilities are cataloged with severity ratings
   - Users can view and sort vulnerabilities by asset or severity

4. **Exploitation Flow**:
   - User selects a vulnerability to test
   - Exploitation modules are assembled into a chain
   - Exploitation results are captured for reporting

5. **Reporting Flow**:
   - User selects report parameters and templates
   - System generates comprehensive security reports
   - Reports can be exported in various formats

## External Dependencies

The application relies on several external libraries and frameworks:

### Frontend Dependencies
- **@radix-ui** components: For accessible UI primitives
- **@tanstack/react-query**: For data fetching and caching
- **class-variance-authority** and **clsx**: For component styling variants
- **date-fns**: For date formatting and manipulation
- **lucide-react**: For UI icons

### Backend Dependencies
- **express**: Web server framework
- **drizzle-orm**: Database ORM
- **@neondatabase/serverless**: Database connector (for Neon PostgreSQL)
- **connect-pg-simple**: For PostgreSQL session storage

## Deployment Strategy

The application is configured for deployment in a Replit environment:

1. **Development Mode**:
   - Run with `npm run dev`
   - Uses Node.js development server with hot reloading
   - Vite provides frontend development features

2. **Production Build**:
   - Build step: `npm run build`
   - Frontend assets are built with Vite
   - Backend is bundled with esbuild

3. **Production Runtime**:
   - Start with `npm run start`
   - Serves the compiled frontend from static files
   - Runs the optimized backend server

A PostgreSQL database is required for the application to function properly. The application expects a `DATABASE_URL` environment variable to connect to the database.

## Database Setup

The database schema is managed with Drizzle ORM:
- Schema defined in `shared/schema.ts`
- Migrations can be pushed with `npm run db:push`
- Database tables include: users, assets, vulnerabilities

When setting up the project, ensure the PostgreSQL database is provisioned and the `DATABASE_URL` environment variable is set correctly.
