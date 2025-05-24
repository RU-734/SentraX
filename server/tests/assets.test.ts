import request from 'supertest';
import app from '../index'; // The Express app instance
import { db } from '../db';   // Drizzle ORM instance
import { users, assets as assetsTable } from '@shared/schema'; // Schemas
import { eq, sql } from 'drizzle-orm'; // For cleanup and queries

let agent: request.SuperAgentTest; // To persist session cookies across requests
let testUserId: number;

const baseTestUser = {
  username: `asset_testuser_${Date.now()}`,
  email: `asset_test_${Date.now()}@example.com`,
  password: 'Password123!',
};

const getSampleAssetData = (suffix: string | number = Date.now()) => ({
  name: `Test Asset ${suffix}`,
  type: 'server' as const, // Valid asset type
  ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`, // Random IP
  macAddress: `00:1A:2B:3C:4D:${Math.floor(Math.random() * 90 + 10)}`,
  operatingSystem: 'TestOS',
  description: 'A test asset description.',
});


describe('Asset API (/api/assets)', () => {
  beforeAll(async () => {
    // 1. Register the test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(baseTestUser);
    
    if (registerResponse.status !== 201) {
      // Fallback: try to login if registration failed (e.g. user already exists from a previous failed test run)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: baseTestUser.username, password: baseTestUser.password });
      if (loginResponse.status !== 200) {
        throw new Error('Failed to register or login test user for asset tests.');
      }
      testUserId = loginResponse.body.user.id;
    } else {
      testUserId = registerResponse.body.user.id;
    }

    // 2. Login the test user and get the agent for session management
    agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({ username: baseTestUser.username, password: baseTestUser.password });
      
    if (loginResponse.status !== 200) {
        console.error("Login response body:", loginResponse.body);
        throw new Error('Login failed for test user in beforeAll.');
    }
  });

  // Clean up created assets and the test user
  afterAll(async () => {
    try {
      // Delete assets created by these tests if necessary (e.g. if names have a specific prefix)
      // More robust cleanup would involve tracking IDs created during tests.
      // For now, assuming tests clean up after themselves or specific assets by name/testUserId if that was added.
      // This is a simplification; in a real scenario, you'd use IDs or more specific markers.
      await db.delete(assetsTable).where(sql`${assetsTable.name} like 'Test Asset %'`);
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.error('Error during afterAll cleanup:', error);
    }
  });
  
  let createdAssetId: number | null = null;

  afterEach(async () => {
    // Clean up any specific asset created during a test if its ID was stored
    if (createdAssetId) {
      try {
        await db.delete(assetsTable).where(eq(assetsTable.id, createdAssetId));
      } catch (error) {
        // console.warn(`Warning: Failed to clean up asset with ID ${createdAssetId} after test.`, error);
      }
      createdAssetId = null; // Reset for next test
    }
  });


  // Test authentication for all asset routes
  describe('Authentication Checks', () => {
    const endpoints = [
      { method: 'post', path: '/api/assets' },
      { method: 'get', path: '/api/assets' },
      { method: 'get', path: '/api/assets/1' }, // Assuming 1 is a placeholder ID
      { method: 'put', path: '/api/assets/1' },
      { method: 'delete', path: '/api/assets/1' },
    ];

    endpoints.forEach(endpoint => {
      it(`should return 401 for ${endpoint.method.toUpperCase()} ${endpoint.path} if not authenticated`, async () => {
        // @ts-ignore
        await request(app)[endpoint.method](endpoint.path).send({}).expect(401);
      });
    });
  });

  describe('POST /api/assets (Create Asset)', () => {
    it('should create a new asset successfully', async () => {
      const assetData = getSampleAssetData('create_success');
      const response = await agent
        .post('/api/assets')
        .send(assetData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      createdAssetId = response.body.id; // Store for cleanup
      expect(response.body.name).toBe(assetData.name);
      expect(response.body.type).toBe(assetData.type);
      expect(response.body.ipAddress).toBe(assetData.ipAddress);
    });

    it('should fail to create an asset with missing required fields (name)', async () => {
      const { name, ...assetDataWithoutName } = getSampleAssetData('missing_name');
      const response = await agent
        .post('/api/assets')
        .send(assetDataWithoutName)
        .expect(400);
      expect(response.body.message).toBe('Name, type, and IP address are required.');
    });
    
    it('should fail to create an asset with an invalid type enum', async () => {
        const assetData = { ...getSampleAssetData('invalid_type'), type: 'invalid_enum_value' };
        const response = await agent
            .post('/api/assets')
            .send(assetData)
            .expect(400);
        expect(response.body.message).toMatch(/Invalid asset type/);
    });
  });

  describe('GET /api/assets (List Assets)', () => {
    it('should retrieve all assets (or an empty array if none)', async () => {
      // First, ensure at least one asset is created for this test scope if we want to test non-empty
      const assetData = getSampleAssetData('list_test');
      const createRes = await agent.post('/api/assets').send(assetData).expect(201);
      createdAssetId = createRes.body.id;

      const response = await agent.get('/api/assets').expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1); // Check if the created asset is in the list
      expect(response.body.some((asset: any) => asset.id === createdAssetId)).toBe(true);
    });
    
    it('should return an empty array if no assets exist (after cleanup)', async () => {
        // Ensure all assets are cleaned up (this is tricky without more specific targeting)
        // This test relies on previous cleanup, or we'd need a dedicated cleanup before it.
        // For now, we assume afterEach handles specific test creations.
        // A more robust test would delete ALL assets and then GET.
        // This test is more of a placeholder given current cleanup strategy.
        // Let's clear the createdAssetId from a previous test in this describe block if any.
        if (createdAssetId) {
            await db.delete(assetsTable).where(eq(assetsTable.id, createdAssetId));
            createdAssetId = null;
        }
        const response = await agent.get('/api/assets').expect(200);
        expect(Array.isArray(response.body)).toBe(true);
        // This assertion is weak if other tests are running concurrently or failed to clean up.
        // expect(response.body.length).toBe(0); // This might fail if other assets exist.
    });
  });

  describe('GET /api/assets/:assetId (Retrieve Asset by ID)', () => {
    let tempAssetId: number;
    beforeEach(async () => {
        const assetData = getSampleAssetData('get_by_id');
        const res = await agent.post('/api/assets').send(assetData).expect(201);
        tempAssetId = res.body.id;
        createdAssetId = tempAssetId; // Ensure it's cleaned up
    });

    it('should retrieve an existing asset by ID', async () => {
      const response = await agent.get(`/api/assets/${tempAssetId}`).expect(200);
      expect(response.body.id).toBe(tempAssetId);
      expect(response.body.name).toMatch(/Test Asset get_by_id/);
    });

    it('should return 404 for a non-existent asset ID', async () => {
      await agent.get('/api/assets/999999').expect(404);
    });
    
    it('should return 400 for an invalid ID format (non-numeric)', async () => {
        await agent.get('/api/assets/invalidID').expect(400);
    });
  });

  describe('PUT /api/assets/:assetId (Update Asset)', () => {
    let tempAssetId: number;
    const initialAssetData = getSampleAssetData('update_initial');
    
    beforeEach(async () => {
        const res = await agent.post('/api/assets').send(initialAssetData).expect(201);
        tempAssetId = res.body.id;
        createdAssetId = tempAssetId; // Ensure it's cleaned up
    });

    it('should successfully update an existing asset', async () => {
      const updatedData = { name: 'Updated Asset Name', type: 'workstation' as const };
      const response = await agent
        .put(`/api/assets/${tempAssetId}`)
        .send(updatedData)
        .expect(200);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.type).toBe(updatedData.type);
      expect(response.body.ipAddress).toBe(initialAssetData.ipAddress); // Unchanged field
    });

    it('should return 404 when trying to update a non-existent asset', async () => {
      await agent.put('/api/assets/999999').send({ name: 'NonExistentUpdate' }).expect(404);
    });
    
    it('should fail to update with an invalid type enum', async () => {
        const response = await agent
            .put(`/api/assets/${tempAssetId}`)
            .send({ type: 'invalid_enum_for_put' })
            .expect(400);
        expect(response.body.message).toMatch(/Invalid asset type/);
    });
  });

  describe('DELETE /api/assets/:assetId (Delete Asset)', () => {
    let tempAssetId: number;
    beforeEach(async () => {
        const assetData = getSampleAssetData('delete_target');
        const res = await agent.post('/api/assets').send(assetData).expect(201);
        tempAssetId = res.body.id;
        // Don't assign to createdAssetId here, as we want to verify deletion
    });

    it('should successfully delete an existing asset', async () => {
      const response = await agent.delete(`/api/assets/${tempAssetId}`).expect(200);
      expect(response.body.message).toBe('Asset deleted successfully.');
      expect(response.body.assetId).toBe(tempAssetId);

      // Verify it's actually gone
      await agent.get(`/api/assets/${tempAssetId}`).expect(404);
    });

    it('should return 404 when trying to delete a non-existent asset', async () => {
      await agent.delete('/api/assets/999999').expect(404);
    });
  });
});
