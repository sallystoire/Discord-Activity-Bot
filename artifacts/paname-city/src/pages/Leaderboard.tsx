import { GameLayout } from "@/components/layout/GameLayout";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { useGameContext } from "@/lib/discord";
import { motion } from "framer-motion";

function getAvatar(avatar: string | null | undefined, userId: string) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(userId)}&background=4a5568&color=fff&size=64`;
}

const RANK_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const { data: entries = [], isLoading } = useGetLeaderboard();
  const { user } = useGameContext();

  return (
    <GameLayout>
      <div className="min-h-full p-4">
        <h2 className="text-2xl font-black text-center text-yellow-400 uppercase tracking-widest mb-4 drop-shadow">
          Classement
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Aucun joueur pour l'instant. Sois le premier !
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isCurrentUser = user?.id === entry.userId;
              return (
                <motion.div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isCurrentUser
                      ? "bg-primary/20 border-primary"
                      : "bg-card border-card-border"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  data-testid={`leaderboard-entry-${entry.userId}`}
                >
                  <div className={`w-8 text-center font-black text-lg ${RANK_COLORS[i] ?? "text-muted-foreground"}`}>
                    {i < 3 ? RANK_MEDALS[i] : `#${entry.rank}`}
                  </div>
                  <img
                    src={getAvatar(entry.avatar, entry.userId)}
                    alt={entry.username}
                    className="w-10 h-10 rounded-full border-2 border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isCurrentUser ? "text-primary" : "text-white"}`}>
                      {entry.username} {isCurrentUser && "(Toi)"}
                    </p>
                    <p className="text-xs text-muted-foreground">Hotel de Ville Niv.{entry.townHallLevel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-amber-400 text-lg">{entry.trophies}</p>
                    <p className="text-xs text-muted-foreground">trophées</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </GameLayout>
  );
}
