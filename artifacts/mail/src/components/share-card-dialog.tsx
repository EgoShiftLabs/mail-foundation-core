import { useState } from 'react';
import {
  useGetShareCard,
  useGetMessage,
  getGetShareCardQueryKey,
  getGetMessageQueryKey,
} from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Share, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import mailboxImage from '@/assets/mailbox-hero.webp';

interface ShareCardDialogProps {
  messageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCardDialog({ messageId, open, onOpenChange }: ShareCardDialogProps) {
  const { data: shareCard } = useGetShareCard(messageId, {
    query: { queryKey: getGetShareCardQueryKey(messageId), enabled: open }
  });
  
  const { data: fullMessage } = useGetMessage(messageId, {
    query: { queryKey: getGetMessageQueryKey(messageId), enabled: open }
  });

  const [revealed, setRevealed] = useState(false);
  
  if (!shareCard) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl p-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </DialogContent>
      </Dialog>
    );
  }

  const handleShare = async () => {
    // In a real app we'd use html2canvas + Web Share API
    // For now we just close or show a toast
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden bg-background/95 backdrop-blur border-border/50">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-center font-bold text-lg tracking-widest">DELIVERY RECEIPT</DialogTitle>
        </DialogHeader>

        {/* The Card Element (Target for screenshotting) */}
        <div className="relative bg-white text-black p-6 rounded-2xl shadow-2xl border-4 border-black/5 mx-2 my-4 aspect-[4/5] flex flex-col justify-between overflow-hidden">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start border-b-2 border-black/10 pb-4 mb-4">
            <div className="flex flex-col">
              <span className="font-bold text-2xl tracking-tighter">$MAIL</span>
              <span className="text-[10px] font-bold tracking-widest opacity-40 uppercase">Solana Postal Service</span>
            </div>
            <img src={mailboxImage} alt="Mailbox Logo" className="w-12 h-12 object-contain" />
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-center px-4 py-8">
            <h2 className="text-4xl font-extrabold tracking-tighter mb-4 uppercase text-foreground">
              {shareCard.headline}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <span className="text-[10px] font-bold tracking-widest px-2 py-1 bg-muted rounded-full uppercase border border-border">
                {shareCard.deliveryType}
              </span>
              {shareCard.senderVerified && (
                <span className="text-[10px] font-bold tracking-widest px-2 py-1 bg-accent text-accent-foreground rounded-full uppercase border border-accent">
                  SIGNED ✓
                </span>
              )}
            </div>

            <div className="flex flex-col items-center mb-6">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">FROM</span>
              <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded text-foreground font-bold">
                {fullMessage ? `${fullMessage.senderWallet.slice(0, 4)}...${fullMessage.senderWallet.slice(-4)}` : "UNKNOWN"}
              </span>
            </div>

            <div className={cn(
              "w-full rounded-sm p-6 transition-all duration-500 border-2",
              revealed ? "bg-white text-left border-border/50 shadow-sm" : "bg-card border-dashed border-border/50 text-foreground flex flex-col items-center justify-center min-h-[120px]"
            )}>
              {revealed ? (
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words font-serif italic text-black/90">
                  "{fullMessage?.body}"
                </p>
              ) : (
                <>
                  <Lock className="w-6 h-6 mb-2 opacity-50" />
                  <span className="font-bold tracking-widest text-sm opacity-80">MESSAGE: PRIVATE</span>
                </>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t-2 border-black/10 pt-4 mt-4 flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest opacity-40">RECEIVED</span>
              <span className="text-xs font-bold font-mono">{format(new Date(shareCard.receivedAt), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold tracking-widest opacity-40">REF</span>
              <span className="text-xs font-bold font-mono">{shareCard.messageId.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl font-bold tracking-widest border-2"
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? (
              <><Lock className="w-4 h-4 mr-2" /> HIDE MESSAGE</>
            ) : (
              <><Unlock className="w-4 h-4 mr-2" /> REVEAL MESSAGE</>
            )}
          </Button>
          
          <Button 
            className="w-full h-14 rounded-xl font-bold tracking-widest text-lg shadow-xl hover-elevate active:scale-95"
            onClick={handleShare}
          >
            <Share className="w-5 h-5 mr-2 -ml-1" />
            SHARE RECEIPT
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
