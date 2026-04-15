import { useState } from "react";
import { GameLayout } from "@/components/layout/GameLayout";
import {
  useGetShopItems,
  usePurchaseItem,
  getGetKingdomQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_LABELS: Record<string, string> = {
  resources: "Ressources",
  troops: "Troupes",
  speedup: "Accélérateurs",
};

const CATEGORY_ICONS: Record<string, string> = {
  resources: "🪙",
  troops: "⚔️",
  speedup: "⚡",
};

export default function Shop() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useGetShopItems();
  const purchaseItem = usePurchaseItem();
  const [activeCategory, setActiveCategory] = useState("resources");

  const categories = ["resources", "troops", "speedup"];
  const filtered = items.filter((item) => item.category === activeCategory);

  const handlePurchase = (itemId: string, name: string) => {
    purchaseItem.mutate({ data: { itemId } }, {
      onSuccess: () => {
        toast.success(`${name} acheté !`);
        queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err?.data?.error || "Achat impossible !");
      },
    });
  };

  return (
    <GameLayout>
      <div className="min-h-full p-4">
        <h2 className="text-2xl font-black text-center text-yellow-400 uppercase tracking-widest mb-4 drop-shadow">
          Boutique
        </h2>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-none px-4 py-2 rounded-full font-bold text-sm transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted border border-card-border"
              }`}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                className="bg-card border border-card-border rounded-xl p-4 flex flex-col gap-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`shop-item-${item.id}`}
              >
                <div className="text-3xl text-center">
                  {item.category === "resources" ? "💰" : item.category === "troops" ? "⚔️" : "⚡"}
                </div>
                <p className="font-bold text-white text-sm text-center">{item.name}</p>
                <p className="text-xs text-muted-foreground text-center">{item.description}</p>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(item.id, item.name)}
                  disabled={purchaseItem.isPending}
                  className="w-full bg-gradient-to-b from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-black font-black rounded-xl border-2 border-cyan-800 shadow-[0_4px_0_#0e7490] active:shadow-none active:translate-y-1"
                  data-testid={`buy-button-${item.id}`}
                >
                  💎 {item.costDiamonds}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </GameLayout>
  );
}
