import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function Loading() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / steps) * 100, 100));

      if (currentStep >= steps) {
        clearInterval(timer);
        setLocation("/game");
      }
    }, interval);

    return () => clearInterval(timer);
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background relative overflow-hidden font-game">
      <div className="z-10 flex flex-col items-center p-6 text-center w-full max-w-md">
        <motion.h1 
          className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-12 filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Paname City
        </motion.h1>

        <div className="w-full px-4 mb-4">
          <Progress value={progress} className="h-6 rounded-full bg-black/50 border-2 border-yellow-600 [&>div]:bg-gradient-to-r [&>div]:from-yellow-500 [&>div]:to-yellow-300" />
        </div>

        <p className="text-yellow-400 font-bold tracking-widest text-sm animate-pulse">
          CHARGEMENT DU VILLAGE...
        </p>
      </div>
    </div>
  );
}
