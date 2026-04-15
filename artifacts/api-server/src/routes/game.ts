import { Router } from "express";
import { db } from "@workspace/db";
import {
  playersTable,
  buildingsTable,
  troopsTable,
  raidsTable,
  codesTable,
} from "@workspace/db";
import { eq, ne, desc, asc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

const BUILDING_COSTS: Record<string, Record<number, { gold: number; elixir: number }>> = {
  gold_mine:        { 1: { gold: 500, elixir: 0 }, 2: { gold: 1000, elixir: 0 }, 3: { gold: 2000, elixir: 0 } },
  elixir_collector: { 1: { gold: 0, elixir: 500 }, 2: { gold: 0, elixir: 1000 }, 3: { gold: 0, elixir: 2000 } },
  gold_storage:     { 1: { gold: 300, elixir: 0 }, 2: { gold: 800, elixir: 0 }, 3: { gold: 1500, elixir: 0 } },
  elixir_storage:   { 1: { gold: 0, elixir: 300 }, 2: { gold: 0, elixir: 800 }, 3: { gold: 0, elixir: 1500 } },
  barracks:         { 1: { gold: 1000, elixir: 0 }, 2: { gold: 2500, elixir: 0 }, 3: { gold: 5000, elixir: 0 } },
  army_camp:        { 1: { gold: 1000, elixir: 0 }, 2: { gold: 2000, elixir: 0 }, 3: { gold: 4000, elixir: 0 } },
  cannon:           { 1: { gold: 750, elixir: 0 }, 2: { gold: 1500, elixir: 0 }, 3: { gold: 3000, elixir: 0 } },
  archer_tower:     { 1: { gold: 1000, elixir: 0 }, 2: { gold: 2000, elixir: 0 }, 3: { gold: 4000, elixir: 0 } },
  town_hall:        { 1: { gold: 5000, elixir: 0 }, 2: { gold: 10000, elixir: 0 }, 3: { gold: 20000, elixir: 0 } },
  wall:             { 1: { gold: 300, elixir: 0 }, 2: { gold: 600, elixir: 0 }, 3: { gold: 1200, elixir: 0 } },
};

const TROOP_COSTS: Record<string, { gold: number; elixir: number; space: number }> = {
  barbarian: { gold: 25, elixir: 0, space: 1 },
  archer:    { gold: 0, elixir: 50, space: 1 },
  giant:     { gold: 0, elixir: 200, space: 5 },
  goblin:    { gold: 25, elixir: 25, space: 1 },
};

const TROOP_STATS: Record<string, { hp: number; dmg: number }> = {
  barbarian: { hp: 100, dmg: 20 },
  archer:    { hp: 60, dmg: 30 },
  giant:     { hp: 500, dmg: 15 },
  goblin:    { hp: 45, dmg: 25 },
};

const GOLD_RATE_PER_MIN = 5;
const ELIXIR_RATE_PER_MIN = 5;
const MAX_GOLD = 50000;
const MAX_ELIXIR = 50000;

router.get("/kingdom", async (req, res) => {
  const userId = req.discordUser!.id;
  const player = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player[0]) { res.status(404).json({ error: "Player not found" }); return; }
  const buildings = await db.select().from(buildingsTable).where(eq(buildingsTable.userId, userId));
  res.json({
    ...player[0],
    avatar: player[0].avatar,
    buildings: buildings.map((b) => ({ ...b, upgradeFinishesAt: b.upgradeFinishesAt?.toISOString() ?? null })),
    lastCollected: player[0].lastCollected.toISOString(),
  });
});

router.get("/kingdom/:userId", async (req, res) => {
  const { userId } = req.params;
  const player = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player[0]) { res.status(404).json({ error: "Player not found" }); return; }
  const buildings = await db.select().from(buildingsTable).where(eq(buildingsTable.userId, userId));
  res.json({
    ...player[0],
    buildings: buildings.map((b) => ({ ...b, upgradeFinishesAt: b.upgradeFinishesAt?.toISOString() ?? null })),
    lastCollected: player[0].lastCollected.toISOString(),
  });
});

router.post("/kingdom/collect", async (req, res) => {
  const userId = req.discordUser!.id;
  const [player] = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  const now = new Date();
  const minutesPassed = Math.floor((now.getTime() - player.lastCollected.getTime()) / 60000);
  const goldCollected = Math.min(minutesPassed * GOLD_RATE_PER_MIN, MAX_GOLD - player.gold);
  const elixirCollected = Math.min(minutesPassed * ELIXIR_RATE_PER_MIN, MAX_ELIXIR - player.elixir);

  const newGold = Math.min(player.gold + goldCollected, MAX_GOLD);
  const newElixir = Math.min(player.elixir + elixirCollected, MAX_ELIXIR);

  await db.update(playersTable)
    .set({ gold: newGold, elixir: newElixir, lastCollected: now })
    .where(eq(playersTable.userId, userId));

  res.json({ goldCollected, elixirCollected, newGold, newElixir });
});

