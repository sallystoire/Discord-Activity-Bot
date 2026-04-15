import type { Request, Response, NextFunction } from "express";

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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7);

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
