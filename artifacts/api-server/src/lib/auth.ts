import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { playersTable, buildingsTable, troopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

declare global {
  namespace Express {
    interface Request {
      discordUser?: DiscordUser;
    }
  }
}

const DEFAULT_BUILDINGS = [
  { type: "town_hall", level: 1, posX: 5, posY: 5 },
  { type: "gold_mine", level: 1, posX: 2, posY: 2 },
  { type: "gold_mine", level: 1, posX: 9, posY: 3 },
  { type: "elixir_collector", level: 1, posX: 8, posY: 2 },
  { type: "elixir_collector", level: 1, posX: 1, posY: 7 },
  { type: "gold_storage", level: 1, posX: 3, posY: 8 },
  { type: "elixir_storage", level: 1, posX: 7, posY: 8 },
  { type: "barracks", level: 1, posX: 4, posY: 10 },
  { type: "army_camp", level: 1, posX: 7, posY: 10 },
  { type: "cannon", level: 1, posX: 1, posY: 4 },
  { type: "archer_tower", level: 1, posX: 9, posY: 6 },
];

const DEFAULT_TROOPS = [
  { type: "barbarian", count: 10 },
  { type: "archer", count: 5 },
];

async function ensureDevPlayer(userId: string, username: string) {
  const existing = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(playersTable).values({
      userId,
      username,
      avatar: null,
      gold: 5000,
      elixir: 5000,
      diamonds: 200,
    });

    await db.insert(buildingsTable).values(
      DEFAULT_BUILDINGS.map((b) => ({ ...b, userId }))
    );

    await db.insert(troopsTable).values(
      DEFAULT_TROOPS.map((t) => ({ ...t, userId }))
    );
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  if (process.env.NODE_ENV !== "production" && token.startsWith("dev_")) {
    const userId = token.slice(4);
    const username = `Guest_${userId.slice(0, 6)}`;
    await ensureDevPlayer(userId, username);
    req.discordUser = {
      id: userId,
      username,
      discriminator: "0000",
      avatar: null,
      global_name: username,
    };
    next();
    return;
  }

  try {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      res.status(401).json({ error: "Invalid Discord token" });
      return;
    }

    const user = (await response.json()) as DiscordUser;
    req.discordUser = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Failed to verify token" });
  }
}
