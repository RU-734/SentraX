import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

// Example User table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name'),
  email: varchar('email', { length: 256 }).unique(),
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
// import { pgEnum } from 'drizzle-orm/pg-core';
// export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'viewer']);
// ... and then in a table:
// role: userRoleEnum('user_role').default('viewer'),
