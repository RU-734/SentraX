import request from 'supertest';
import app from '../index'; // The Express app instance
import { db } from '../db';   // Drizzle ORM instance for cleanup
import { users } from '@shared/schema'; // User schema for cleanup
import { eq } from 'drizzle-orm';

// Centralized test user credentials
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Password123!',
};

let agent: request.SuperAgentTest; // To persist session cookies across requests

describe('Auth Routes (/api/auth)', () => {
  // Before all tests, if any global setup is needed (like DB connection if not auto)
  beforeAll(async () => {
    // Potentially seed data or ensure DB connection
    // For now, db connection is handled by app import.
  });

  // After each test, clean up the created user
  afterEach(async () => {
    try {
      await db.delete(users).where(eq(users.email, testUser.email));
      await db.delete(users).where(eq(users.username, testUser.username));
      // Clean up any other users created with slightly different credentials if necessary
      await db.delete(users).where(eq(users.username, `${testUser.username}_alt`));
      await db.delete(users).where(eq(users.email, `alt_${testUser.email}`));

    } catch (error) {
      console.error('Failed to clean up test user:', error);
    }
  });

  // After all tests, close any open handles if necessary (e.g. db connection if managed manually)
  // Jest's --detectOpenHandles and potentially forceExit should handle this for now.
  // afterAll(async () => {
  //   // Example: await db.client.end(); if your db client needs manual closing
  // });


  // ========================
  // Registration Tests
  // ========================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('user'); // Default role
    });

    it('should fail to register a user with an existing username', async () => {
      // First, register the user
      await request(app).post('/api/auth/register').send(testUser).expect(201);

      // Then, attempt to register again with the same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: `alt_${testUser.email}` }) // Different email
        .expect(409);
      expect(response.body.message).toBe('Username already exists');
    });

    it('should fail to register a user with an existing email', async () => {
      await request(app).post('/api/auth/register').send(testUser).expect(201);
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, username: `${testUser.username}_alt` }) // Different username
        .expect(409);
      expect(response.body.message).toBe('Email already exists');
    });

    it('should fail to register a user with missing fields (e.g., password)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: testUser.username, email: testUser.email }) // Password missing
        .expect(400);
      expect(response.body.message).toBe('Username, email, and password are required');
    });
  });

  // ========================
  // Login Tests
  // ========================
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Ensure user is registered before each login test
      await request(app).post('/api/auth/register').send(testUser).expect(201);
      agent = request.agent(app); // Create an agent to handle cookies for session
    });

    afterEach(() => {
        agent = undefined as any; // Clear agent
    });

    it('should login an existing user successfully', async () => {
      const response = await agent // Use agent for login
        .post('/api/auth/login')
        .send({ username: testUser.username, password: testUser.password })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
      // Check for session cookie (implementation specific, but supertest agent handles it)
      // Example: expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail to login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: testUser.username, password: 'WrongPassword!' })
        .expect(401);
      expect(response.body.message).toBe('Invalid username or password');
    });

    it('should fail to login a non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'NonExistentUser', password: testUser.password })
        .expect(401);
      expect(response.body.message).toBe('Invalid username or password');
    });
  });

  // ========================
  // Protected Route (/api/auth/me) Tests
  // ========================
  describe('GET /api/auth/me', () => {
    it('should deny access if not authenticated', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);
      expect(response.body.message).toBe('Unauthorized. Please log in.');
    });

    it('should grant access and return user data if authenticated', async () => {
      // Register user first
      await request(app).post('/api/auth/register').send(testUser).expect(201);

      // Create an agent and login to establish a session
      agent = request.agent(app);
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({ username: testUser.username, password: testUser.password })
        .expect(200);
      expect(loginResponse.body.message).toBe('Login successful');

      // Now access the protected route using the same agent (which has the session cookie)
      const meResponse = await agent.get('/api/auth/me').expect(200);
      expect(meResponse.body.user).toBeDefined();
      expect(meResponse.body.user.username).toBe(testUser.username);
      expect(meResponse.body.user.email).toBe(testUser.email);
      expect(meResponse.body.user.id).toBeDefined();

      agent = undefined as any; // Clear agent
    });
  });

  // ========================
  // Logout Tests
  // ========================
  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      // Register and login user to establish a session
      await request(app).post('/api/auth/register').send(testUser).expect(201);
      agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ username: testUser.username, password: testUser.password })
        .expect(200);
    });

    afterEach(() => {
        agent = undefined as any; // Clear agent
    });

    it('should logout an authenticated user successfully', async () => {
      // Use the agent with the active session to logout
      const response = await agent.post('/api/auth/logout').expect(200);
      expect(response.body.message).toBe('Logout successful');

      // Verify that the /me route is now protected
      const meResponse = await agent.get('/api/auth/me').expect(401);
      expect(meResponse.body.message).toBe('Unauthorized. Please log in.');
    });

    it('should return success even if no active session (e.g., already logged out)', async () => {
      // First, logout to invalidate the session
      await agent.post('/api/auth/logout').expect(200);

      // Attempt to logout again using the same agent (whose session should be invalid)
      // Or use a fresh request(app) if agent behavior is complex after invalidation
      const response = await agent.post('/api/auth/logout').expect(200);
      // The message might differ based on server impl: "no active session" vs "Logout successful"
      expect(response.body.message).toMatch(/Logout successful/);
    });
  });
});
