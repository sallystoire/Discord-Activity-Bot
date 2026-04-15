import { useState, useEffect, useCallback } from "react";
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

const BUILDING_CONFIG: Record<string, { emoji: string; name: string; color: string; size: number; bg: string }> = {
  town_hall:        { emoji: "🏛️", name: "Hôtel de Ville",       color: "#fbbf24", size: 2.2, bg: "#78350f" },
  gold_mine:        { emoji: "⛏️", name: "Mine d'Or",             color: "#fcd34d", size: 1.6, bg: "#92400e" },
  elixir_collector: { emoji: "🧪", name: "Collecteur d'Elixir",   color: "#a855f7", size: 1.6, bg: "#581c87" },
  gold_storage:     { emoji: "💰", name: "Coffre d'Or",            color: "#f59e0b", size: 1.4, bg: "#78350f" },
  elixir_storage:   { emoji: "🫧", name: "Réserve d'Elixir",      color: "#c084fc", size: 1.4, bg: "#581c87" },
  barracks:         { emoji: "🏟️", name: "Caserne",               color: "#ef4444", size: 1.6, bg: "#7f1d1d" },
  army_camp:        { emoji: "⚔️", name: "Camp Militaire",         color: "#f97316", size: 1.5, bg: "#7c2d12" },
  cannon:           { emoji: "💣", name: "Canon",                  color: "#6b7280", size: 1.3, bg: "#1f2937" },
  archer_tower:     { emoji: "🏹", name: "Tour d'Archers",         color: "#84cc16", size: 1.5, bg: "#1a2e05" },
  wall:             { emoji: "🧱", name: "Rempart",                color: "#9ca3af", size: 1.1, bg: "#374151" },
};

const UPGRADE_COSTS: Record<string, Record<number, { gold: number; elixir: number }>> = {
  gold_mine:        { 1: { gold: 500, elixir: 0 },   2: { gold: 1000, elixir: 0 },  3: { gold: 2000, elixir: 0 } },
  elixir_collector: { 1: { gold: 0, elixir: 500 },   2: { gold: 0, elixir: 1000 },  3: { gold: 0, elixir: 2000 } },
  gold_storage:     { 1: { gold: 300, elixir: 0 },   2: { gold: 800, elixir: 0 },   3: { gold: 1500, elixir: 0 } },
  elixir_storage:   { 1: { gold: 0, elixir: 300 },   2: { gold: 0, elixir: 800 },   3: { gold: 0, elixir: 1500 } },
  barracks:         { 1: { gold: 1000, elixir: 0 },  2: { gold: 2500, elixir: 0 },  3: { gold: 5000, elixir: 0 } },
  army_camp:        { 1: { gold: 1000, elixir: 0 },  2: { gold: 2000, elixir: 0 },  3: { gold: 4000, elixir: 0 } },
  cannon:           { 1: { gold: 750, elixir: 0 },   2: { gold: 1500, elixir: 0 },  3: { gold: 3000, elixir: 0 } },
  archer_tower:     { 1: { gold: 1000, elixir: 0 },  2: { gold: 2000, elixir: 0 },  3: { gold: 4000, elixir: 0 } },
  town_hall:        { 1: { gold: 5000, elixir: 0 },  2: { gold: 10000, elixir: 0 }, 3: { gold: 20000, elixir: 0 } },
  wall:             { 1: { gold: 300, elixir: 0 },   2: { gold: 600, elixir: 0 },   3: { gold: 1200, elixir: 0 } },
};

type FloatingText = { id: number; x: number; y: number; text: string; color: string };

