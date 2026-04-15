import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/lib/discord";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import Home from "@/pages/Home";
import Loading from "@/pages/Loading";
import Game from "@/pages/Game";
import Raid from "@/pages/Raid";
import Shop from "@/pages/Shop";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

setAuthTokenGetter(() => localStorage.getItem("paname_token"));

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/loading" component={Loading} />
      <Route path="/game" component={Game} />
      <Route path="/raid" component={Raid} />
      <Route path="/shop" component={Shop} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster theme="dark" position="top-center" richColors />
        </TooltipProvider>
      </GameProvider>
    </QueryClientProvider>
  );
}

export default App;
