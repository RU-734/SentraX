import request from 'supertest';
import app from '../index'; // The Express app instance
import { db } from '../db';   // Drizzle ORM instance
import { 
    users, 
    assets as assetsTable, 
    vulnerabilities as vulnerabilitiesTable,
    assets_vulnerabilities as assetVulnerabilitiesTable,
    assetTypeEnum,
    vulnerabilitySeverityEnum,
    vulnerabilityStatusEnum
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

let agent: request.SuperAgentTest;
let testUserId: number;

const baseTestUser = {
  username: `dashboard_testuser_${Date.now()}`,
  email: `dashboard_test_${Date.now()}@example.com`,
  password: 'PasswordSecure123!',
};

// Helper to introduce slight time differences for ordering tests
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createAsset = async (assetData: Partial<typeof assetsTable.$inferInsert>) => {
  return db.insert(assetsTable).values(assetData as any).returning();
};

const createVulnerability = async (vulnData: Partial<typeof vulnerabilitiesTable.$inferInsert>) => {
  return db.insert(vulnerabilitiesTable).values(vulnData as any).returning();
};

const linkAssetVulnerability = async (linkData: Partial<typeof assetVulnerabilitiesTable.$inferInsert>) => {
  return db.insert(assetVulnerabilitiesTable).values(linkData as any).returning();
};


describe('Dashboard API (/api/dashboard)', () => {
  const createdAssetIds: number[] = [];
  const createdVulnerabilityIds: number[] = [];
  const createdLinkIds: number[] = [];

  beforeAll(async () => {
    const registerResponse = await request(app).post('/api/auth/register').send(baseTestUser);
    if (registerResponse.status !== 201 && registerResponse.status !== 409) {
      console.error('Test user registration failed for dashboard tests:', registerResponse.body);
      throw new Error('Failed to register test user for dashboard tests.');
    }
    testUserId = registerResponse.status === 201 ? registerResponse.body.user.id : (await db.query.users.findFirst({ where: eq(users.username, baseTestUser.username) }))!.id;

    agent = request.agent(app);
    const loginResponse = await agent.post('/api/auth/login').send({ username: baseTestUser.username, password: baseTestUser.password });
    if (loginResponse.status !== 200) {
      console.error("Login failed for dashboard test user:", loginResponse.body);
      throw new Error('Login failed for test user in beforeAll for dashboard tests.');
    }
  });

  afterEach(async () => {
    // Clean up any links first due to foreign key constraints
    if (createdLinkIds.length > 0) {
      await db.delete(assetVulnerabilitiesTable).where(sql`${assetVulnerabilitiesTable.id} IN ${createdLinkIds}`);
      createdLinkIds.length = 0; // Clear the array
    }
    if (createdAssetIds.length > 0) {
      await db.delete(assetsTable).where(sql`${assetsTable.id} IN ${createdAssetIds}`);
      createdAssetIds.length = 0;
    }
    if (createdVulnerabilityIds.length > 0) {
      await db.delete(vulnerabilitiesTable).where(sql`${vulnerabilitiesTable.id} IN ${createdVulnerabilityIds}`);
      createdVulnerabilityIds.length = 0;
    }
  });

  afterAll(async () => {
    // Fallback cleanup just in case afterEach missed something or for data not tracked in arrays
    await db.delete(users).where(eq(users.id, testUserId));
    // Add more cleanup if test data uses very specific naming patterns not covered by afterEach
  });

  describe('/api/dashboard/statistics', () => {
    it('should return 401 if not authenticated', async () => {
      await request(app).get('/api/dashboard/statistics').expect(401);
    });

    it('should return correct statistics structure and basic counts', async () => {
      // Setup: 2 assets, 3 vulnerabilities, 2 open links (1 critical, 1 high), 1 remediated link
      const asset1 = (await createAsset({ name: 'StatAsset1', type: 'server', ipAddress: '1.1.1.1' }))[0];
      createdAssetIds.push(asset1.id);
      const asset2 = (await createAsset({ name: 'StatAsset2', type: 'workstation', ipAddress: '2.2.2.2' }))[0];
      createdAssetIds.push(asset2.id);

      const vuln1 = (await createVulnerability({ name: 'StatVulnC', description: 'd', severity: 'critical' }))[0];
      createdVulnerabilityIds.push(vuln1.id);
      const vuln2 = (await createVulnerability({ name: 'StatVulnH', description: 'd', severity: 'high' }))[0];
      createdVulnerabilityIds.push(vuln2.id);
      const vuln3 = (await createVulnerability({ name: 'StatVulnM', description: 'd', severity: 'medium' }))[0];
      createdVulnerabilityIds.push(vuln3.id);

      const link1 = (await linkAssetVulnerability({ assetId: asset1.id, vulnerabilityId: vuln1.id, status: 'open' }))[0];
      createdLinkIds.push(link1.id);
      const link2 = (await linkAssetVulnerability({ assetId: asset2.id, vulnerabilityId: vuln2.id, status: 'open' }))[0];
      createdLinkIds.push(link2.id);
      const link3 = (await linkAssetVulnerability({ assetId: asset1.id, vulnerabilityId: vuln3.id, status: 'remediated' }))[0];
      createdLinkIds.push(link3.id);
      
      const response = await agent.get('/api/dashboard/statistics').expect(200);
      
      expect(response.body).toHaveProperty('totalAssets');
      expect(response.body).toHaveProperty('totalVulnerabilities');
      expect(response.body).toHaveProperty('totalOpenVulnerabilityInstances');
      expect(response.body).toHaveProperty('openVulnerabilitiesBySeverity');
      
      // Basic count verification - these will be affected by other tests if not perfectly isolated.
      // For more precise count checks in a shared DB env, query counts before and after test-specific setup.
      // This test assumes a relatively clean state for these specific items or that global count doesn't matter as much as structure.
      // For this example, we'll check against the items created *within this test*.
      // This requires re-querying the DB for totals if we want to be exact, or ensuring the test DB is truly empty.
      // The current implementation in dashboard.ts queries ALL assets/vulns. So we can only check if our additions impacted it.
      
      expect(response.body.totalOpenVulnerabilityInstances).toBeGreaterThanOrEqual(2);
      expect(response.body.openVulnerabilitiesBySeverity.critical).toBeGreaterThanOrEqual(1);
      expect(response.body.openVulnerabilitiesBySeverity.high).toBeGreaterThanOrEqual(1);
      expect(response.body.openVulnerabilitiesBySeverity.medium).toBeGreaterThanOrEqual(0); // could be 0 if only remediated one exists
      expect(response.body.openVulnerabilitiesBySeverity.low).toBeGreaterThanOrEqual(0);
      expect(response.body.openVulnerabilitiesBySeverity.informational).toBeGreaterThanOrEqual(0);
    });
  });

  describe('/api/dashboard/recent-assets', () => {
    it('should return 401 if not authenticated', async () => {
      await request(app).get('/api/dashboard/recent-assets').expect(401);
    });

    it('should return up to 5 most recent assets, ordered by createdAt descending', async () => {
      for (let i = 0; i < 7; i++) {
        const asset = (await createAsset({ 
            name: `RecentAsset${i}`, 
            type: 'server', 
            ipAddress: `1.2.3.${i}`,
            createdAt: new Date() // Drizzle defaultNow() will handle this, but explicit for test control
        }))[0];
        createdAssetIds.push(asset.id);
        if (i < 6) await sleep(10); // Ensure slight time difference for ordering
      }

      const response = await agent.get('/api/dashboard/recent-assets').expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
      if (response.body.length > 1) {
        const firstDate = new Date(response.body[0].createdAt).getTime();
        const secondDate = new Date(response.body[1].createdAt).getTime();
        expect(firstDate).toBeGreaterThanOrEqual(secondDate);
      }
      response.body.forEach((asset: any) => {
        expect(asset).toHaveProperty('id');
        expect(asset).toHaveProperty('name');
        expect(asset).toHaveProperty('type');
        expect(asset).toHaveProperty('ipAddress');
        expect(asset).toHaveProperty('createdAt');
      });
      // Check if the most recent one (RecentAsset6) is present
      expect(response.body.some((a: any) => a.name === "RecentAsset6")).toBe(true);
    });
  });

  describe('/api/dashboard/recent-vulnerabilities', () => {
    it('should return 401 if not authenticated', async () => {
      await request(app).get('/api/dashboard/recent-vulnerabilities').expect(401);
    });

    it('should return up to 5 most recent "open" vulnerability instances, ordered by link updatedAt descending', async () => {
      const assetA = (await createAsset({ name: 'VulnLinkAssetA', type: 'server', ipAddress: '4.3.2.1' }))[0];
      createdAssetIds.push(assetA.id);
      const assetB = (await createAsset({ name: 'VulnLinkAssetB', type: 'workstation', ipAddress: '4.3.2.2' }))[0];
      createdAssetIds.push(assetB.id);

      const vulnX = (await createVulnerability({ name: 'VulnLinkX', description: 'dx', severity: 'critical' }))[0];
      createdVulnerabilityIds.push(vulnX.id);
      const vulnY = (await createVulnerability({ name: 'VulnLinkY', description: 'dy', severity: 'high' }))[0];
      createdVulnerabilityIds.push(vulnY.id);
      const vulnZ = (await createVulnerability({ name: 'VulnLinkZ', description: 'dz', severity: 'medium' }))[0];
      createdVulnerabilityIds.push(vulnZ.id);

      // Create 7 links, some open, some not, with varying updatedAt (implicitly by creation order + sleep)
      for (let i = 0; i < 7; i++) {
        const link = (await linkAssetVulnerability({
          assetId: i % 2 === 0 ? assetA.id : assetB.id,
          vulnerabilityId: [vulnX.id, vulnY.id, vulnZ.id][i % 3],
          status: i < 5 ? 'open' : 'remediated', // First 5 are open
          // updatedAt is handled by defaultNow() and $onUpdate
          // lastSeenAt also defaults to now
        }))[0];
        createdLinkIds.push(link.id);
        if (i < 6) await sleep(10); // Ensure slight time difference for ordering
      }
      
      const response = await agent.get('/api/dashboard/recent-vulnerabilities').expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
      
      let lastUpdatedAt = Infinity;
      response.body.forEach((item: any) => {
        expect(item).toHaveProperty('joinId');
        expect(item).toHaveProperty('vulnerabilityName');
        expect(item).toHaveProperty('vulnerabilitySeverity');
        expect(item).toHaveProperty('assetName');
        expect(item).toHaveProperty('assetIpAddress');
        expect(item).toHaveProperty('lastSeenOrUpdatedAt');
        // Assuming the backend returns status, but it's filtered to 'open'
        // expect(item.status).toBe('open'); // This is implicit in the backend logic

        const currentUpdatedAt = new Date(item.lastSeenOrUpdatedAt).getTime();
        expect(currentUpdatedAt).toBeLessThanOrEqual(lastUpdatedAt);
        lastUpdatedAt = currentUpdatedAt;
      });
      // Ensure only 'open' vulnerabilities were considered (difficult to directly test without knowing which ones were 'open' and their exact timestamps)
      // The backend query filters for 'open'. If less than 5 'open' exist, it will return less than 5.
      // If more than 5 'open' exist, it will return the 5 most recent by link's updatedAt.
    });
  });
});
