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

// Determine if we should use the mock or real SDK
const isEmbedded = new URLSearchParams(window.location.search).get("frame_id") != null || 
                   window.name.includes("discord");

let discordSdk: DiscordSDK | DiscordSDKMock;
if (isEmbedded) {
  discordSdk = new DiscordSDK(VITE_DISCORD_CLIENT_ID);
} else {
  // Use mock for browser testing
  discordSdk = new DiscordSDKMock(VITE_DISCORD_CLIENT_ID, "guild_id", "channel_id");
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; avatar: string | null } | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("paname_token"));

  useEffect(() => {
    // Check if token exists, if so we assume authenticated for now
    if (token) {
      setIsAuthenticated(true);
      // In a real app we might fetch user profile here
      setUser({ id: "mock_user", username: "Player1", avatar: null });
    }
    setIsInitializing(false);
  }, [token]);

  const login = async () => {
    try {
      await discordSdk.ready();
      const { code } = await discordSdk.commands.authorize({
        client_id: VITE_DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds.members.read"],
      });
      
      // Exchange code
      const response = await fetch(`${import.meta.env.BASE_URL}api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      
      const { access_token, user: discordUser } = await response.json();
      localStorage.setItem("paname_token", access_token);
      setToken(access_token);
      setUser(discordUser);
      setIsAuthenticated(true);
    } catch (e) {
      console.error("Discord SDK Error:", e);
      // Fallback for dev mode
      const mockToken = "mock_token_" + Date.now();
      localStorage.setItem("paname_token", mockToken);
      setToken(mockToken);
      setUser({ id: "dev_user", username: "DevPlayer", avatar: null });
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    localStorage.removeItem("paname_token");
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
