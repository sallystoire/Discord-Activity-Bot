import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, buildingsTable, troopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_BUILDINGS = [
  { type: "town_hall", level: 1, posX: 5, posY: 5 },
  { type: "gold_mine", level: 1, posX: 2, posY: 2 },
  { type: "elixir_collector", level: 1, posX: 8, posY: 2 },
  { type: "gold_storage", level: 1, posX: 2, posY: 8 },
  { type: "elixir_storage", level: 1, posX: 8, posY: 8 },
  { type: "barracks", level: 1, posX: 4, posY: 9 },
  { type: "army_camp", level: 1, posX: 7, posY: 9 },
  { type: "cannon", level: 1, posX: 1, posY: 5 },
  { type: "archer_tower", level: 1, posX: 9, posY: 5 },
];

const DEFAULT_TROOPS = [
  { type: "barbarian", count: 5 },
  { type: "archer", count: 3 },
];

router.post("/token", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      req.log.error({ errText }, "Discord token exchange failed");
      res.status(400).json({ error: "Token exchange failed" });
      return;
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      res.status(400).json({ error: "Failed to fetch user" });
      return;
    }

    const user = (await userResponse.json()) as {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      global_name: string | null;
    };

    const existingPlayer = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.userId, user.id))
      .limit(1);

    if (existingPlayer.length === 0) {
      await db.insert(playersTable).values({
        userId: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar,
        gold: 2000,
        elixir: 2000,
        diamonds: 100,
      });

      await db.insert(buildingsTable).values(
        DEFAULT_BUILDINGS.map((b) => ({ ...b, userId: user.id }))
      );

      await db.insert(troopsTable).values(
        DEFAULT_TROOPS.map((t) => ({ ...t, userId: user.id }))
      );
    } else {
      await db
        .update(playersTable)
        .set({ username: user.global_name || user.username, avatar: user.avatar })
        .where(eq(playersTable.userId, user.id));
    }

    res.json({ access_token: tokenData.access_token, user });
  } catch (err) {
    req.log.error({ err }, "Token exchange error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
