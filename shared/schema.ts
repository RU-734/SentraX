import { pgTable, serial, text, pgEnum } from 'drizzle-orm/pg-core';

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
