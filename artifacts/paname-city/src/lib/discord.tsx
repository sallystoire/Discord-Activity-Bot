import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

export interface GameContextType {
  isAuthenticated: boolean;
  user: { id: string; username: string; avatar: string | null } | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => void;
  isInitializing: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

const VITE_DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || "123456789";

const isEmbedded =
  new URLSearchParams(window.location.search).get("frame_id") != null ||
  window.name.includes("discord");

let discordSdk: DiscordSDK | DiscordSDKMock;
if (isEmbedded) {
  discordSdk = new DiscordSDK(VITE_DISCORD_CLIENT_ID);
} else {
  discordSdk = new DiscordSDKMock(VITE_DISCORD_CLIENT_ID, "guild_id", "channel_id");
}

function getOrCreateDevId(): string {
  const key = "paname_dev_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  localStorage.setItem(key, id);
  return id;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; avatar: string | null } | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("paname_token"));

  useEffect(() => {
    const storedToken = localStorage.getItem("paname_token");
    if (storedToken && !storedToken.startsWith("mock_token_")) {
      const storedUser = localStorage.getItem("paname_user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {}
      }
      setIsAuthenticated(true);
    } else if (storedToken?.startsWith("mock_token_")) {
      localStorage.removeItem("paname_token");
      localStorage.removeItem("paname_user");
    }
    setIsInitializing(false);
  }, []);

  const login = async () => {
    if (isEmbedded) {
      try {
        await discordSdk.ready();
        const { code } = await discordSdk.commands.authorize({
          client_id: VITE_DISCORD_CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "guilds.members.read"],
        });

        const response = await fetch(`${import.meta.env.BASE_URL}api/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const { access_token, user: discordUser } = await response.json();
        localStorage.setItem("paname_token", access_token);
        localStorage.setItem("paname_user", JSON.stringify(discordUser));
        setToken(access_token);
        setUser(discordUser);
        setIsAuthenticated(true);
        return;
      } catch (e) {
        console.error("Discord SDK Error:", e);
      }
    }

    const devId = getOrCreateDevId();
    const devToken = `dev_${devId}`;
    const devUser = { id: devId, username: `Guest_${devId.slice(0, 6)}`, avatar: null };
    localStorage.setItem("paname_token", devToken);
    localStorage.setItem("paname_user", JSON.stringify(devUser));
    setToken(devToken);
    setUser(devUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("paname_token");
    localStorage.removeItem("paname_user");
    localStorage.removeItem("paname_dev_id");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <GameContext.Provider value={{ isAuthenticated, user, token, login, logout, isInitializing }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGameContext must be used within GameProvider");
  return context;
};
