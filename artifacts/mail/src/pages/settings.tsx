import { useLocation } from 'wouter';
import { useState } from 'react';
import { 
  useGetPreferences, 
  useUpdatePreferences, 
  useListBlockedWallets,
  useUnblockWallet,
  getGetPreferencesQueryKey,
  getListBlockedWalletsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, LogOut, Ban, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthFlow } from '@/hooks/use-auth-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  RadioGroup, 
  RadioGroupItem 
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { signOut, publicKey } = useAuthFlow();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('mail_sound_enabled') === 'true';
  });

  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('mail_sound_enabled', String(enabled));
  };

  const { data: prefs, isLoading: isPrefsLoading } = useGetPreferences();
  const updatePrefs = useUpdatePreferences();

  const { data: blocked, isLoading: isBlockedLoading } = useListBlockedWallets();
  const unblockWallet = useUnblockWallet();

  const handleUpdateHandling = async (val: string) => {
    try {
      await updatePrefs.mutateAsync({ 
        data: { unknownSenderHandling: val as any }
      });
      queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() });
      toast({ title: "PREFERENCES UPDATED" });
    } catch (e: any) {
      toast({ title: "UPDATE FAILED", description: e.message, variant: "destructive" });
    }
  };

  const handleUnblock = async (wallet: string) => {
    try {
      await unblockWallet.mutateAsync({ wallet });
      queryClient.invalidateQueries({ queryKey: getListBlockedWalletsQueryKey() });
      toast({ title: "WALLET UNBLOCKED" });
    } catch (e: any) {
      toast({ title: "FAILED TO UNBLOCK", description: e.message, variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation('/');
  };

  const truncateWallet = (wallet: string) => `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;

  const [showFullWallet, setShowFullWallet] = useState(false);
  const copyWallet = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast({ title: "COPIED TO CLIPBOARD" });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2 active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="font-bold text-sm tracking-widest text-muted-foreground uppercase">
          SETTINGS
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-10 pb-20">
        
        {/* Connected Wallet Info */}
        <section className="bg-card border border-border/50 p-6 rounded-3xl flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-bold text-lg mb-1">CONNECTED WALLET</h2>
          
          <div className="flex flex-col items-center mb-6 w-full">
            <p className="font-mono text-sm text-foreground bg-muted px-3 py-2 rounded-md break-all max-w-full font-bold">
              {publicKey && (showFullWallet ? publicKey.toBase58() : truncateWallet(publicKey.toBase58()))}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={copyWallet} className="text-[10px] font-bold tracking-widest">
                COPY
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFullWallet(!showFullWallet)} className="text-[10px] font-bold tracking-widest">
                {showFullWallet ? "HIDE FULL" : "VIEW FULL"}
              </Button>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full rounded-xl border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            SIGN OUT
          </Button>
        </section>

        {/* Local Preferences */}
        <section>
          <h2 className="font-bold text-xs tracking-widest text-muted-foreground mb-4 pl-2 uppercase">Local Preferences</h2>
          <div className="bg-card border border-border/50 rounded-3xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-sm mb-0.5">Sound Effects</span>
              <span className="text-xs text-muted-foreground font-normal">Play satisfying postal sounds.</span>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="font-bold text-xs tracking-widest text-muted-foreground mb-4 pl-2">UNKNOWN SENDERS</h2>
          
          {isPrefsLoading ? (
            <div className="h-32 flex items-center justify-center bg-card rounded-3xl border border-border/50">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden p-2 shadow-sm">
              <RadioGroup 
                value={prefs?.unknownSenderHandling} 
                onValueChange={handleUpdateHandling}
                className="flex flex-col gap-0"
              >
                {[
                  { value: 'requests', title: 'Requests', desc: 'Held in the Requests folder until accepted.' },
                  { value: 'mailbox', title: 'Direct to Mailbox', desc: 'All mail goes straight to your inbox.' },
                  { value: 'junk', title: 'Send to Junk', desc: 'Unknown senders go directly to junk.' }
                ].map((opt, i) => (
                  <div key={opt.value} className={cn(
                    "flex items-center space-x-3 p-4 rounded-2xl transition-colors cursor-pointer",
                    prefs?.unknownSenderHandling === opt.value ? "bg-primary/5" : "hover:bg-muted/50"
                  )}>
                    <RadioGroupItem value={opt.value} id={opt.value} className="mt-1" />
                    <Label htmlFor={opt.value} className="flex flex-col cursor-pointer flex-1">
                      <span className="font-bold text-sm mb-0.5">{opt.title}</span>
                      <span className="text-xs text-muted-foreground font-normal leading-relaxed">{opt.desc}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </section>

        {/* Blocked Wallets */}
        <section>
          <h2 className="font-bold text-xs tracking-widest text-muted-foreground mb-4 pl-2">BLOCKED WALLETS</h2>
          
          {isBlockedLoading ? (
            <div className="h-24 flex items-center justify-center bg-card rounded-3xl border border-border/50">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !blocked || blocked.length === 0 ? (
            <div className="bg-card border border-border/50 p-6 rounded-3xl flex flex-col items-center text-center shadow-sm">
              <Ban className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm font-bold text-muted-foreground">NO BLOCKED WALLETS</p>
            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden divide-y divide-border/50 shadow-sm">
              {blocked.map((b) => (
                <div key={b.wallet} className="flex items-center justify-between p-4">
                  <span className="font-mono text-sm">{truncateWallet(b.wallet)}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleUnblock(b.wallet)}
                    className="text-xs font-bold tracking-widest rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    UNBLOCK
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
