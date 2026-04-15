import { pgTable, text, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  userId: text("user_id").primaryKey(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  gold: integer("gold").notNull().default(1000),
  elixir: integer("elixir").notNull().default(1000),
  diamonds: integer("diamonds").notNull().default(50),
  trophies: integer("trophies").notNull().default(0),
  townHallLevel: integer("town_hall_level").notNull().default(1),
  totalAttacks: integer("total_attacks").notNull().default(0),
  totalDefenses: integer("total_defenses").notNull().default(0),
  winsCount: integer("wins_count").notNull().default(0),
  lastCollected: timestamp("last_collected").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const buildingsTable = pgTable("buildings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => playersTable.userId, { onDelete: "cascade" }),
  type: text("type").notNull(),
  level: integer("level").notNull().default(1),
  posX: integer("pos_x").notNull(),
  posY: integer("pos_y").notNull(),
  upgrading: boolean("upgrading").notNull().default(false),
  upgradeFinishesAt: timestamp("upgrade_finishes_at"),
});

export const troopsTable = pgTable("troops", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => playersTable.userId, { onDelete: "cascade" }),
  type: text("type").notNull(),
  count: integer("count").notNull().default(0),
});

export const raidsTable = pgTable("raids", {
  id: serial("id").primaryKey(),
  attackerUserId: text("attacker_user_id").notNull(),
  defenderUserId: text("defender_user_id").notNull(),
  attackerUsername: text("attacker_username").notNull(),
  defenderUsername: text("defender_username").notNull(),
  goldLooted: integer("gold_looted").notNull().default(0),
  elixirLooted: integer("elixir_looted").notNull().default(0),
  trophiesGained: integer("trophies_gained").notNull().default(0),
  stars: integer("stars").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const codesTable = pgTable("codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  resource: text("resource").notNull(),
  amount: integer("amount").notNull(),
  createdBy: text("created_by").notNull(),
  usedBy: text("used_by"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sysUsersTable = pgTable("sys_users", {
  userId: text("user_id").primaryKey(),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ createdAt: true, lastCollected: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
export type Building = typeof buildingsTable.$inferSelect;
export type Troop = typeof troopsTable.$inferSelect;
export type Raid = typeof raidsTable.$inferSelect;
export type Code = typeof codesTable.$inferSelect;
export type SysUser = typeof sysUsersTable.$inferSelect;
