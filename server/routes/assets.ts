import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
    assets as assetsTable,
    assetTypeEnum,
    assets_vulnerabilities as assetVulnerabilitiesTable,
    vulnerabilities as vulnerabilitiesTable, // To check if vulnerability exists
    vulnerabilityStatusEnum
} from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Apply isAuthenticated middleware to all routes in this router
router.use(isAuthenticated);

// POST /api/assets - Create a new asset
router.post('/', async (req: Request, res: Response) => {
  const { name, type, ipAddress, macAddress, operatingSystem, description } = req.body;

  // Basic validation
  if (!name || !type || !ipAddress) {
    return res.status(400).json({ message: 'Name, type, and IP address are required.' });
  }

  // Validate asset type against enum
  if (!Object.values(assetTypeEnum.enumValues).includes(type)) {
    return res.status(400).json({ message: `Invalid asset type. Must be one of: ${assetTypeEnum.enumValues.join(', ')}` });
  }

  try {
    const newAsset = await db
      .insert(assetsTable)
      .values({
        name,
        type,
        ipAddress,
        macAddress,
        operatingSystem,
        description,
        // createdAt and updatedAt are handled by defaultNow() and $onUpdate in schema
      })
      .returning(); // Return all fields of the new asset

    if (newAsset.length === 0) {
        return res.status(500).json({ message: 'Failed to create asset' });
    }
    res.status(201).json(newAsset[0]);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ message: 'Internal server error while creating asset.' });
  }
});


// --- Asset-Vulnerability Link Routes ---
// Base path: /api/assets/:assetId/vulnerabilities

