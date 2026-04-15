# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Main project: **Paname City** — a Discord Activity game (Clash of Clans style) for the Discord server discord.gg/paname.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Discord**: @discord/embedded-app-sdk (Activity), discord.js (Bot)

## Artifacts

- **Paname City** (`artifacts/paname-city`) — Discord Activity frontend (React + Vite, preview at `/`)
- **API Server** (`artifacts/api-server`) — Express API + Discord bot

## Game Features

- Clash of Clans style city-building game inside Discord voice channels
- Kingdom with buildings (Town Hall, Mines, Barracks, Defenses)
- Resources: Gold, Elixir, Diamonds
- Troops: Barbarians, Archers, Giants, Goblins
- Raid system: attack other players' kingdoms
- Shop: buy resources and troops with diamonds
- Leaderboard by trophies
- Profile with resource code redemption
- Home screen with "JOUER" button and Credits modal
- Discord OAuth via Embedded App SDK

## Discord Bot Commands

- `/code [resource] [amount]` — Create a resource code (sys users only)
- `/sys [@user]` — Add user to sys list (admin only)
- `/unsys [@user]` — Remove user from sys list (admin only)
- `/syslist` — View sys list (admin only)

Guild ID: 1489787998676713632

## Database Tables

- `players` — Player accounts linked to Discord user IDs
- `buildings` — Each player's buildings with positions and levels
- `troops` — Player troops by type and count
- `raids` — Raid history between players
- `codes` — Resource codes (created by /code command, redeemed in-game)
- `sys_users` — Users authorized to create codes

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/paname-city run dev` — run frontend locally

## Environment Variables Required

- `DISCORD_CLIENT_ID` — Discord Application ID
- `DISCORD_CLIENT_SECRET` — Discord OAuth2 Client Secret
- `DISCORD_BOT_TOKEN` — Discord Bot Token
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Session secret

## Important Setup Steps for Discord Activity

1. In Discord Developer Portal, under your app's **URL Mappings**, add:
   - Root mapping: `https://<your-replit-app-url>/`
2. Enable **Activities** in your Discord application settings
3. Invite the bot to guild `1489787998676713632` with correct permissions
