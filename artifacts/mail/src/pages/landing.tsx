import { useState, useEffect, useRef } from 'react';
import { MailboxCharacter } from '@/components/mailbox-character';
import { Button } from '@/components/ui/button';
import { useAuthFlow } from '@/hooks/use-auth-flow';
import { Link, useLocation } from 'wouter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail, ShieldAlert } from 'lucide-react';

export default function Landing() {
  const { session, isAuthenticating, signIn, wallets, select, connected, publicKey } = useAuthFlow();
  const [, setLocation] = useLocation();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // If already authenticated, redirect to mailbox
  if (session?.authenticated) {
    setLocation('/mailbox');
    return null;
  }

  const handleCheckMail = () => {
    if (connected && publicKey) {
      signIn();
    } else {
      setShowWalletModal(true);
    }
  };

  const handleWalletSelect = async (walletName: string) => {
    select(walletName as any);
    setShowWalletModal(false);
  };

  // Auto-trigger sign in once wallet connects
  const hasAttemptedAutoSignIn = useRef(false);
  
  useEffect(() => {
    if (connected && publicKey && !session?.authenticated && !hasAttemptedAutoSignIn.current) {
      hasAttemptedAutoSignIn.current = true;
      signIn();
    }
  }, [connected, publicKey, session?.authenticated, signIn]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden bg-background">
      
      {/* Sun/Morning ambient light effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />

      <main className="z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
        
        <div className="mb-12 relative w-full flex justify-center -ml-4">
          <MailboxCharacter 
            flagUp={false} 
            className="w-56 h-72 md:w-64 md:h-80 drop-shadow-[0_20px_20px_rgba(0,0,0,0.15)] relative z-10" 
          />
          {/* Grounding shadow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/10 blur-md rounded-[100%] ml-4 z-0 translate-y-2" />
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-10 text-foreground">
          Every wallet has an address.<br />
          <span className="text-accent">Now it has a mailbox.</span>
        </h1>

        <Button 
          size="lg" 
          className="w-full h-16 text-lg rounded-2xl font-bold tracking-wide shadow-xl active:scale-95 transition-transform"
          onClick={handleCheckMail}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
          ) : (
            <Mail className="w-6 h-6 mr-2" />
          )}
          {isAuthenticating ? 'UNLOCKING...' : 'CHECK MY MAIL'}
        </Button>
      </main>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold">Open your mailbox</DialogTitle>
            <DialogDescription className="text-base">
              Connect your wallet to check your mail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3">
            {wallets.filter(w => w.readyState === 'Installed' || w.readyState === 'Loadable').length > 0 ? (
              wallets.map((wallet) => (
                <Button
                  key={wallet.adapter.name}
                  variant="outline"
                  size="lg"
                  className="w-full h-16 justify-start text-lg rounded-xl border-2 hover:border-primary hover:bg-primary/5"
                  onClick={() => handleWalletSelect(wallet.adapter.name)}
                >
                  <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-8 h-8 mr-4" />
                  {wallet.adapter.name}
                </Button>
              ))
            ) : (
              <div className="bg-muted p-6 rounded-2xl text-center flex flex-col items-center">
                <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-bold text-lg mb-2">No Wallet Found</h3>
                <p className="text-muted-foreground mb-4">
                  It looks like you don't have a Solana wallet installed in this browser.
                </p>
                <a href="https://phantom.app" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">
                  Get Phantom Wallet
                </a>
              </div>
            )}
            
            <div className="mt-4 bg-secondary/30 p-4 rounded-xl text-sm text-muted-foreground text-center">
              <p className="font-semibold text-foreground mb-1">This proves this mailbox belongs to you.</p>
              <p>No SOL will move. No transaction will be submitted.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
