import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db'; // Drizzle ORM instance
import { users, userRoleEnum } from '@shared/schema';
import { eq, or } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware'; // Import the middleware

const router = Router();

const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  // 1. Validate input (basic validation)
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }

  // Validate role if provided, otherwise it will use default from schema
  if (role && !Object.values(userRoleEnum.enumValues).includes(role)) {
    return res.status(400).json({ message: 'Invalid role provided' });
  }

  try {
    // 2. Check if username or email already exists
    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.username, username), eq(users.email, email)),
    });

    if (existingUser) {
      const field = existingUser.username === username ? 'Username' : 'Email';
      return res.status(409).json({ message: `${field} already exists` });
    }

    // 3. Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Store the new user in the database
    const newUserPayload: typeof users.$inferInsert = {
      username,
      email,
      passwordHash,
      role: role || userRoleEnum.enumValues[1], // Default to 'user' if not provided or use schema default
    };

    // The schema already defines role as notNull with a default of 'user'
    // So, if role is not in req.body, it will use the schema default.
    // If role is provided and valid, it will be used.
    if (role) {
        newUserPayload.role = role;
    }


    const insertedUsers = await db.insert(users).values(newUserPayload).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
    });

    if (insertedUsers.length === 0) {
      return res.status(500).json({ message: 'Failed to register user' });
    }

    const newUser = insertedUsers[0];

    // 5. Return success response (excluding password hash)
    return res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
    });

  } catch (error) {
    console.error('Registration error:', error);
    // Drizzle specific errors can be caught here if needed, e.g., unique constraint violation
    // though the check above should catch most username/email conflicts.
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Protected route example
router.get('/me', isAuthenticated, (req: Request, res: Response) => {
  // If isAuthenticated passes, req.session.user is guaranteed to exist.
  // The SessionData interface in server/index.ts should type req.session.user.
  if (req.session.user) {
    res.status(200).json({ user: req.session.user });
  } else {
    // This case should ideally not be reached if isAuthenticated works correctly
    // and SessionData is properly typed and handled.
    res.status(500).json({ message: 'Session user data not found despite authentication.' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error - session destruction failed:', err);
        return res.status(500).json({ message: 'Logout failed. Please try again.' });
      }
      // The default cookie name for express-session is 'connect.sid'
      res.clearCookie('connect.sid');
      return res.status(200).json({ message: 'Logout successful' });
    });
  } else {
    // No session to destroy, but still clear the cookie as a precaution
    // and inform the user that they are logged out.
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logout successful (no active session found)' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // 1. Validate input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // 2. Find the user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' }); // Generic message
    }

    // 3. Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' }); // Generic message
    }

    // 4. Password is valid, login successful
    // 4. Password is valid, login successful
    // Store user information in session
    // Note: The SessionData interface was extended in server/index.ts
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const { passwordHash, ...userInfo } = user;

    return res.status(200).json({
      message: 'Login successful',
      user: userInfo, // Still send back user info for client to use
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

export default router;
