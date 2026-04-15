import { useState } from "react";
import { useLocation } from "wouter";
import { useGameContext } from "@/lib/discord";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useGameContext();
  const [showCredits, setShowCredits] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlay = async () => {
    setIsLoading(true);
    if (!isAuthenticated) {
      await login();
    }
    setLocation("/loading");
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background relative overflow-hidden font-game">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-50">🏛️</div>
        <div className="absolute bottom-20 right-10 text-6xl opacity-50">⚔️</div>
        <div className="absolute top-1/2 left-1/4 text-4xl opacity-30">🪙</div>
      </div>

      <div className="z-10 flex flex-col items-center p-6 text-center max-w-md">
        <motion.h1 
          className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-2 filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          Paname City
        </motion.h1>
        
        <motion.p 
          className="text-lg text-muted-foreground mb-12 font-medium"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          La rue t'appelle. Construis ton empire.
        </motion.p>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full"
        >
          <Button 
            onClick={handlePlay} 
            disabled={isLoading}
            className="w-full h-20 text-3xl font-black uppercase tracking-widest rounded-2xl bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-white border-4 border-yellow-500 shadow-[0_8px_0_rgb(202,138,4),0_15px_20px_rgba(0,0,0,0.4)] transition-all active:translate-y-2 active:shadow-[0_0px_0_rgb(202,138,4),0_0px_0px_rgba(0,0,0,0.4)]"
          >
            {isLoading ? "CHARGEMENT..." : "JOUER"}
          </Button>
        </motion.div>

        {!isAuthenticated && (
          <p className="mt-6 text-sm text-yellow-400/80 animate-pulse">
            ⚠️ Rejoins un salon vocal!
          </p>
        )}

        <Button 
          variant="ghost" 
          onClick={() => setShowCredits(true)}
          className="mt-8 text-muted-foreground hover:text-white uppercase tracking-widest text-xs"
        >
          Crédits
        </Button>
      </div>

      <AnimatePresence>
        {showCredits && (
          <motion.div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCredits(false)}
          >
            <motion.div 
              className="bg-card border-2 border-primary rounded-xl p-8 max-w-sm text-center shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-lg font-medium text-foreground leading-relaxed">
                Immaginé, Créé, conçu et développé par Sally avec amour, pour le serveur discord.gg/paname en 2026
              </p>
              <Button 
                onClick={() => setShowCredits(false)}
                className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Fermer
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