// POST /api/assets/:assetId/vulnerabilities - Link a vulnerability to an asset
router.post('/:assetId/vulnerabilities', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);
  const { vulnerabilityId, status, details, remediationNotes, lastSeenAt } = req.body;

  if (isNaN(assetId)) {
    return res.status(400).json({ message: 'Invalid asset ID format.' });
  }
  if (!vulnerabilityId || isNaN(parseInt(String(vulnerabilityId), 10))) {
    return res.status(400).json({ message: 'Valid vulnerabilityId is required in the body.' });
  }
  const parsedVulnerabilityId = parseInt(String(vulnerabilityId), 10);

  if (status && !Object.values(vulnerabilityStatusEnum.enumValues).includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${vulnerabilityStatusEnum.enumValues.join(', ')}` });
  }

  // Optional: Check if asset and vulnerability exist
  try {
    const assetExists = await db.query.assetsTable.findFirst({ where: eq(assetsTable.id, assetId) });
    if (!assetExists) return res.status(404).json({ message: 'Asset not found.' });

    const vulnerabilityExists = await db.query.vulnerabilitiesTable.findFirst({ where: eq(vulnerabilitiesTable.id, parsedVulnerabilityId) });
    if (!vulnerabilityExists) return res.status(404).json({ message: 'Vulnerability not found.' });

    // Check if link already exists
    const existingLink = await db.query.assetVulnerabilitiesTable.findFirst({
      where: and(
        eq(assetVulnerabilitiesTable.assetId, assetId),
        eq(assetVulnerabilitiesTable.vulnerabilityId, parsedVulnerabilityId)
      ),
    });
    if (existingLink) {
      return res.status(409).json({ message: 'This vulnerability is already linked to this asset.', link: existingLink });
    }

    const newLink = await db
      .insert(assetVulnerabilitiesTable)
      .values({
        assetId,
        vulnerabilityId: parsedVulnerabilityId,
        status: status || vulnerabilityStatusEnum.enumValues[0], // Default to 'open'
        details,
        remediationNotes,
        lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : new Date(),
      })
      .returning();

    if (newLink.length === 0) {
        return res.status(500).json({ message: 'Failed to link vulnerability to asset' });
    }
    res.status(201).json(newLink[0]);
  } catch (error: any) {
    console.error('Error linking vulnerability to asset:', error);
    // The unique constraint 'asset_vulnerability_unique_idx' will also catch duplicates if the above check fails
    if (error.code === '23505' && error.constraint === 'asset_vulnerability_unique_idx') {
        return res.status(409).json({ message: 'This vulnerability is already linked to this asset (DB constraint).' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/assets/:assetId/vulnerabilities - List vulnerabilities for a specific asset
router.get('/:assetId/vulnerabilities', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);
  if (isNaN(assetId)) {
    return res.status(400).json({ message: 'Invalid asset ID format.' });
  }

  try {
    const assetExists = await db.query.assetsTable.findFirst({ where: eq(assetsTable.id, assetId) });
    if (!assetExists) return res.status(404).json({ message: 'Asset not found.' });

    const linkedVulnerabilities = await db
      .select()
      .from(assetVulnerabilitiesTable)
      .leftJoin(vulnerabilitiesTable, eq(assetVulnerabilitiesTable.vulnerabilityId, vulnerabilitiesTable.id))
      .where(eq(assetVulnerabilitiesTable.assetId, assetId))
      .orderBy(desc(assetVulnerabilitiesTable.lastSeenAt));

    // Format the response to be more useful, e.g., nesting vulnerability details
    const result = linkedVulnerabilities.map(link => ({
        joinId: link.assets_vulnerabilities.id,
        assetId: link.assets_vulnerabilities.assetId,
        status: link.assets_vulnerabilities.status,
        details: link.assets_vulnerabilities.details,
        remediationNotes: link.assets_vulnerabilities.remediationNotes,
        lastSeenAt: link.assets_vulnerabilities.lastSeenAt,
        updatedAt: link.assets_vulnerabilities.updatedAt,
        vulnerability: link.vulnerabilities // This will be the full vulnerability object or null if not found (though FK should prevent null)
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching linked vulnerabilities:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/assets/:assetId/vulnerabilities/:joinId - Update a specific asset-vulnerability link
router.put('/:assetId/vulnerabilities/:joinId', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);
  const joinId = parseInt(req.params.joinId, 10);

  if (isNaN(assetId) || isNaN(joinId)) {
    return res.status(400).json({ message: 'Invalid asset ID or join ID format.' });
  }

  const { status, details, remediationNotes, lastSeenAt } = req.body;

  if (status && !Object.values(vulnerabilityStatusEnum.enumValues).includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${vulnerabilityStatusEnum.enumValues.join(', ')}` });
  }

  const updateData: Partial<typeof assetVulnerabilitiesTable.$inferInsert> = {};
  if (status !== undefined) updateData.status = status;
  if (details !== undefined) updateData.details = details;
  if (remediationNotes !== undefined) updateData.remediationNotes = remediationNotes;
  if (lastSeenAt !== undefined) updateData.lastSeenAt = new Date(lastSeenAt);
  // updatedAt is handled by $onUpdate

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }

  try {
    const updatedLinks = await db
      .update(assetVulnerabilitiesTable)
      .set(updateData)
      .where(and(eq(assetVulnerabilitiesTable.id, joinId), eq(assetVulnerabilitiesTable.assetId, assetId))) // Ensure it's for the correct asset
      .returning();

    if (updatedLinks.length === 0) {
      return res.status(404).json({ message: 'Asset-vulnerability link not found or no changes made.' });
    }
    res.status(200).json(updatedLinks[0]);
  } catch (error) {
    console.error('Error updating asset-vulnerability link:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/assets/:assetId/vulnerabilities/:joinId - Unlink a vulnerability from an asset
router.delete('/:assetId/vulnerabilities/:joinId', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);
  const joinId = parseInt(req.params.joinId, 10);

  if (isNaN(assetId) || isNaN(joinId)) {
    return res.status(400).json({ message: 'Invalid asset ID or join ID format.' });
  }

  try {
    const deletedLinks = await db
      .delete(assetVulnerabilitiesTable)
      .where(and(eq(assetVulnerabilitiesTable.id, joinId), eq(assetVulnerabilitiesTable.assetId, assetId)))
      .returning({ id: assetVulnerabilitiesTable.id });

    if (deletedLinks.length === 0) {
      return res.status(404).json({ message: 'Asset-vulnerability link not found.' });
    }
    res.status(200).json({ message: 'Vulnerability unlinked from asset successfully.', linkId: deletedLinks[0].id });
  } catch (error) {
    console.error('Error unlinking vulnerability from asset:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/assets - List all assets
router.get('/', async (req: Request, res: Response) => {
  try {
    const allAssets = await db.query.assetsTable.findMany({
      orderBy: [desc(assetsTable.createdAt)], // Optional: order by creation date
    });
    res.status(200).json(allAssets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ message: 'Internal server error while fetching assets.' });
  }
});

// GET /api/assets/:assetId - Retrieve a single asset by ID
router.get('/:assetId', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);

  if (isNaN(assetId)) {
    return res.status(400).json({ message: 'Invalid asset ID format.' });
  }

  try {
    const asset = await db.query.assetsTable.findFirst({
      where: eq(assetsTable.id, assetId),
    });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    res.status(200).json(asset);
  } catch (error) {
    console.error('Error fetching asset by ID:', error);
    res.status(500).json({ message: 'Internal server error while fetching asset.' });
  }
});

// PUT /api/assets/:assetId - Update an existing asset
router.put('/:assetId', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);

  if (isNaN(assetId)) {
    return res.status(400).json({ message: 'Invalid asset ID format.' });
  }

  const { name, type, ipAddress, macAddress, operatingSystem, description } = req.body;

  // Validate type if provided
  if (type && !Object.values(assetTypeEnum.enumValues).includes(type)) {
    return res.status(400).json({ message: `Invalid asset type. Must be one of: ${assetTypeEnum.enumValues.join(', ')}` });
  }

  // Construct object with fields to update, only including those provided
  const updateData: Partial<typeof assetsTable.$inferInsert> = {};
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
  if (macAddress !== undefined) updateData.macAddress = macAddress;
  if (operatingSystem !== undefined) updateData.operatingSystem = operatingSystem;
  if (description !== undefined) updateData.description = description;
  // updatedAt is handled by $onUpdate in schema

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }

  try {
    const updatedAssets = await db
      .update(assetsTable)
      .set(updateData)
      .where(eq(assetsTable.id, assetId))
      .returning();

    if (updatedAssets.length === 0) {
      return res.status(404).json({ message: 'Asset not found or no changes made.' });
    }
    res.status(200).json(updatedAssets[0]);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ message: 'Internal server error while updating asset.' });
  }
});