router.get("/buildings", async (req, res) => {
  const userId = req.discordUser!.id;
  const buildings = await db.select().from(buildingsTable).where(eq(buildingsTable.userId, userId));
  res.json(buildings.map((b) => ({ ...b, upgradeFinishesAt: b.upgradeFinishesAt?.toISOString() ?? null })));
});

router.post("/buildings/:buildingId/upgrade", async (req, res) => {
  const userId = req.discordUser!.id;
  const buildingId = parseInt(req.params.buildingId);

  const [building] = await db.select().from(buildingsTable)
    .where(and(eq(buildingsTable.id, buildingId), eq(buildingsTable.userId, userId)))
    .limit(1);

  if (!building) { res.status(404).json({ error: "Building not found" }); return; }
  if (building.upgrading) { res.status(400).json({ error: "Already upgrading" }); return; }
  if (building.level >= 3) { res.status(400).json({ error: "Max level reached" }); return; }

  const cost = BUILDING_COSTS[building.type]?.[building.level];
  if (!cost) { res.status(400).json({ error: "Cannot upgrade this building" }); return; }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  if (player.gold < cost.gold || player.elixir < cost.elixir) {
    res.status(400).json({ error: "Not enough resources" }); return;
  }

  const finishTime = new Date(Date.now() + 10000);

  await db.update(playersTable)
    .set({ gold: player.gold - cost.gold, elixir: player.elixir - cost.elixir })
    .where(eq(playersTable.userId, userId));

  const [upgraded] = await db.update(buildingsTable)
    .set({ upgrading: true, upgradeFinishesAt: finishTime, level: building.level + 1 })
    .where(eq(buildingsTable.id, buildingId))
    .returning();

  setTimeout(async () => {
    await db.update(buildingsTable)
      .set({ upgrading: false, upgradeFinishesAt: null })
      .where(eq(buildingsTable.id, buildingId));
  }, 10000);

  res.json({ ...upgraded, upgradeFinishesAt: upgraded.upgradeFinishesAt?.toISOString() ?? null });
});

router.get("/troops", async (req, res) => {
  const userId = req.discordUser!.id;
  const troops = await db.select().from(troopsTable).where(eq(troopsTable.userId, userId));

  const troopTypes = ["barbarian", "archer", "giant", "goblin"];
  const result = troopTypes.map((type) => {
    const found = troops.find((t) => t.type === type);
    const stats = TROOP_STATS[type]!;
    const cost = TROOP_COSTS[type]!;
    return { type, count: found?.count ?? 0, housingSpace: cost.space, attackDamage: stats.dmg, hitPoints: stats.hp };
  });

  res.json(result);
});

router.post("/troops/train", async (req, res) => {
  const userId = req.discordUser!.id;
  const { troopType, quantity } = req.body;

  if (!troopType || !quantity || quantity < 1) {
    res.status(400).json({ error: "Invalid request" }); return;
  }

  const cost = TROOP_COSTS[troopType as string];
  if (!cost) { res.status(400).json({ error: "Unknown troop type" }); return; }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  const goldNeeded = cost.gold * quantity;
  const elixirNeeded = cost.elixir * quantity;

  if (player.gold < goldNeeded || player.elixir < elixirNeeded) {
    res.status(400).json({ error: "Not enough resources" }); return;
  }

  await db.update(playersTable)
    .set({ gold: player.gold - goldNeeded, elixir: player.elixir - elixirNeeded })
    .where(eq(playersTable.userId, userId));

  const existing = await db.select().from(troopsTable)
    .where(and(eq(troopsTable.userId, userId), eq(troopsTable.type, troopType)))
    .limit(1);

  if (existing[0]) {
    await db.update(troopsTable)
      .set({ count: existing[0].count + quantity })
      .where(eq(troopsTable.id, existing[0].id));
  } else {
    await db.insert(troopsTable).values({ userId, type: troopType, count: quantity });
  }

  res.json({ troopType, count: (existing[0]?.count ?? 0) + quantity, goldSpent: goldNeeded, elixirSpent: elixirNeeded });
});

router.get("/raids/targets", async (req, res) => {
  const userId = req.discordUser!.id;
  const targets = await db.select().from(playersTable)
    .where(ne(playersTable.userId, userId))
    .orderBy(desc(playersTable.trophies))
    .limit(10);

  res.json(targets.map((t) => ({
    userId: t.userId,
    username: t.username,
    avatar: t.avatar,
    trophies: t.trophies,
    townHallLevel: t.townHallLevel,
    estimatedLoot: Math.floor((t.gold + t.elixir) * 0.2),
  })));
});

