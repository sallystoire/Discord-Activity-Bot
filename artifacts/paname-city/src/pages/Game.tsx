import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GameLayout } from "@/components/layout/GameLayout";
import { Button } from "@/components/ui/button";
import {
  useGetBuildings,
  useUpgradeBuilding,
  useCollectResources,
  getGetKingdomQueryKey,
  getGetBuildingsQueryKey,
} from "@workspace/api-client-react";
import type { Building } from "@workspace/api-client-react";

const BUILDING_EMOJIS: Record<string, string> = {
  town_hall: "🏛️",
  gold_mine: "⛏️",
  elixir_collector: "🧪",
  gold_storage: "💰",
  elixir_storage: "🗃️",
  barracks: "🏟️",
  army_camp: "⚔️",
  cannon: "💣",
  archer_tower: "🏹",
  wall: "🧱",
};

const BUILDING_NAMES: Record<string, string> = {
  town_hall: "Hotel de Ville",
  gold_mine: "Mine d'Or",
  elixir_collector: "Collecteur d'Elixir",
  gold_storage: "Coffre d'Or",
  elixir_storage: "Reserve d'Elixir",
  barracks: "Caserne",
  army_camp: "Camp Militaire",
  cannon: "Canon",
  archer_tower: "Tour d'Archers",
  wall: "Rempart",
};

export default function Game() {
  const queryClient = useQueryClient();
  const { data: buildings = [], isLoading } = useGetBuildings();
  const upgradeBuilding = useUpgradeBuilding();
  const collectResources = useCollectResources();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const handleCollect = () => {
    collectResources.mutate(undefined, {
      onSuccess: (res) => {
        const goldMsg = res.goldCollected > 0 ? `+${res.goldCollected} 🪙` : "";
        const elixirMsg = res.elixirCollected > 0 ? `+${res.elixirCollected} 💧` : "";
        const msg = [goldMsg, elixirMsg].filter(Boolean).join(" ");
        toast.success(msg || "Rien a recolter pour l'instant");
        queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
      },
      onError: () => toast.error("Erreur lors de la recolte."),
    });
  };

  const handleUpgrade = (id: number) => {
    upgradeBuilding.mutate({ buildingId: id }, {
      onSuccess: () => {
        toast.success("Batiment en amelioration !");
        setSelectedBuilding(null);
        queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBuildingsQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err?.data?.error || "Impossible d'ameliorer ce batiment.");
      },
    });
  };

  const gridSize = 12;
  const cellPct = 100 / gridSize;

  return (
    <GameLayout>
      <div className="relative w-full overflow-hidden" style={{ height: "calc(100dvh - 130px)" }}>
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a4731 0%, #2d6a4f 40%, #1b4332 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: `${cellPct}% ${cellPct}%`,
            }}
          />

          {!isLoading &&
            buildings.map((b) => (
              <motion.button
                key={b.id}
                className="absolute flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${(b.posX / gridSize) * 100}%`,
                  top: `${(b.posY / gridSize) * 100}%`,
                  width: `${cellPct * 1.2}%`,
                  height: `${cellPct * 1.2}%`,
                }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedBuilding(b)}
                data-testid={`building-${b.id}`}
              >
                <div
                  className={`flex items-center justify-center rounded-xl w-full h-full shadow-lg ${
                    b.upgrading ? "bg-yellow-500/30 border-2 border-yellow-400 animate-pulse" : "bg-black/30 border border-white/20"
                  }`}
                >
                  <span className="text-2xl leading-none">{BUILDING_EMOJIS[b.type] ?? "🏗️"}</span>
                </div>
                <span className="text-[8px] text-white/80 font-bold mt-0.5">Niv.{b.level}</span>
              </motion.button>
            ))}
        </div>

        <motion.button
          className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 border-4 border-yellow-800 shadow-[0_6px_0_#713f12] flex items-center justify-center text-2xl active:shadow-none active:translate-y-1.5 disabled:opacity-50"
          whileTap={{ scale: 0.9 }}
          onClick={handleCollect}
          disabled={collectResources.isPending}
          data-testid="button-collect"
          title="Recolter les ressources"
        >
          ⛏️
        </motion.button>
      </div>

      <AnimatePresence>
        {selectedBuilding && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBuilding(null)}
          >
            <motion.div
              className="bg-card border-2 border-primary rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="text-5xl">{BUILDING_EMOJIS[selectedBuilding.type] ?? "🏗️"}</div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase">
                    {BUILDING_NAMES[selectedBuilding.type] ?? selectedBuilding.type}
                  </h3>
                  <p className="text-primary font-bold">Niveau {selectedBuilding.level}</p>
                  {selectedBuilding.upgrading && (
                    <p className="text-yellow-400 text-sm animate-pulse">En cours...</p>
                  )}
                </div>
              </div>

              {selectedBuilding.level < 3 && !selectedBuilding.upgrading ? (
                <Button
                  className="w-full h-12 text-lg font-black uppercase rounded-xl bg-gradient-to-b from-green-400 to-green-600 border-4 border-yellow-500 text-white shadow-[0_6px_0_#854d0e] active:shadow-none active:translate-y-1.5"
                  onClick={() => handleUpgrade(selectedBuilding.id)}
                  disabled={upgradeBuilding.isPending}
                  data-testid="button-upgrade"
                >
                  {upgradeBuilding.isPending ? "..." : "Ameliorer"}
                </Button>
              ) : selectedBuilding.level >= 3 ? (
                <p className="text-center text-muted-foreground font-bold">Niveau Maximum Atteint</p>
              ) : null}

              <Button
                variant="ghost"
                className="w-full mt-3 text-muted-foreground hover:text-white"
                onClick={() => setSelectedBuilding(null)}
              >
                Fermer
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
