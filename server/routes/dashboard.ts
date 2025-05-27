import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
    assets as assetsTable, 
    vulnerabilities as vulnerabilitiesTable,
    assets_vulnerabilities as assetVulnerabilitiesTable,
    vulnerabilitySeverityEnum
} from '@shared/schema';
import { count, eq, desc } from 'drizzle-orm'; // Added desc
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Apply isAuthenticated middleware to all routes in this router
router.use(isAuthenticated);

router.get('/statistics', async (req: Request, res: Response) => {
  try {
    // 1. Total number of assets
    const totalAssetsResult = await db.select({ value: count() }).from(assetsTable);
    const totalAssets = totalAssetsResult[0]?.value || 0;

    // 2. Total number of unique vulnerabilities
    const totalVulnerabilitiesResult = await db.select({ value: count() }).from(vulnerabilitiesTable);
    const totalVulnerabilities = totalVulnerabilitiesResult[0]?.value || 0;

    // 3. Total number of 'open' vulnerability instances
    const totalOpenInstancesResult = await db
      .select({ value: count() })
      .from(assetVulnerabilitiesTable)
      .where(eq(assetVulnerabilitiesTable.status, 'open'));
    const totalOpenVulnerabilityInstances = totalOpenInstancesResult[0]?.value || 0;

    // 4. Counts of 'open' vulnerability instances grouped by severity
    const openBySeverityResult = await db
      .select({
        severity: vulnerabilitiesTable.severity,
        count: count(vulnerabilitiesTable.severity), // Count occurrences of each severity
      })
      .from(assetVulnerabilitiesTable)
      .leftJoin(vulnerabilitiesTable, eq(assetVulnerabilitiesTable.vulnerabilityId, vulnerabilitiesTable.id))
      .where(eq(assetVulnerabilitiesTable.status, 'open'))
      .groupBy(vulnerabilitiesTable.severity);

    // Initialize all severity counts to 0
    const openVulnerabilitiesBySeverity = vulnerabilitySeverityEnum.enumValues.reduce((acc, severityValue) => {
        acc[severityValue] = 0;
        return acc;
    }, {} as Record<typeof vulnerabilitySeverityEnum.enumValues[number], number>);
    
    // Populate counts from the query result
    openBySeverityResult.forEach(row => {
      if (row.severity) { // Check if severity is not null (it shouldn't be based on schema)
        openVulnerabilitiesBySeverity[row.severity] = Number(row.count); // Drizzle count returns BigInt or string sometimes
      }
    });

    res.status(200).json({
      totalAssets,
      totalVulnerabilities,
      totalOpenVulnerabilityInstances,
      openVulnerabilitiesBySeverity,
    });

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ message: 'Internal server error while fetching dashboard statistics.' });
  }
});

// GET /api/dashboard/recent-vulnerabilities - Fetch 5 most recently active 'open' vulnerability instances
router.get('/recent-vulnerabilities', async (req: Request, res: Response) => {
  try {
    const recentVulnerabilityInstances = await db
      .select({
        joinId: assetVulnerabilitiesTable.id,
        vulnerabilityName: vulnerabilitiesTable.name,
        vulnerabilitySeverity: vulnerabilitiesTable.severity,
        vulnerabilitySource: vulnerabilitiesTable.source, // Added source field
        assetName: assetsTable.name,
        assetIpAddress: assetsTable.ipAddress,
        lastSeenOrUpdatedAt: assetVulnerabilitiesTable.updatedAt, // Using updatedAt from the join table
      })
      .from(assetVulnerabilitiesTable)
      .leftJoin(vulnerabilitiesTable, eq(assetVulnerabilitiesTable.vulnerabilityId, vulnerabilitiesTable.id))
      .leftJoin(assetsTable, eq(assetVulnerabilitiesTable.assetId, assetsTable.id))
      .where(eq(assetVulnerabilitiesTable.status, 'open'))
      .orderBy(desc(assetVulnerabilitiesTable.updatedAt))
      .limit(5);

    // Ensure that if a vulnerability or asset was somehow deleted but the link record still exists (should not happen with FKs),
    // we don't return nulls for their direct properties. The leftJoin handles this by returning null for those fields.
    // The query selects direct fields, so if the join fails to find a match, those fields would be null.
    // Filter out results where essential joined data might be missing if necessary, although FK constraints should prevent this.
    const result = recentVulnerabilityInstances.filter(
        item => item.vulnerabilityName && item.assetName 
    );


    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching recent vulnerability instances:', error);
    res.status(500).json({ message: 'Internal server error while fetching recent vulnerability instances.' });
  }
});

// GET /api/dashboard/recent-assets - Fetch 5 most recently added assets
router.get('/recent-assets', async (req: Request, res: Response) => {
  try {
    const recentAssets = await db
      .select({
        id: assetsTable.id,
        name: assetsTable.name,
        type: assetsTable.type,
        ipAddress: assetsTable.ipAddress,
        createdAt: assetsTable.createdAt,
      })
      .from(assetsTable)
      .orderBy(desc(assetsTable.createdAt))
      .limit(5);

    res.status(200).json(recentAssets);
  } catch (error) {
    console.error('Error fetching recent assets:', error);
    res.status(500).json({ message: 'Internal server error while fetching recent assets.' });
  }
});

export default router;
