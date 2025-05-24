import { pgTable, serial, text, pgEnum, timestamp } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()), // Automatically updates on record modification
  // If you were to add a userId foreign key:
  // userId: integer('user_id').references(() => users.id),
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
