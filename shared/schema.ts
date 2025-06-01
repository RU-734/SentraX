import { pgTable, serial, text, pgEnum, timestamp, decimal, integer, uniqueIndex } from 'drizzle-orm/pg-core';

// Define an enum for user roles
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

// Updated User table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
});

// Define an enum for asset types
export const assetTypeEnum = pgEnum('asset_type', [
  'server',
  'workstation',
  'network_device',
  'iot_device',
  'other',
]);

// Assets table
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: assetTypeEnum('type').notNull(),
  ipAddress: text('ip_address').notNull(), // Consider specific IP address type if DB supports (e.g., inet)
  macAddress: text('mac_address'), // Optional
  operatingSystem: text('operating_system'), // Optional
  description: text('description'), // Optional
  lastScannedAt: timestamp('last_scanned_at', { mode: 'date', withTimezone: true }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()), // Automatically updates on record modification
  // If you were to add a userId foreign key:
  // userId: integer('user_id').references(() => users.id),
});

// --- Vulnerability Schemas ---

// 1. Vulnerability Severity Enum
export const vulnerabilitySeverityEnum = pgEnum('vulnerability_severity', [
  'critical',
  'high',
  'medium',
  'low',
  'informational',
]);

// 2. Vulnerabilities Table
export const vulnerabilities = pgTable('vulnerabilities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  severity: vulnerabilitySeverityEnum('severity').notNull(),
  cvssScore: decimal('cvss_score', { precision: 3, scale: 1 }), // Optional
  source: text('source'), // Optional
  references: text('references').array(), // Optional
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
// 3. Vulnerability Status Enum
export const vulnerabilityStatusEnum = pgEnum('vulnerability_status', [
  'open',
  'remediated',
  'ignored',
  'pending_verification',
  'archived',
]);

// 4. Assets-Vulnerabilities Join Table (Link Table)
export const assets_vulnerabilities = pgTable('assets_vulnerabilities', {
  id: serial('id').primaryKey(), // Optional, but can be useful
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  vulnerabilityId: integer('vulnerability_id').notNull().references(() => vulnerabilities.id, { onDelete: 'cascade' }),
  status: vulnerabilityStatusEnum('status').notNull().default('open'),
  lastSeenAt: timestamp('last_seen_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  details: text('details'), // Optional, specific notes
  remediationNotes: text('remediation_notes'), // Optional
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Define a composite unique constraint on assetId and vulnerabilityId
    assetVulnerabilityUnique: uniqueIndex('asset_vulnerability_unique_idx').on(table.assetId, table.vulnerabilityId),
    // Drizzle also supports `primaryKey` for composite PKs if `id` was not used:
    // assetVulnerabilityPk: primaryKey(table.assetId, table.vulnerabilityId),
  };
});


// You can define more tables here as your application grows
// For example:
// export const posts = pgTable('posts', {
//   id: serial('id').primaryKey(),
//   userId: integer('user_id').references(() => users.id),
//   title: text('title'),
//   content: text('content'),
//   createdAt: timestamp('created_at').defaultNow(),
// });

// Example an enum type
// ... (this comment block can remain or be cleaned up later if desired)
