import request from 'supertest';
import app from '../index'; // The Express app instance
import { db } from '../db';   // Drizzle ORM instance
import {
    users,
    assets as assetsTable,
    vulnerabilities as vulnerabilitiesTable,
    assets_vulnerabilities as assetVulnerabilitiesTable,
    vulnerabilitySeverityEnum,
    vulnerabilityStatusEnum
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

let agent: request.SuperAgentTest;
let testUserId: number;

const baseTestUser = {
  username: `vuln_testuser_${Date.now()}`,
  email: `vuln_test_${Date.now()}@example.com`,
  password: 'PasswordSecure123!',
};

const getSampleVulnerabilityData = (suffix: string | number = Date.now()) => ({
  name: `Test Vuln ${suffix}`,
  description: `Description for test vuln ${suffix}`,
  severity: vulnerabilitySeverityEnum.enumValues[2], // 'medium'
  cvssScore: '7.5',
  references: [`http://example.com/vuln/${suffix}`],
});

const getSampleAssetData = (suffix: string | number = Date.now()) => ({
  name: `Link Test Asset ${suffix}`,
  type: 'server' as const,
  ipAddress: `192.168.2.${Math.floor(Math.random() * 254) + 1}`,
});

describe('Vulnerability and Asset-Vulnerability Link APIs', () => {
  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(baseTestUser);

    if (registerResponse.status !== 201 && registerResponse.status !== 409) { // Allow 409 if user exists
        console.error('Test user registration failed with status:', registerResponse.status, registerResponse.body);
        throw new Error('Failed to register test user for vulnerability tests.');
    }

    // If user already exists (409), we can still try to login
    // If new user (201), use its ID. Otherwise, try to fetch existing.
    if (registerResponse.status === 201) {
        testUserId = registerResponse.body.user.id;
    } else {
        // Attempt to query the user if it already existed to get ID
        const existingUser = await db.query.users.findFirst({ where: eq(users.username, baseTestUser.username) });
        if (!existingUser) throw new Error('Failed to get test user ID after registration attempt.');
        testUserId = existingUser.id;
    }

    agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({ username: baseTestUser.username, password: baseTestUser.password });

    if (loginResponse.status !== 200) {
        console.error("Login response body:", loginResponse.body);
        throw new Error('Login failed for test user in beforeAll for vulnerability tests.');
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await db.delete(vulnerabilitiesTable).where(sql`${vulnerabilitiesTable.name} like 'Test Vuln %'`);
      await db.delete(assetsTable).where(sql`${assetsTable.name} like 'Link Test Asset %'`);
      // Asset-vulnerability links should be cleaned by cascade delete or specific cleanup if needed
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.error('Error during afterAll cleanup in vulnerability tests:', error);
    }
  });

  // Store IDs of created items for cleanup or use in subsequent tests within a describe block
  let createdVulnerabilityId: number | null = null;
  let createdAssetIdForLinkTest: number | null = null;

  // Part 1: Vulnerability CRUD Tests
  describe('/api/vulnerabilities', () => {
    afterEach(async () => {
      if (createdVulnerabilityId) {
        try {
          await db.delete(vulnerabilitiesTable).where(eq(vulnerabilitiesTable.id, createdVulnerabilityId));
        } catch (error) {/* ignore */}
        createdVulnerabilityId = null;
      }
    });

    describe('Authentication Checks', () => {
        const endpoints = [
            { method: 'post', path: '/api/vulnerabilities', data: {} },
            { method: 'get', path: '/api/vulnerabilities', data: undefined },
            { method: 'get', path: '/api/vulnerabilities/1', data: undefined },
            { method: 'put', path: '/api/vulnerabilities/1', data: {} },
            { method: 'delete', path: '/api/vulnerabilities/1', data: undefined },
        ];
        endpoints.forEach(ep => {
            it(`should return 401 for ${ep.method.toUpperCase()} ${ep.path} if not authenticated`, async () => {
                 // @ts-ignore
                await request(app)[ep.method](ep.path).send(ep.data).expect(401);
            });
        });
    });

    describe('POST / (Create Vulnerability)', () => {
      it('should create a new vulnerability successfully', async () => {
        const vulnData = getSampleVulnerabilityData('create_success');
        const response = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
        expect(response.body.id).toBeDefined();
        createdVulnerabilityId = response.body.id;
        expect(response.body.name).toBe(vulnData.name);
        expect(response.body.severity).toBe(vulnData.severity);
      });

      it('should fail with missing required fields (name)', async () => {
        const { name, ...data } = getSampleVulnerabilityData('missing_name');
        await agent.post('/api/vulnerabilities').send(data).expect(400, /Name, description, and severity are required/);
      });

      it('should fail with invalid severity enum', async () => {
        const data = { ...getSampleVulnerabilityData('invalid_sev'), severity: 'super_critical' };
        await agent.post('/api/vulnerabilities').send(data).expect(400, /Invalid severity/);
      });

      it('should fail to create with a duplicate name', async () => {
        const vulnData = getSampleVulnerabilityData('duplicate_name_test');
        const firstRes = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
        createdVulnerabilityId = firstRes.body.id; // Ensure it's cleaned up

        await agent.post('/api/vulnerabilities').send(vulnData).expect(409, /Vulnerability with this name already exists/);
      });
    });

    describe('GET / (List Vulnerabilities)', () => {
      it('should retrieve all vulnerabilities', async () => {
        const vulnData = getSampleVulnerabilityData('list_test');
        const createRes = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
        createdVulnerabilityId = createRes.body.id;

        const response = await agent.get('/api/vulnerabilities').expect(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.some(v => v.id === createdVulnerabilityId)).toBe(true);
      });
    });

    describe('GET /:vulnerabilityId (Retrieve Vulnerability)', () => {
        it('should retrieve an existing vulnerability', async () => {
            const vulnData = getSampleVulnerabilityData('get_one');
            const createRes = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
            createdVulnerabilityId = createRes.body.id;

            const response = await agent.get(`/api/vulnerabilities/${createdVulnerabilityId}`).expect(200);
            expect(response.body.id).toBe(createdVulnerabilityId);
            expect(response.body.name).toBe(vulnData.name);
        });
        it('should return 404 for non-existent vulnerability', async () => {
            await agent.get('/api/vulnerabilities/999999').expect(404);
        });
    });

    describe('PUT /:vulnerabilityId (Update Vulnerability)', () => {
        beforeEach(async () => { // Create a vuln before each PUT test
            const vulnData = getSampleVulnerabilityData('update_target');
            const res = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
            createdVulnerabilityId = res.body.id;
        });

        it('should successfully update an existing vulnerability', async () => {
            const updatePayload = { name: 'Updated Vuln Name', severity: vulnerabilitySeverityEnum.enumValues[0] }; // critical
            const response = await agent.put(`/api/vulnerabilities/${createdVulnerabilityId}`).send(updatePayload).expect(200);
            expect(response.body.name).toBe(updatePayload.name);
            expect(response.body.severity).toBe(updatePayload.severity);
        });
        it('should return 404 for updating non-existent vulnerability', async () => {
            await agent.put('/api/vulnerabilities/999999').send({ name: 'No Such Vuln' }).expect(404);
        });
        it('should fail to update with invalid severity', async () => {
            await agent.put(`/api/vulnerabilities/${createdVulnerabilityId}`).send({ severity: 'super_duper_critical' }).expect(400, /Invalid severity/);
        });
        it('should fail to update name to an existing one', async () => {
            const vulnData1 = getSampleVulnerabilityData('unique_name1_put');
            const res1 = await agent.post('/api/vulnerabilities').send(vulnData1).expect(201);
            // res1.body.id will be cleaned by afterEach if createdVulnerabilityId is overwritten,
            // so we need another way or ensure afterAll cleans it.
            // For simplicity, let's make its name part of the afterAll cleanup pattern.

            const vulnData2 = getSampleVulnerabilityData('unique_name2_put');
            const res2 = await agent.post('/api/vulnerabilities').send(vulnData2).expect(201);
            // createdVulnerabilityId is now res2.body.id
            createdVulnerabilityId = res2.body.id; // This one will be cleaned by afterEach

            await agent.put(`/api/vulnerabilities/${createdVulnerabilityId}`).send({ name: vulnData1.name }).expect(409, /Another vulnerability with this name already exists/);
            // Manually clean res1.body.id as afterEach only cleans createdVulnerabilityId
            await db.delete(vulnerabilitiesTable).where(eq(vulnerabilitiesTable.id, res1.body.id));
        });
    });

    describe('DELETE /:vulnerabilityId (Delete Vulnerability)', () => {
        beforeEach(async () => {
            const vulnData = getSampleVulnerabilityData('delete_target');
            const res = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
            createdVulnerabilityId = res.body.id;
        });
        it('should successfully delete an existing vulnerability', async () => {
            await agent.delete(`/api/vulnerabilities/${createdVulnerabilityId}`).expect(200);
            await agent.get(`/api/vulnerabilities/${createdVulnerabilityId}`).expect(404); // Verify it's gone
            createdVulnerabilityId = null; // It's deleted, so no cleanup needed in afterEach for this ID
        });
        it('should return 404 for deleting non-existent vulnerability', async () => {
            await agent.delete('/api/vulnerabilities/999999').expect(404);
        });
    });
  });


  // Part 2: Asset-Vulnerability Link Tests
  describe('/api/assets/:assetId/vulnerabilities', () => {
    let testAssetId: number;
    let testVulnerabilityId: number;
    let testJoinId: number | null = null;

    beforeEach(async () => {
      // Create a test asset
      const assetData = getSampleAssetData('link_asset');
      const assetRes = await agent.post('/api/assets').send(assetData).expect(201);
      testAssetId = assetRes.body.id;
      createdAssetIdForLinkTest = testAssetId; // For potential global cleanup if needed

      // Create a test vulnerability
      const vulnData = getSampleVulnerabilityData('link_vuln');
      const vulnRes = await agent.post('/api/vulnerabilities').send(vulnData).expect(201);
      testVulnerabilityId = vulnRes.body.id;
      // createdVulnerabilityId will be set by this, also for potential global cleanup
    });

    afterEach(async () => {
      // Clean up the specific asset-vulnerability link if one was created and its ID stored
      if (testJoinId) {
        try {
          await db.delete(assetVulnerabilitiesTable).where(eq(assetVulnerabilitiesTable.id, testJoinId));
        } catch(e) {/* ignore */}
        testJoinId = null;
      }
      // Clean up the asset and vulnerability created for this block
      if (testAssetId) await db.delete(assetsTable).where(eq(assetsTable.id, testAssetId));
      if (testVulnerabilityId) await db.delete(vulnerabilitiesTable).where(eq(vulnerabilitiesTable.id, testVulnerabilityId));
      createdAssetIdForLinkTest = null;
    });

    // Note: Auth checks for these nested routes are implicitly covered by the main asset router's auth middleware.
    // Explicitly testing them again here for each sub-route is redundant if the router-level middleware is trusted.

    describe('POST / (Link Vulnerability to Asset)', () => {
      it('should successfully link a vulnerability to an asset', async () => {
        const response = await agent
          .post(`/api/assets/${testAssetId}/vulnerabilities`)
          .send({ vulnerabilityId: testVulnerabilityId, status: vulnerabilityStatusEnum.enumValues[0] }) // 'open'
          .expect(201);
        expect(response.body.id).toBeDefined();
        testJoinId = response.body.id; // For cleanup
        expect(response.body.assetId).toBe(testAssetId);
        expect(response.body.vulnerabilityId).toBe(testVulnerabilityId);
        expect(response.body.status).toBe('open');
      });

      it('should fail to link a non-existent vulnerability', async () => {
        await agent
          .post(`/api/assets/${testAssetId}/vulnerabilities`)
          .send({ vulnerabilityId: 999999 })
          .expect(404, /Vulnerability not found/);
      });

      it('should fail to link to a non-existent asset', async () => {
        await agent
          .post(`/api/assets/999999/vulnerabilities`)
          .send({ vulnerabilityId: testVulnerabilityId })
          .expect(404, /Asset not found/);
      });

      it('should fail to create a duplicate link', async () => {
        await agent.post(`/api/assets/${testAssetId}/vulnerabilities`).send({ vulnerabilityId: testVulnerabilityId }).expect(201);
        await agent.post(`/api/assets/${testAssetId}/vulnerabilities`).send({ vulnerabilityId: testVulnerabilityId }).expect(409, /already linked/);
      });

      it('should successfully link with optional fields (details, lastSeenAt)', async () => {
          const linkDetails = {
              vulnerabilityId: testVulnerabilityId,
              status: 'remediated' as const,
              details: 'Specific details for this link.',
              remediationNotes: 'Patched on server X.',
              lastSeenAt: new Date().toISOString()
          };
          const response = await agent
            .post(`/api/assets/${testAssetId}/vulnerabilities`)
            .send(linkDetails)
            .expect(201);
          testJoinId = response.body.id;
          expect(response.body.details).toBe(linkDetails.details);
          expect(response.body.status).toBe(linkDetails.status);
      });
    });

    describe('GET / (List Vulnerabilities for an Asset)', () => {
        it('should retrieve linked vulnerabilities for an asset', async () => {
            await agent.post(`/api/assets/${testAssetId}/vulnerabilities`).send({ vulnerabilityId: testVulnerabilityId }).expect(201);
            const response = await agent.get(`/api/assets/${testAssetId}/vulnerabilities`).expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].vulnerability.id).toBe(testVulnerabilityId);
        });
        it('should return an empty array for an asset with no linked vulnerabilities', async () => {
            const response = await agent.get(`/api/assets/${testAssetId}/vulnerabilities`).expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });
    });

    describe('PUT /:joinId (Update Asset-Vulnerability Link)', () => {
        beforeEach(async () => { // Create a link before each PUT test for this sub-describe
            const res = await agent.post(`/api/assets/${testAssetId}/vulnerabilities`).send({ vulnerabilityId: testVulnerabilityId }).expect(201);
            testJoinId = res.body.id;
        });
        it('should successfully update the status of a link', async () => {
            const newStatus = vulnerabilityStatusEnum.enumValues[1]; // 'remediated'
            const response = await agent
                .put(`/api/assets/${testAssetId}/vulnerabilities/${testJoinId}`)
                .send({ status: newStatus })
                .expect(200);
            expect(response.body.status).toBe(newStatus);
        });
        it('should fail to update a non-existent link', async () => {
            await agent.put(`/api/assets/${testAssetId}/vulnerabilities/999999`).send({ status: 'open' }).expect(404);
        });
        it('should fail with an invalid status enum', async () => {
            await agent.put(`/api/assets/${testAssetId}/vulnerabilities/${testJoinId}`).send({ status: 'invalid_status_enum' }).expect(400, /Invalid status/);
        });
    });

    describe('DELETE /:joinId (Unlink Vulnerability from Asset)', () => {
        beforeEach(async () => {
            const res = await agent.post(`/api/assets/${testAssetId}/vulnerabilities`).send({ vulnerabilityId: testVulnerabilityId }).expect(201);
            testJoinId = res.body.id;
        });
        it('should successfully unlink a vulnerability', async () => {
            await agent.delete(`/api/assets/${testAssetId}/vulnerabilities/${testJoinId}`).expect(200);
            const response = await agent.get(`/api/assets/${testAssetId}/vulnerabilities`).expect(200);
            expect(response.body.length).toBe(0); // Verify it's gone from the list
        });
        it('should return 404 for unlinking a non-existent link', async () => {
            await agent.delete(`/api/assets/${testAssetId}/vulnerabilities/999999`).expect(404);
        });
    });
  });
});
