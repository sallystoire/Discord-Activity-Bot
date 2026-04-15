import { Link, useLocation } from "wouter";
import { useGetKingdom } from "@workspace/api-client-react";
import { useGameContext } from "@/lib/discord";
import { motion } from "framer-motion";

export function GameLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: kingdom } = useGetKingdom();
  const { logout } = useGameContext();

  const navItems = [
    { href: "/game", label: "Village", icon: "🏛️" },
    { href: "/raid", label: "Raid", icon: "⚔️" },
    { href: "/shop", label: "Shop", icon: "💎" },
    { href: "/leaderboard", label: "Classement", icon: "🏆" },
    { href: "/profile", label: "Profil", icon: "👤" },
  ];

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Resource Bar */}
      <header className="flex-none p-2 bg-card border-b border-card-border shadow-md z-10 flex flex-wrap gap-2 justify-between items-center text-sm font-game sticky top-0">
        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-full border border-border">
            <span>🪙</span> <span className="font-bold text-yellow-400">{kingdom?.gold ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-full border border-border">
            <span>💧</span> <span className="font-bold text-fuchsia-400">{kingdom?.elixir ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-full border border-border">
            <span>💎</span> <span className="font-bold text-cyan-400">{kingdom?.diamonds ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-full border border-border">
            <span>🏆</span> <span className="font-bold text-amber-400">{kingdom?.trophies ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-none bg-card border-t border-card-border shadow-lg p-2 pb-safe flex justify-around z-10">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                  isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
