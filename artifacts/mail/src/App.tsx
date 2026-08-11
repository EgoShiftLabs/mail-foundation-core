import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { SolanaProvider } from '@/components/solana-provider';
import { useAuthFlow } from '@/hooks/use-auth-flow';
import Landing from '@/pages/landing';
import Mailbox from '@/pages/mailbox';
import MessageRead from '@/pages/message-read';
import Compose from '@/pages/compose';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

// AuthGuard protects internal routes
function AuthGuard({ children }: { children: ReactNode }) {
  const { session, isSessionLoading } = useAuthFlow();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isSessionLoading && (!session || !session.authenticated)) {
      setLocation('/');
    }
  }, [session, isSessionLoading, setLocation]);

  if (isSessionLoading || !session?.authenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full mb-4" />
          <p className="text-muted-foreground font-medium tracking-wide text-sm">CHECKING POST...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        
        {/* Protected Routes */}
        <Route path="/mailbox">
          <AuthGuard><Mailbox /></AuthGuard>
        </Route>
        <Route path="/mailbox/:folder">
          <AuthGuard><Mailbox /></AuthGuard>
        </Route>
        <Route path="/message/:id">
          <AuthGuard><MessageRead /></AuthGuard>
        </Route>
        <Route path="/compose">
          <AuthGuard><Compose /></AuthGuard>
        </Route>
        <Route path="/settings">
          <AuthGuard><Settings /></AuthGuard>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SolanaProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </SolanaProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