// DELETE /api/assets/:assetId - Delete an asset
router.delete('/:assetId', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);

  if (isNaN(assetId)) {
    return res.status(400).json({ message: 'Invalid asset ID format.' });
  }

  try {
    const deletedAssets = await db
      .delete(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .returning({ id: assetsTable.id }); // Return id of deleted asset

    if (deletedAssets.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    res.status(200).json({ message: 'Asset deleted successfully.', assetId: deletedAssets[0].id });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ message: 'Internal server error while deleting asset.' });
  }
});

// POST /api/assets/:assetId/scan - Simulate a vulnerability scan on an asset
router.post('/:assetId/scan', async (req: Request, res: Response) => {
  const assetId = parseInt(req.params.assetId, 10);

  if (isNaN(assetId)) {
    return res.status(400).json({ message: 'Invalid asset ID format.' });
  }

  try {
    // Verify asset existence
    const asset = await db.query.assetsTable.findFirst({
      where: eq(assetsTable.id, assetId),
    });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    // Vulnerability Selection Logic: Fetch the first 5 vulnerabilities by ID.
    // A more sophisticated scan might use random selection or specific criteria.
    const vulnerabilitiesToScan = await db.query.vulnerabilitiesTable.findMany({
      orderBy: [desc(vulnerabilitiesTable.id)], // Taking latest by ID for some variation
      limit: 5,
    });

    if (vulnerabilitiesToScan.length === 0) {
      return res.status(200).json({
        message: 'Simulated scan completed. No vulnerabilities available in the system to scan for.',
        assetId: assetId,
        newlyLinked: 0,
        updatedLinks: 0,
        vulnerabilitiesProcessed: 0,
      });
    }

    let newlyLinked = 0;
    let updatedLinks = 0;

    for (const vuln of vulnerabilitiesToScan) {
      const existingLink = await db.query.assetVulnerabilitiesTable.findFirst({
        where: and(
          eq(assetVulnerabilitiesTable.assetId, assetId),
          eq(assetVulnerabilitiesTable.vulnerabilityId, vuln.id)
        ),
      });

      if (existingLink) {
        // Link exists, update it
        const updates: Partial<typeof assetVulnerabilitiesTable.$inferInsert> = {
          lastSeenAt: new Date(),
        };
        if (existingLink.status !== 'open') {
          updates.status = 'open';
        }
        await db.update(assetVulnerabilitiesTable)
          .set(updates)
          .where(eq(assetVulnerabilitiesTable.id, existingLink.id));
        updatedLinks++;
      } else {
        // No link exists, create a new one
        await db.insert(assetVulnerabilitiesTable).values({
          assetId: assetId,
          vulnerabilityId: vuln.id,
          status: 'open',
          lastSeenAt: new Date(),
          // details and remediationNotes can be null or set to default if needed
        });
        newlyLinked++;
      }
    }

    res.status(200).json({
      message: 'Simulated scan completed.',
      assetId: assetId,
      newlyLinked: newlyLinked,
      updatedLinks: updatedLinks,
      vulnerabilitiesProcessed: vulnerabilitiesToScan.length,
    });

  } catch (error) {
    console.error(`Error during simulated scan for asset ${assetId}:`, error);
    res.status(500).json({ message: 'Internal server error during simulated scan.' });
  }
});


export default router;
