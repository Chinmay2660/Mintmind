import { integer, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const Budgets = pgTable('budgets', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    amount: integer('amount').notNull(),
    icon: varchar('icon'),
    createdBy: varchar('createdBy').notNull()
})

export const Expenses = pgTable('expenses', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    amount: integer('amount').notNull(),
    budgetId: integer('budgetId').references(() => Budgets.id),
    createdAt: varchar('createdAt').notNull()
})