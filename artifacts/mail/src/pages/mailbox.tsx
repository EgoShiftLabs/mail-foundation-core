import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { TopNav, BottomNav } from '@/components/nav';
import { useListMessages, getListMessagesQueryKey, Folder } from '@workspace/api-client-react';
import { Loader2, PackageX, Trash2, Send, Package, ShieldQuestion } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { MailboxCharacter } from '@/components/mailbox-character';

export default function Mailbox() {
  const params = useParams();
  const folder = (params.folder as Folder) || 'mailbox';
  const [, setLocation] = useLocation();

  const { data: messages, isLoading, error } = useListMessages({ folder }, { 
    query: { 
      queryKey: getListMessagesQueryKey({ folder }),
      enabled: !!folder 
    } 
  });

  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending opening transition if the user leaves this screen
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const handleOpenMail = (id: string, alreadyOpened: boolean) => {
    if (animatingId) return; // a transition is already in flight
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Already-opened mail and reduced-motion users navigate immediately
    if (alreadyOpened || reduceMotion) {
      setLocation(`/message/${id}`);
      return;
    }
    setAnimatingId(id);
    navTimerRef.current = setTimeout(() => {
      setLocation(`/message/${id}`);
    }, 500); // 0.5s opening transition
  };

  const truncateWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-24">
      <TopNav />
      
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-bold tracking-widest text-sm uppercase">SORTING MAIL...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <PackageX className="w-12 h-12 text-destructive mb-4" />
            <p className="font-bold text-lg mb-1 tracking-widest uppercase">COULDN'T FETCH MAIL</p>
            <p className="text-muted-foreground text-sm">Something went wrong at the post office.</p>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center animate-in fade-in zoom-in duration-500">
            {folder === 'mailbox' ? (
              <div className="flex flex-col items-center opacity-80">
                <MailboxCharacter flagUp={false} className="w-40 h-56 mb-4 grayscale-[20%]" />
                <p className="font-bold text-xl tracking-tight mb-2 text-foreground uppercase">MAILBOX EMPTY.</p>
                <p className="text-muted-foreground font-medium">Nothing here but dust.</p>
              </div>
            ) : folder === 'requests' ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-card border border-border/50 shadow-sm rounded-full flex items-center justify-center mb-6 relative">
                  <ShieldQuestion className="w-10 h-10 text-muted-foreground absolute" />
                </div>
                <p className="font-bold text-xl tracking-tight mb-2 uppercase">NO REQUESTS.</p>
                <p className="text-muted-foreground font-medium">Everyone who writes you is known.</p>
              </div>
            ) : folder === 'junk' ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-card border border-border/50 shadow-sm rounded-full flex items-center justify-center mb-6 relative">
                  <Trash2 className="w-10 h-10 text-muted-foreground absolute" />
                </div>
                <p className="font-bold text-xl tracking-tight mb-2 uppercase">CLEAN SWEEP.</p>
                <p className="text-muted-foreground font-medium">No junk mail today.</p>
              </div>
            ) : folder === 'sent' ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-card border border-border/50 shadow-sm rounded-full flex items-center justify-center mb-6 relative">
                  <Send className="w-10 h-10 text-muted-foreground absolute ml-1" />
                </div>
                <p className="font-bold text-xl tracking-tight mb-2 uppercase">NOTHING SENT.</p>
                <p className="text-muted-foreground font-medium">You haven't written anyone yet.</p>
              </div>
            ) : (
               <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-card border border-border/50 shadow-sm rounded-full flex items-center justify-center mb-6 relative">
                  <Package className="w-10 h-10 text-muted-foreground absolute" />
                </div>
                <p className="font-bold text-xl tracking-tight mb-2 uppercase">COMING LATER.</p>
                <p className="text-muted-foreground font-medium">Packages need a little more room.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, idx) => {
              const isUnread = folder === 'mailbox' && msg.status !== 'opened';
              const isSent = folder === 'sent';
              const isJunk = folder === 'junk';
              const isRequest = folder === 'requests';
              
              return (
                <div 
                  key={msg.id}
                  onClick={() => handleOpenMail(msg.id, !isUnread)}
                  className={cn(
                    "group relative flex flex-col p-5 rounded-sm cursor-pointer transition-all duration-500",
                    "border-2 shadow-sm overflow-hidden",
                    animatingId === msg.id && "scale-105 opacity-0 z-50",
                    animatingId && animatingId !== msg.id && "opacity-50 scale-95 pointer-events-none",
                    !animatingId && "hover-elevate active:scale-95",
                    isUnread 
                      ? "bg-white border-primary/20 shadow-md" 
                      : isSent
                      ? "bg-muted/30 border-border/50 text-foreground"
                      : isJunk
                      ? "bg-card border-dashed border-border text-muted-foreground opacity-80 hover:opacity-100"
                      : "bg-card border-border shadow-sm text-foreground",
                    !animatingId && "animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                  )}
                  style={{ animationDelay: animatingId ? '0ms' : `${idx * 50}ms`, animationDuration: '400ms' }}
                >
                  {/* Envelope Flap Simulation for unread items */}
                  {isUnread && (
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-12 bg-primary/5 z-10 transition-transform duration-500 origin-top",
                      animatingId === msg.id ? "scale-y-[-1] bg-border/20" : ""
                    )} style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
                  )}
                  {isUnread && animatingId !== msg.id && (
                    <div className="absolute top-[34px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary shadow-sm z-10 transition-opacity duration-300" />
                  )}
                  
                  {/* Opened envelope simulation for read items */}
                  {!isUnread && !isSent && !isJunk && !isRequest && (
                    <div className="absolute top-0 left-0 w-full h-8 bg-border/10 opacity-50 rotate-180 origin-top" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
                  )}

                  <div className="relative z-20 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">
                          {isSent ? 'TO:' : 'FROM:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base font-mono tracking-tight text-foreground">
                            {isSent ? truncateWallet(msg.recipientWallet) : truncateWallet(msg.senderWallet)}
                          </span>
                          {msg.senderVerified && !isSent && (
                            <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 bg-accent text-accent-foreground rounded-sm uppercase">
                              SIGNED
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">
                          DATE:
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    <p className={cn(
                      "text-sm line-clamp-2 leading-relaxed mb-4 font-serif",
                      isUnread ? "text-black/80 font-medium" : "text-foreground/80"
                    )}>
                      {msg.body}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between">
                      {/* Folder / Status indicator */}
                      <span className={cn(
                        "text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm uppercase",
                        isSent && msg.status === 'opened' ? "bg-primary text-primary-foreground" : 
                        isSent && msg.status === 'delivered' ? "bg-accent/10 text-accent" : 
                        isRequest ? "bg-secondary text-secondary-foreground" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {isSent ? msg.status : isRequest ? 'REQUEST' : isJunk ? 'JUNK' : isUnread ? 'UNREAD' : 'OPENED'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav currentFolder={folder} />
    </div>
  );
}
