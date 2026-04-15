import { useState } from "react";
import { GameLayout } from "@/components/layout/GameLayout";
import {
  useGetRaidTargets,
  useGetRaidHistory,
  useAttackKingdom,
  getGetRaidTargetsQueryKey,
  getGetRaidHistoryQueryKey,
  getGetKingdomQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type RaidResultData = {
  stars: number;
  goldLooted: number;
  elixirLooted: number;
  trophiesGained: number;
};

function getAvatar(avatar: string | null | undefined, userId: string) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  return `https://ui-avatars.com/api/?name=${userId}&background=4a5568&color=fff&size=64`;
}

export default function Raid() {
  const queryClient = useQueryClient();
  const { data: targets = [], isLoading: loadingTargets } = useGetRaidTargets();
  const { data: history = [] } = useGetRaidHistory();
  const attackKingdom = useAttackKingdom();
  const [activeTab, setActiveTab] = useState<"targets" | "history">("targets");
  const [raidResult, setRaidResult] = useState<RaidResultData | null>(null);

  const handleAttack = (targetId: string) => {
    attackKingdom.mutate({ targetId }, {
      onSuccess: (result) => {
        setRaidResult(result);
        queryClient.invalidateQueries({ queryKey: getGetRaidTargetsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRaidHistoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err?.data?.error || "Attaque impossible !");
      },
    });
  };

  return (
    <GameLayout>
      <div className="min-h-full p-4">
        <h2 className="text-2xl font-black text-center text-yellow-400 uppercase tracking-widest mb-4 drop-shadow">
          Raid
        </h2>

        <div className="flex gap-2 mb-4">
          {(["targets", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl font-bold uppercase text-sm transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab === "targets" ? "Cibles" : "Historique"}
            </button>
          ))}
        </div>

        {activeTab === "targets" && (
          <div className="space-y-3">
            {loadingTargets ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
              ))
            ) : targets.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucune cible disponible pour le moment.
              </div>
            ) : (
              targets.map((target) => (
                <motion.div
                  key={target.userId}
                  className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  data-testid={`raid-target-${target.userId}`}
                >
                  <img
                    src={getAvatar(target.avatar, target.userId)}
                    alt={target.username}
                    className="w-12 h-12 rounded-full border-2 border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{target.username}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>🏆 {target.trophies}</span>
                      <span>🏛️ Niv.{target.townHallLevel}</span>
                      <span className="text-yellow-400 font-bold">💰 ~{target.estimatedLoot}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAttack(target.userId)}
                    disabled={attackKingdom.isPending}
                    className="bg-red-500 hover:bg-red-400 text-white font-bold px-4 rounded-xl border-2 border-red-700 shadow-[0_4px_0_#7f1d1d] active:shadow-none active:translate-y-1"
                    data-testid={`attack-button-${target.userId}`}
                  >
                    Attaquer
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucun raid effectué pour l'instant.
              </div>
            ) : (
              history.map((raid) => (
                <div
                  key={raid.id}
                  className="bg-card border border-card-border rounded-xl p-4"
                  data-testid={`raid-history-${raid.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white text-sm">vs {raid.defenderUsername}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(raid.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold">{"⭐".repeat(raid.stars)}</p>
                      <p className="text-xs text-muted-foreground">+{raid.trophiesGained} 🏆</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-yellow-300">+{raid.goldLooted} 🪙</span>
                    <span className="text-fuchsia-300">+{raid.elixirLooted} 💧</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {raidResult && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card border-2 border-yellow-500 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
            >
              <h3 className="text-3xl font-black text-yellow-400 mb-2 uppercase">Raid Terminé !</h3>
              <div className="text-5xl mb-4">{"⭐".repeat(raidResult.stars)}{"☆".repeat(3 - raidResult.stars)}</div>
              <div className="space-y-2 mb-6">
                <p className="text-xl text-yellow-300 font-bold">+{raidResult.goldLooted} 🪙</p>
                <p className="text-xl text-fuchsia-300 font-bold">+{raidResult.elixirLooted} 💧</p>
                <p className="text-xl text-amber-400 font-bold">+{raidResult.trophiesGained} 🏆</p>
              </div>
              <Button
                onClick={() => setRaidResult(null)}
                className="w-full bg-gradient-to-b from-green-400 to-green-600 text-white font-bold h-12 text-lg uppercase rounded-xl border-4 border-yellow-500 shadow-[0_6px_0_#854d0e] active:shadow-none active:translate-y-1"
              >
                Super !
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
