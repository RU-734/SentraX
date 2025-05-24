import { Router, Request, Response } from 'express';
import { db } from '../db';
import { assets as assetsTable, assetTypeEnum } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
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

export default router;