export default function Game() {
  const queryClient = useQueryClient();
  const { data: buildings = [], isLoading } = useGetBuildings();
  const upgradeBuilding = useUpgradeBuilding();
  const collectResources = useCollectResources();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts((prev) => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloatingTexts((prev) => prev.filter((f) => f.id !== id)), 1500);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleCollect = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    collectResources.mutate(undefined, {
      onSuccess: (res) => {
        if (res.goldCollected > 0) {
          addFloat(x, y - 5, `+${res.goldCollected} 🪙`, "#fbbf24");
        }
        if (res.elixirCollected > 0) {
          addFloat(x, y + 5, `+${res.elixirCollected} 💧`, "#a855f7");
        }
        if (!res.goldCollected && !res.elixirCollected) {
          toast("Reviens dans quelques secondes !");
        }
        queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
      },
      onError: () => toast.error("Erreur de récolte."),
    });
  };

  const handleUpgrade = (id: number) => {
    upgradeBuilding.mutate({ buildingId: id }, {
      onSuccess: () => {
        toast.success("⬆️ Amélioration lancée !");
        setSelectedBuilding(null);
        queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBuildingsQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err?.data?.error || "Ressources insuffisantes !");
      },
    });
  };

  const gridSize = 12;
  const cellPct = 100 / gridSize;

  const cost = selectedBuilding ? UPGRADE_COSTS[selectedBuilding.type]?.[selectedBuilding.level] : null;
  const cfg = selectedBuilding ? (BUILDING_CONFIG[selectedBuilding.type] ?? { emoji: "🏗️", name: selectedBuilding.type, color: "#fff", size: 1.4, bg: "#333" }) : null;

  return (
    <GameLayout>
      <div
        className="relative w-full overflow-hidden cursor-crosshair select-none"
        style={{ height: "calc(100dvh - 130px)" }}
        onClick={handleCollect}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, #2d6a4f 0%, #1b4332 50%, #0d2818 100%)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(74,222,128,0.08) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(74,222,128,0.05) 0%, transparent 40%),
                linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `100% 100%, 100% 100%, ${cellPct}% ${cellPct}%`,
            }}
          />

          <div
            className="absolute rounded-full opacity-20"
            style={{
              left: "25%", top: "25%", width: "50%", height: "50%",
              background: "radial-gradient(ellipse, rgba(165,243,140,0.3) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
        </div>

        {!isLoading && buildings.map((b) => {
          const config = BUILDING_CONFIG[b.type] ?? { emoji: "🏗️", name: b.type, color: "#fff", size: 1.3, bg: "#333" };
          const sizePct = cellPct * config.size;
          const offsetX = (sizePct - cellPct) / 2;
          const offsetY = (sizePct - cellPct) / 2;

          return (
            <motion.button
              key={b.id}
              className="absolute flex flex-col items-center justify-center z-10"
              style={{
                left: `calc(${(b.posX / gridSize) * 100}% - ${offsetX}%)`,
                top: `calc(${(b.posY / gridSize) * 100}% - ${offsetY}%)`,
                width: `${sizePct}%`,
                height: `${sizePct}%`,
              }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBuilding(b);
              }}
              data-testid={`building-${b.id}`}
            >
              <div
                className="w-full h-full flex flex-col items-center justify-center rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.5)] relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${config.bg}dd 0%, ${config.bg}99 100%)`,
                  border: `2px solid ${config.color}88`,
                  boxShadow: b.upgrading
                    ? `0 0 12px ${config.color}, 0 4px 0 rgba(0,0,0,0.5)`
                    : `0 4px 0 rgba(0,0,0,0.5)`,
                }}
              >
                {b.upgrading && (
                  <div
                    className="absolute inset-0 animate-pulse opacity-30"
                    style={{ background: config.color }}
                  />
                )}
                <span className="text-2xl leading-none drop-shadow-md z-10">{config.emoji}</span>
                {b.level > 1 && (
                  <div
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                    style={{ background: config.color, color: "#000" }}
                  >
                    {b.level}
                  </div>
                )}
                {b.upgrading && (
                  <div className="absolute bottom-0.5 left-0 right-0 flex justify-center">
                    <span className="text-[7px] text-yellow-300 font-bold animate-bounce">⬆️</span>
                  </div>
                )}
              </div>
              <span
                className="text-[7px] font-black mt-0.5 px-1 py-0.5 rounded"
                style={{ color: config.color, textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
              >
                {config.name.split(" ")[0]}
              </span>
            </motion.button>
          );
        })}

        {floatingTexts.map((f) => (
          <motion.div
            key={f.id}
            className="absolute pointer-events-none z-50 font-black text-sm drop-shadow-lg"
            style={{ left: `${f.x}%`, top: `${f.y}%`, color: f.color }}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -40, scale: 1.2 }}
            transition={{ duration: 1.4 }}
          >
            {f.text}
          </motion.div>
        ))}

        <div
          className="absolute bottom-4 left-4 text-xs text-white/50 font-medium pointer-events-none"
        >
          Touche la carte pour récolter
        </div>
      </div>

      <AnimatePresence>
        {selectedBuilding && cfg && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBuilding(null)}
          >
            <motion.div
              className="w-full max-w-sm mb-4 mx-4 rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: `2px solid ${cfg.color}66` }}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="px-5 pt-5 pb-4"
                style={{ background: `linear-gradient(135deg, ${cfg.bg}ff 0%, ${cfg.bg}cc 100%)` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl shadow-lg"
                    style={{ background: `${cfg.color}22`, border: `2px solid ${cfg.color}55` }}
                  >
                    {cfg.emoji}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{cfg.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
                          style={{
                            background: i < selectedBuilding.level ? cfg.color : "#ffffff22",
                            color: i < selectedBuilding.level ? "#000" : "#ffffff44",
                          }}
                        >
                          {i + 1}
                        </div>
                      ))}
                      <span className="text-white/60 text-xs ml-1">Niveau {selectedBuilding.level}</span>
                    </div>
                  </div>
                </div>

                {selectedBuilding.upgrading ? (
                  <div
                    className="w-full py-3 rounded-xl text-center font-black text-yellow-300 animate-pulse"
                    style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}
                  >
                    ⚒️ Amélioration en cours...
                  </div>
                ) : selectedBuilding.level >= 3 ? (
                  <div
                    className="w-full py-3 rounded-xl text-center font-black"
                    style={{ background: `${cfg.color}22`, color: cfg.color }}
                  >
                    ✨ Niveau Maximum
                  </div>
                ) : cost ? (
                  <Button
                    className="w-full h-14 text-base font-black uppercase rounded-xl shadow-[0_5px_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-1"
                    style={{
                      background: `linear-gradient(to bottom, ${cfg.color}, ${cfg.color}bb)`,
                      border: `2px solid ${cfg.color}`,
                      color: "#000",
                    }}
                    onClick={() => handleUpgrade(selectedBuilding.id)}
                    disabled={upgradeBuilding.isPending}
                    data-testid="button-upgrade"
                  >
                    {upgradeBuilding.isPending ? "..." : (
                      <span className="flex items-center justify-center gap-3">
                        <span>⬆️ Améliorer</span>
                        {cost.gold > 0 && <span className="flex items-center gap-1">🪙 {cost.gold.toLocaleString()}</span>}
                        {cost.elixir > 0 && <span className="flex items-center gap-1">💧 {cost.elixir.toLocaleString()}</span>}
                      </span>
                    )}
                  </Button>
                ) : null}

                <Button
                  variant="ghost"
                  className="w-full mt-2 text-white/50 hover:text-white text-sm"
                  onClick={() => setSelectedBuilding(null)}
                >
                  Fermer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
