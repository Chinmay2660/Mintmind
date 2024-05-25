import { integer, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const Budgets = pgTable('budgets', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    amount: integer('age').notNull(),
    icon: varchar('icon'),
    createdBy: varchar('createdBy').notNull()
})