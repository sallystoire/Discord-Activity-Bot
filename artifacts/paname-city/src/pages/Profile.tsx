import { useState } from "react";
import { GameLayout } from "@/components/layout/GameLayout";
import {
  useGetProfile,
  useRedeemCode,
  getGetProfileQueryKey,
  getGetKingdomQueryKey,
} from "@workspace/api-client-react";
import { useGameContext } from "@/lib/discord";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

function getAvatar(avatar: string | null | undefined, userId: string) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(userId)}&background=4a5568&color=fff&size=128`;
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetProfile();
  const { user } = useGameContext();
  const redeemCode = useRedeemCode();
  const [code, setCode] = useState("");

  const handleRedeem = () => {
    if (!code.trim()) return;
    redeemCode.mutate({ data: { code: code.trim().toUpperCase() } }, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(result.message ?? "Code valide !");
          setCode("");
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetKingdomQueryKey() });
        } else {
          toast.error(result.message ?? "Code invalide");
        }
      },
      onError: () => {
        toast.error("Erreur lors de la vérification du code");
      },
    });
  };

  const userId = user?.id ?? "unknown";

  return (
    <GameLayout>
      <div className="min-h-full p-4">
        <h2 className="text-2xl font-black text-center text-yellow-400 uppercase tracking-widest mb-4 drop-shadow">
          Profil
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 rounded-2xl bg-card animate-pulse" />
            <div className="h-48 rounded-2xl bg-card animate-pulse" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <motion.div
              className="bg-card border border-card-border rounded-2xl p-6 flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <img
                src={getAvatar(profile.avatar, userId)}
                alt={profile.username}
                className="w-20 h-20 rounded-full border-4 border-primary shadow-lg"
                data-testid="img-avatar"
              />
              <div className="text-center">
                <h3 className="text-xl font-black text-white" data-testid="text-username">
                  {profile.username}
                </h3>
                <p className="text-primary font-bold">Hotel de Ville Niv.{profile.townHallLevel}</p>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-amber-400" data-testid="text-trophies">{profile.trophies}</p>
                  <p className="text-xs text-muted-foreground">Trophées</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-green-400">{profile.winsCount}</p>
                  <p className="text-xs text-muted-foreground">Victoires</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-blue-400">{profile.totalAttacks}</p>
                  <p className="text-xs text-muted-foreground">Attaques</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-card border border-card-border rounded-2xl p-4 space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="font-black text-white uppercase tracking-wider text-sm">Ressources</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-background/50 rounded-xl p-3 text-center border border-border">
                  <p className="text-lg">🪙</p>
                  <p className="font-black text-yellow-400" data-testid="text-gold">{profile.gold}</p>
                  <p className="text-xs text-muted-foreground">Or</p>
                </div>
                <div className="bg-background/50 rounded-xl p-3 text-center border border-border">
                  <p className="text-lg">💧</p>
                  <p className="font-black text-fuchsia-400" data-testid="text-elixir">{profile.elixir}</p>
                  <p className="text-xs text-muted-foreground">Elixir</p>
                </div>
                <div className="bg-background/50 rounded-xl p-3 text-center border border-border">
                  <p className="text-lg">💎</p>
                  <p className="font-black text-cyan-400" data-testid="text-diamonds">{profile.diamonds}</p>
                  <p className="text-xs text-muted-foreground">Diamants</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-card border border-card-border rounded-2xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="font-black text-white uppercase tracking-wider text-sm mb-3">Code Ressource</h4>
              <p className="text-xs text-muted-foreground mb-3">Entre un code reçu sur le serveur pour obtenir des ressources.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={12}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-white font-mono font-bold text-center uppercase tracking-widest focus:outline-none focus:border-primary"
                  data-testid="input-code"
                  onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                />
                <Button
                  onClick={handleRedeem}
                  disabled={redeemCode.isPending || !code.trim()}
                  className="bg-gradient-to-b from-green-400 to-green-600 text-white font-bold px-4 rounded-xl border-2 border-green-800 shadow-[0_4px_0_#166534] active:shadow-none active:translate-y-1"
                  data-testid="button-redeem"
                >
                  Valider
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Profil introuvable.
          </div>
        )}
      </div>
    </GameLayout>
  );
}
