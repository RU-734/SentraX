import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
    vulnerabilities as vulnerabilitiesTable,
    vulnerabilitySeverityEnum
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Apply isAuthenticated middleware to all routes in this router
router.use(isAuthenticated);

// POST /api/vulnerabilities - Create a new vulnerability
router.post('/', async (req: Request, res: Response) => {
  const { name, description, severity, cvssScore, references } = req.body;

  // Basic validation
  if (!name || !description || !severity) {
    return res.status(400).json({ message: 'Name, description, and severity are required.' });
  }

  // Validate severity against enum
  if (!Object.values(vulnerabilitySeverityEnum.enumValues).includes(severity)) {
    return res.status(400).json({ message: `Invalid severity. Must be one of: ${vulnerabilitySeverityEnum.enumValues.join(', ')}` });
  }

  // Validate CVSS score format if provided (e.g., must be a number between 0.0 and 10.0)
  // For simplicity, we're using text in schema, but in a real app, more parsing/validation needed.
  // If cvssScore is provided, it should be a string representing a number for the decimal(3,1) type.
  if (cvssScore !== undefined && cvssScore !== null) {
    const score = parseFloat(cvssScore);
    if (isNaN(score) || score < 0.0 || score > 10.0) {
        return res.status(400).json({ message: 'Invalid CVSS score. Must be a number between 0.0 and 10.0.'});
    }
  }


  try {
    const newVulnerability = await db
      .insert(vulnerabilitiesTable)
      .values({
        name,
        description,
        severity,
        cvssScore: cvssScore ? String(cvssScore) : null, // Ensure it's a string or null
        references, // Array of strings
      })
      .returning();

    if (newVulnerability.length === 0) {
        return res.status(500).json({ message: 'Failed to create vulnerability' });
    }
    res.status(201).json(newVulnerability[0]);
  } catch (error: any) {
    console.error('Error creating vulnerability:', error);
    // Check for unique constraint error (e.g., duplicate name)
    if (error.code === '23505' && error.constraint === 'vulnerabilities_name_unique') { // Check constraint name
        return res.status(409).json({ message: 'Vulnerability with this name already exists.' });
    }
    res.status(500).json({ message: 'Internal server error while creating vulnerability.' });
  }
});

// GET /api/vulnerabilities - List all vulnerabilities
router.get('/', async (req: Request, res: Response) => {
  try {
    const allVulnerabilities = await db.query.vulnerabilitiesTable.findMany({
      orderBy: [desc(vulnerabilitiesTable.severity), desc(vulnerabilitiesTable.createdAt)], // Example ordering
    });
    res.status(200).json(allVulnerabilities);
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    res.status(500).json({ message: 'Internal server error while fetching vulnerabilities.' });
  }
});

// GET /api/vulnerabilities/:vulnerabilityId - Retrieve a single vulnerability by ID
router.get('/:vulnerabilityId', async (req: Request, res: Response) => {
  const vulnerabilityId = parseInt(req.params.vulnerabilityId, 10);

  if (isNaN(vulnerabilityId)) {
    return res.status(400).json({ message: 'Invalid vulnerability ID format.' });
  }

  try {
    const vulnerability = await db.query.vulnerabilitiesTable.findFirst({
      where: eq(vulnerabilitiesTable.id, vulnerabilityId),
    });

    if (!vulnerability) {
      return res.status(404).json({ message: 'Vulnerability not found.' });
    }
    res.status(200).json(vulnerability);
  } catch (error) {
    console.error('Error fetching vulnerability by ID:', error);
    res.status(500).json({ message: 'Internal server error while fetching vulnerability.' });
  }
});

// PUT /api/vulnerabilities/:vulnerabilityId - Update an existing vulnerability
router.put('/:vulnerabilityId', async (req: Request, res: Response) => {
  const vulnerabilityId = parseInt(req.params.vulnerabilityId, 10);

  if (isNaN(vulnerabilityId)) {
    return res.status(400).json({ message: 'Invalid vulnerability ID format.' });
  }

  const { name, description, severity, cvssScore, references } = req.body;

  // Validate severity if provided
  if (severity && !Object.values(vulnerabilitySeverityEnum.enumValues).includes(severity)) {
    return res.status(400).json({ message: `Invalid severity. Must be one of: ${vulnerabilitySeverityEnum.enumValues.join(', ')}` });
  }

  if (cvssScore !== undefined && cvssScore !== null) {
    const score = parseFloat(cvssScore);
    if (isNaN(score) || score < 0.0 || score > 10.0) {
        return res.status(400).json({ message: 'Invalid CVSS score. Must be a number between 0.0 and 10.0.'});
    }
  }

  const updateData: Partial<typeof vulnerabilitiesTable.$inferInsert> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (severity !== undefined) updateData.severity = severity;
  if (cvssScore !== undefined) updateData.cvssScore = cvssScore ? String(cvssScore) : null;
  if (references !== undefined) updateData.references = references;
  // updatedAt is handled by $onUpdate in schema

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }

  try {
    const updatedVulnerabilities = await db
      .update(vulnerabilitiesTable)
      .set(updateData)
      .where(eq(vulnerabilitiesTable.id, vulnerabilityId))
      .returning();

    if (updatedVulnerabilities.length === 0) {
      return res.status(404).json({ message: 'Vulnerability not found or no changes made.' });
    }
    res.status(200).json(updatedVulnerabilities[0]);
  } catch (error: any) {
    console.error('Error updating vulnerability:', error);
     if (error.code === '23505' && error.constraint === 'vulnerabilities_name_unique') {
        return res.status(409).json({ message: 'Another vulnerability with this name already exists.' });
    }
    res.status(500).json({ message: 'Internal server error while updating vulnerability.' });
  }
});

// DELETE /api/vulnerabilities/:vulnerabilityId - Delete a vulnerability
router.delete('/:vulnerabilityId', async (req: Request, res: Response) => {
  const vulnerabilityId = parseInt(req.params.vulnerabilityId, 10);

  if (isNaN(vulnerabilityId)) {
    return res.status(400).json({ message: 'Invalid vulnerability ID format.' });
  }

  try {
    const deletedVulnerabilities = await db
      .delete(vulnerabilitiesTable)
      .where(eq(vulnerabilitiesTable.id, vulnerabilityId))
      .returning({ id: vulnerabilitiesTable.id });

    if (deletedVulnerabilities.length === 0) {
      return res.status(404).json({ message: 'Vulnerability not found.' });
    }
    // Cascade delete on assets_vulnerabilities is handled by the DB schema
    res.status(200).json({ message: 'Vulnerability deleted successfully.', vulnerabilityId: deletedVulnerabilities[0].id });
  } catch (error) {
    console.error('Error deleting vulnerability:', error);
    res.status(500).json({ message: 'Internal server error while deleting vulnerability.' });
  }
});

export default router;
