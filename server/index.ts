import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set for session store');
}
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET environment variable is not set. Using a default, insecure secret. SET THIS IN PRODUCTION!');
}

const app: Express = express();

// Session Store Setup
const PGStore = connectPgSimple(session);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Consider adding SSL configuration for production if connecting to an external DB
  // ssl: { rejectUnauthorized: false } // Example, adjust based on your DB provider
});

app.use(session({
  store: new PGStore({
    pool: pool,
    tableName: 'session', // Default table name, ensure it matches your DB schema
    createTableIfMissing: false, // Recommended to create table manually via migrations
                                 // Set to true for auto-creation (dev only, review table schema)
  }),
  secret: process.env.SESSION_SECRET || 'a-very-insecure-default-secret', // Fallback for dev only
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie valid for 7 days
    // sameSite: 'lax', // Consider 'strict' or 'lax' for CSRF protection
  }
}));

// Extend Express Request type to include session property
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      role: string; // Assuming role is part of user schema and session
    };
  }
}
const port = process.env.PORT || 3001;

app.use(express.json());

// Mount the routes
app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

export default app; // Export for potential testing or programmatic use