router.get("/raids/history", async (req, res) => {
  const userId = req.discordUser!.id;
  const raids = await db.select().from(raidsTable)
    .where(eq(raidsTable.attackerUserId, userId))
    .orderBy(desc(raidsTable.createdAt))
    .limit(20);

  res.json(raids.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/raids/attack/:targetId", async (req, res) => {
  const attackerUserId = req.discordUser!.id;
  const { targetId } = req.params;

  if (attackerUserId === targetId) {
    res.status(400).json({ error: "Cannot attack yourself" }); return;
  }

  const [attacker] = await db.select().from(playersTable).where(eq(playersTable.userId, attackerUserId)).limit(1);
  const [defender] = await db.select().from(playersTable).where(eq(playersTable.userId, targetId)).limit(1);

  if (!attacker || !defender) { res.status(404).json({ error: "Player not found" }); return; }

  const attackerTroops = await db.select().from(troopsTable).where(eq(troopsTable.userId, attackerUserId));
  const totalTroops = attackerTroops.reduce((sum, t) => sum + t.count, 0);

  if (totalTroops === 0) {
    res.status(400).json({ error: "No troops to attack with" }); return;
  }

  const attackPower = attackerTroops.reduce((sum, t) => {
    const stats = TROOP_STATS[t.type];
    return sum + (stats ? stats.dmg * t.count : 0);
  }, 0);

  const defenseLevel = defender.townHallLevel;
  const starsRoll = Math.random();
  let stars = 1;
  if (attackPower > defenseLevel * 50) stars = starsRoll < 0.5 ? 3 : 2;
  else if (attackPower > defenseLevel * 25) stars = starsRoll < 0.4 ? 2 : 1;

  const lootPct = stars === 3 ? 0.3 : stars === 2 ? 0.2 : 0.1;
  const goldLooted = Math.floor(defender.gold * lootPct);
  const elixirLooted = Math.floor(defender.elixir * lootPct);
  const trophiesGained = Math.max(5, Math.floor(stars * 10 - defenseLevel * 2));
  const defenderTrophiesLost = Math.floor(trophiesGained * 0.5);

  for (const troop of attackerTroops) {
    const lostPct = stars === 1 ? 0.8 : stars === 2 ? 0.5 : 0.2;
    await db.update(troopsTable)
      .set({ count: Math.max(0, Math.floor(troop.count * (1 - lostPct))) })
      .where(eq(troopsTable.id, troop.id));
  }

  await db.update(playersTable)
    .set({
      gold: attacker.gold + goldLooted,
      elixir: attacker.elixir + elixirLooted,
      trophies: attacker.trophies + trophiesGained,
      totalAttacks: attacker.totalAttacks + 1,
      winsCount: stars >= 1 ? attacker.winsCount + 1 : attacker.winsCount,
    })
    .where(eq(playersTable.userId, attackerUserId));

  await db.update(playersTable)
    .set({
      gold: Math.max(0, defender.gold - goldLooted),
      elixir: Math.max(0, defender.elixir - elixirLooted),
      trophies: Math.max(0, defender.trophies - defenderTrophiesLost),
      totalDefenses: defender.totalDefenses + 1,
    })
    .where(eq(playersTable.userId, targetId));

  await db.insert(raidsTable).values({
    attackerUserId,
    defenderUserId: targetId,
    attackerUsername: attacker.username,
    defenderUsername: defender.username,
    goldLooted,
    elixirLooted,
    trophiesGained,
    stars,
  });

  res.json({
    stars,
    goldLooted,
    elixirLooted,
    trophiesGained,
    defenderTrophiesLost,
    newGold: attacker.gold + goldLooted,
    newElixir: attacker.elixir + elixirLooted,
  });
});

const SHOP_ITEMS = [
  { id: "gold_500", name: "Sac de pièces", description: "+500 Or", costDiamonds: 10, rewardGold: 500, rewardElixir: 0, category: "resources" },
  { id: "gold_2000", name: "Coffre d'Or", description: "+2000 Or", costDiamonds: 35, rewardGold: 2000, rewardElixir: 0, category: "resources" },
  { id: "elixir_500", name: "Fiole d'Elixir", description: "+500 Elixir", costDiamonds: 10, rewardGold: 0, rewardElixir: 500, category: "resources" },
  { id: "elixir_2000", name: "Grand Elixir", description: "+2000 Elixir", costDiamonds: 35, rewardGold: 0, rewardElixir: 2000, category: "resources" },
  { id: "pack_starter", name: "Pack Débutant", description: "+1000 Or & Elixir", costDiamonds: 50, rewardGold: 1000, rewardElixir: 1000, category: "resources" },
  { id: "troops_barb", name: "Bataillon Barbares", description: "+20 Barbares", costDiamonds: 25, rewardGold: 0, rewardElixir: 0, category: "troops" },
  { id: "troops_archer", name: "Escouade Archers", description: "+15 Archers", costDiamonds: 30, rewardGold: 0, rewardElixir: 0, category: "troops" },
  { id: "speedup_1h", name: "Accélérateur 1h", description: "Terminer une construction instantanément", costDiamonds: 20, rewardGold: 0, rewardElixir: 0, category: "speedup" },
];

router.get("/shop", async (_req, res) => {
  res.json(SHOP_ITEMS);
});

router.post("/shop/purchase", async (req, res) => {
  const userId = req.discordUser!.id;
  const { itemId } = req.body;

  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  if (player.diamonds < item.costDiamonds) {
    res.status(400).json({ error: "Not enough diamonds" }); return;
  }

  let newGold = player.gold + item.rewardGold;
  let newElixir = player.elixir + item.rewardElixir;
  const newDiamonds = player.diamonds - item.costDiamonds;

  if (item.id === "troops_barb") {
    const existing = await db.select().from(troopsTable)
      .where(and(eq(troopsTable.userId, userId), eq(troopsTable.type, "barbarian"))).limit(1);
    if (existing[0]) {
      await db.update(troopsTable).set({ count: existing[0].count + 20 }).where(eq(troopsTable.id, existing[0].id));
    } else {
      await db.insert(troopsTable).values({ userId, type: "barbarian", count: 20 });
    }
  } else if (item.id === "troops_archer") {
    const existing = await db.select().from(troopsTable)
      .where(and(eq(troopsTable.userId, userId), eq(troopsTable.type, "archer"))).limit(1);
    if (existing[0]) {
      await db.update(troopsTable).set({ count: existing[0].count + 15 }).where(eq(troopsTable.id, existing[0].id));
    } else {
      await db.insert(troopsTable).values({ userId, type: "archer", count: 15 });
    }
  }

  await db.update(playersTable)
    .set({ gold: newGold, elixir: newElixir, diamonds: newDiamonds })
    .where(eq(playersTable.userId, userId));

  res.json({ success: true, newDiamonds, newGold, newElixir });
});

router.post("/codes/redeem", async (req, res) => {
  const userId = req.discordUser!.id;
  const { code } = req.body;

  if (!code) { res.status(400).json({ error: "Missing code" }); return; }

  const [codeRow] = await db.select().from(codesTable).where(eq(codesTable.code, code.toUpperCase())).limit(1);

  if (!codeRow) {
    res.json({ success: false, message: "Code invalide" }); return;
  }

  if (codeRow.usedBy) {
    res.json({ success: false, message: "Ce code a déjà été utilisé" }); return;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  await db.update(codesTable)
    .set({ usedBy: userId, usedAt: new Date() })
    .where(eq(codesTable.code, code.toUpperCase()));

  let newGold = player.gold;
  let newElixir = player.elixir;
  let newDiamonds = player.diamonds;

  if (codeRow.resource === "gold") newGold += codeRow.amount;
  else if (codeRow.resource === "elixir") newElixir += codeRow.amount;
  else if (codeRow.resource === "diamonds") newDiamonds += codeRow.amount;

  await db.update(playersTable)
    .set({ gold: newGold, elixir: newElixir, diamonds: newDiamonds })
    .where(eq(playersTable.userId, userId));

  res.json({
    success: true,
    resource: codeRow.resource,
    amount: codeRow.amount,
    newGold,
    newElixir,
    newDiamonds,
    message: `Code valide ! +${codeRow.amount} ${codeRow.resource}`,
  });
});

router.get("/leaderboard", async (_req, res) => {
  const players = await db.select().from(playersTable).orderBy(desc(playersTable.trophies)).limit(20);
  res.json(players.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    username: p.username,
    avatar: p.avatar,
    trophies: p.trophies,
    townHallLevel: p.townHallLevel,
  })));
});

router.get("/profile", async (req, res) => {
  const userId = req.discordUser!.id;
  const [player] = await db.select().from(playersTable).where(eq(playersTable.userId, userId)).limit(1);
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }
  res.json({
    userId: player.userId,
    username: player.username,
    avatar: player.avatar,
    gold: player.gold,
    elixir: player.elixir,
    diamonds: player.diamonds,
    trophies: player.trophies,
    townHallLevel: player.townHallLevel,
    totalAttacks: player.totalAttacks,
    totalDefenses: player.totalDefenses,
    winsCount: player.winsCount,
  });
});

export default router;
