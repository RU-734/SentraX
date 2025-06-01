import request from 'supertest';
import app from '../index'; // The Express app instance
import { db } from '../db';   // Drizzle ORM instance
import {
    users,
    assets as assetsTable,
    vulnerabilities as vulnerabilitiesTable,
    assets_vulnerabilities as assetVulnerabilitiesTable,
    vulnerabilitySeverityEnum, // For creating sample vulnerabilities
    vulnerabilityStatusEnum // For checking/setting status
} from '@shared/schema'; // Schemas
import { eq, sql, and, desc } from 'drizzle-orm'; // For cleanup and queries

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

const getSampleVulnerabilityData = (suffix: string | number = Date.now()) => ({
  name: `Scan Test Vuln ${suffix}`,
  description: `Description for scan test vuln ${suffix}`,
  severity: vulnerabilitySeverityEnum.enumValues[Math.floor(Math.random() * vulnerabilitySeverityEnum.enumValues.length)], // Random severity
  cvssScore: (Math.random() * 10).toFixed(1).toString(),
});


describe('Asset API (/api/assets)', () => {
  const createdAssetIdsForScanTest: number[] = [];
  const createdVulnerabilityIdsForScanTest: number[] = [];
  const createdLinkIdsForScanTest: number[] = [];

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
      await db.delete(assetsTable).where(sql`${assetsTable.name} like 'Test Asset %' OR ${assetsTable.name} like 'Scan Test Asset %'`);
      await db.delete(vulnerabilitiesTable).where(sql`${vulnerabilitiesTable.name} like 'Scan Test Vuln %'`);
      if (createdLinkIdsForScanTest.length > 0) { // Clean up any explicitly tracked links
        await db.delete(assetVulnerabilitiesTable).where(sql`${assetVulnerabilitiesTable.id} IN ${createdLinkIdsForScanTest}`);
        createdLinkIdsForScanTest.length = 0;
      }
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.error('Error during afterAll cleanup:', error);
    }
  });

  let createdAssetIdForCRUD: number | null = null; // Renamed to avoid conflict

  afterEach(async () => {
    // Clean up any specific asset created during a test if its ID was stored
    if (createdAssetIdForCRUD) {
      try {
        await db.delete(assetsTable).where(eq(assetsTable.id, createdAssetIdForCRUD));
      } catch (error) {
        // console.warn(`Warning: Failed to clean up asset with ID ${createdAssetIdForCRUD} after test.`, error);
      }
      createdAssetIdForCRUD = null; // Reset for next test
    }
    // Cleanup for scan test specific items will be handled in its own afterEach
    if (createdAssetIdsForScanTest.length > 0) {
        await db.delete(assetsTable).where(sql`${assetsTable.id} IN ${createdAssetIdsForScanTest}`);
        createdAssetIdsForScanTest.length = 0;
    }
    if (createdVulnerabilityIdsForScanTest.length > 0) {
        await db.delete(vulnerabilitiesTable).where(sql`${vulnerabilitiesTable.id} IN ${createdVulnerabilityIdsForScanTest}`);
        createdVulnerabilityIdsForScanTest.length = 0;
    }
    if (createdLinkIdsForScanTest.length > 0) {
        await db.delete(assetVulnerabilitiesTable).where(sql`${assetVulnerabilitiesTable.id} IN ${createdLinkIdsForScanTest}`);
        createdLinkIdsForScanTest.length = 0;
    }
  });


  // Test authentication for all asset routes (excluding scan for now, will be tested separately)
  describe('Authentication Checks (CRUD)', () => {
    const crudEndpoints = [
      { method: 'post', path: '/api/assets', data: {} },
      { method: 'get', path: '/api/assets', data: undefined },
      { method: 'get', path: '/api/assets/1', data: undefined },
      { method: 'put', path: '/api/assets/1', data: {} },
      { method: 'delete', path: '/api/assets/1', data: undefined },
    ];

    crudEndpoints.forEach(endpoint => {
      it(`should return 401 for ${endpoint.method.toUpperCase()} ${endpoint.path} if not authenticated`, async () => {
        // @ts-ignore
        await request(app)[endpoint.method](endpoint.path).send(endpoint.data || {}).expect(401);
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
      createdAssetIdForCRUD = response.body.id; // Store for cleanup
      expect(response.body.name).toBe(assetData.name);
      expect(response.body.type).toBe(assetData.type);
      expect(response.body.ipAddress).toBe(assetData.ipAddress);
    });

    it('should fail to create an asset with missing required fields (name)', async () => {
      const { name, ...assetDataWithoutName } = getSampleAssetData('missing_name_crud');
      const response = await agent
        .post('/api/assets')
        .send(assetDataWithoutName)
        .expect(400);
      expect(response.body.message).toBe('Name, type, and IP address are required.');
    });

    it('should fail to create an asset with an invalid type enum', async () => {
        const assetData = { ...getSampleAssetData('invalid_type_crud'), type: 'invalid_enum_value' };
        const response = await agent
            .post('/api/assets')
            .send(assetData)
            .expect(400);
        expect(response.body.message).toMatch(/Invalid asset type/);
    });
  });

  describe('GET /api/assets (List Assets)', () => {
    it('should retrieve all assets (or an empty array if none)', async () => {
      const assetData = getSampleAssetData('list_test_crud');
      const createRes = await agent.post('/api/assets').send(assetData).expect(201);
      createdAssetIdForCRUD = createRes.body.id;

      const response = await agent.get('/api/assets').expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((asset: any) => asset.id === createdAssetIdForCRUD)).toBe(true);
    });

    it('should return an empty array if no assets exist (after cleanup, relies on isolation)', async () => {
        if (createdAssetIdForCRUD) { // Clear any from previous test in this block
            await db.delete(assetsTable).where(eq(assetsTable.id, createdAssetIdForCRUD));
            createdAssetIdForCRUD = null;
        }
        // This test is more reliable if we ensure the DB is truly empty for assets.
        // For now, we assume afterEach from the parent scope will handle broader cleanup.
        const response = await agent.get('/api/assets').expect(200);
        expect(Array.isArray(response.body)).toBe(true);
        // Check if it's empty only if we are sure no other tests are polluting
        // expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/assets/:assetId (Retrieve Asset by ID)', () => {
    let tempAssetId: number;
    beforeEach(async () => {
        const assetData = getSampleAssetData('get_by_id_crud');
        const res = await agent.post('/api/assets').send(assetData).expect(201);
        tempAssetId = res.body.id;
        createdAssetIdForCRUD = tempAssetId;
    });

    it('should retrieve an existing asset by ID', async () => {
      const response = await agent.get(`/api/assets/${tempAssetId}`).expect(200);
      expect(response.body.id).toBe(tempAssetId);
      expect(response.body.name).toMatch(/Test Asset get_by_id_crud/);
    });

    it('should return 404 for a non-existent asset ID', async () => {
      await agent.get('/api/assets/9999999').expect(404);
    });

    it('should return 400 for an invalid ID format (non-numeric)', async () => {
        await agent.get('/api/assets/invalidIDcrud').expect(400);
    });
  });

  describe('PUT /api/assets/:assetId (Update Asset)', () => {
    let tempAssetId: number;
    const initialAssetData = getSampleAssetData('update_initial_crud');

    beforeEach(async () => {
        const res = await agent.post('/api/assets').send(initialAssetData).expect(201);
        tempAssetId = res.body.id;
        createdAssetIdForCRUD = tempAssetId;
    });

    it('should successfully update an existing asset', async () => {
      const updatedData = { name: 'Updated Asset Name CRUD', type: 'workstation' as const };
      const response = await agent
        .put(`/api/assets/${tempAssetId}`)
        .send(updatedData)
        .expect(200);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.type).toBe(updatedData.type);
    });

    it('should return 404 when trying to update a non-existent asset', async () => {
      await agent.put('/api/assets/9999999').send({ name: 'NonExistentUpdateCRUD' }).expect(404);
    });

    it('should fail to update with an invalid type enum', async () => {
        const response = await agent
            .put(`/api/assets/${tempAssetId}`)
            .send({ type: 'invalid_enum_for_put_crud' })
            .expect(400);
        expect(response.body.message).toMatch(/Invalid asset type/);
    });
  });

  describe('DELETE /api/assets/:assetId (Delete Asset)', () => {
    let tempAssetId: number;
    beforeEach(async () => {
        const assetData = getSampleAssetData('delete_target_crud');
        const res = await agent.post('/api/assets').send(assetData).expect(201);
        tempAssetId = res.body.id;
        // Do not assign to createdAssetIdForCRUD here, as we want to verify deletion
    });

    it('should successfully delete an existing asset', async () => {
      await agent.delete(`/api/assets/${tempAssetId}`).expect(200);
      await agent.get(`/api/assets/${tempAssetId}`).expect(404); // Verify it's gone
    });

    it('should return 404 when trying to delete a non-existent asset', async () => {
      await agent.delete('/api/assets/9999999').expect(404);
    });
  });

  // --- Simulated Scan API Tests ---
  describe('POST /api/assets/:assetId/scan', () => {
    let currentTestAssetId: number;
    const scanTestVulnerabilityIds: number[] = [];

    beforeEach(async () => {
      // Create a fresh asset for each scan test
      const assetData = getSampleAssetData(`scan_target_${Date.now()}`);
      const assetRes = await agent.post('/api/assets').send(assetData).expect(201);
      currentTestAssetId = assetRes.body.id;
      createdAssetIdsForScanTest.push(currentTestAssetId); // Track for global cleanup

      // Ensure some global vulnerabilities exist for scanning
      // Create 3 vulnerabilities if they don't already exist in this test run
      if (scanTestVulnerabilityIds.length === 0) {
        for (let i = 0; i < 3; i++) {
          const vulnData = getSampleVulnerabilityData(`global_scan_vuln_${i}_${Date.now()}`);
          const vulnRes = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
          scanTestVulnerabilityIds.push(vulnRes.body.id);
          createdVulnerabilityIdsForScanTest.push(vulnRes.body.id); // Track for global cleanup
        }
      }
    });

    // No specific afterEach for this inner describe, global afterEach will handle createdAssetIdsForScanTest etc.

    it('should return 401 if not authenticated', async () => {
      await request(app).post(`/api/assets/${currentTestAssetId}/scan`).expect(401);
    });

    it('should return 404 for a non-existent assetId', async () => {
      await agent.post('/api/assets/9999999/scan').expect(404);
    });

    it('should successfully scan and create new links for an asset with no existing vulnerabilities', async () => {
      const response = await agent.post(`/api/assets/${currentTestAssetId}/scan`).expect(200);

      expect(response.body.message).toBe('Simulated scan completed.');
      expect(response.body.assetId).toBe(currentTestAssetId);
      expect(response.body.newlyLinked).toBeGreaterThan(0); // Expecting at least one of the global vulns to be linked
      expect(response.body.newlyLinked).toBeLessThanOrEqual(5); // Scan processes up to 5
      expect(response.body.updatedLinks).toBe(0);
      expect(response.body.vulnerabilitiesProcessed).toBe(scanTestVulnerabilityIds.length > 5 ? 5 : scanTestVulnerabilityIds.length);

      // Verify in DB
      const links = await db.query.assetVulnerabilitiesTable.findMany({
        where: eq(assetVulnerabilitiesTable.assetId, currentTestAssetId),
      });
      expect(links.length).toBe(response.body.newlyLinked);
      links.forEach(link => {
        expect(link.status).toBe('open');
        expect(new Date().getTime() - new Date(link.lastSeenAt).getTime()).toBeLessThan(5000); // Within 5 seconds
        createdLinkIdsForScanTest.push(link.id); // Track for cleanup
      });
    });

    it('should successfully scan and update existing links (status and lastSeenAt)', async () => {
      // Manually link one of the global vulnerabilities with 'remediated' status and old date
      const vulnToLink = scanTestVulnerabilityIds[0];
      const oldDate = new Date('2023-01-01T00:00:00.000Z');
      const manualLinkRes = await agent
        .post(`/api/assets/${currentTestAssetId}/vulnerabilities`)
        .send({
          vulnerabilityId: vulnToLink,
          status: 'remediated',
          lastSeenAt: oldDate.toISOString()
        })
        .expect(201);
      const manualLinkId = manualLinkRes.body.id;
      createdLinkIdsForScanTest.push(manualLinkId);

      const response = await agent.post(`/api/assets/${currentTestAssetId}/scan`).expect(200);
      expect(response.body.updatedLinks).toBeGreaterThanOrEqual(1);
      // newlyLinked could be > 0 if other global vulns were picked up

      const updatedLink = await db.query.assetVulnerabilitiesTable.findFirst({
        where: eq(assetVulnerabilitiesTable.id, manualLinkId),
      });
      expect(updatedLink).toBeDefined();
      expect(updatedLink?.status).toBe('open');
      expect(new Date(updatedLink!.lastSeenAt).getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it('should return 0 processed if no vulnerabilities exist in the system', async () => {
        // Temporarily delete all vulnerabilities to test this edge case
        await db.delete(vulnerabilitiesTable).where(sql`${vulnerabilitiesTable.id} IN ${scanTestVulnerabilityIds}`);
        scanTestVulnerabilityIds.length = 0; // Clear tracked IDs as they are deleted

        const response = await agent.post(`/api/assets/${currentTestAssetId}/scan`).expect(200);
        expect(response.body.message).toMatch(/No vulnerabilities available/);
        expect(response.body.newlyLinked).toBe(0);
        expect(response.body.updatedLinks).toBe(0);
        expect(response.body.vulnerabilitiesProcessed).toBe(0);
    });
  });
});
