import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { 
  useGetMessageThread, 
  useOpenMessage, 
  useAcceptMessage, 
  useJunkMessage, 
  useBlockWallet,
  useReportSender,
  getGetMailboxSummaryQueryKey,
  getListMessagesQueryKey,
  getGetMessageThreadQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Inbox, ShieldAlert, Trash2, Reply, Share, Ban, Loader2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { ShareCardDialog } from '@/components/share-card-dialog';

export default function MessageRead() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);

  const { data: thread, isLoading } = useGetMessageThread(id as string, {
    query: { queryKey: getGetMessageThreadQueryKey(id as string), enabled: !!id }
  });

  const openMessage = useOpenMessage();
  const acceptMessage = useAcceptMessage();
  const junkMessage = useJunkMessage();
  const blockWallet = useBlockWallet();
  const reportSender = useReportSender();
  
  const openedRef = useRef(new Set<string>());

  // Open unread messages in thread
  useEffect(() => {
    if (thread) {
      thread.forEach(msg => {
        if (!msg.isOutgoing && msg.status !== 'opened' && !openedRef.current.has(msg.id)) {
          openedRef.current.add(msg.id);
          openMessage.mutate({ id: msg.id }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetMailboxSummaryQueryKey() });
              queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
            }
          });
        }
      });
    }
  }, [thread, openMessage, queryClient]);

  const targetMessage = thread?.find(m => m.id === id) || thread?.[thread.length - 1];

  const handleAction = async (action: any, successMessage: string) => {
    try {
      await action.mutateAsync({ id: id as string });
      toast({ title: successMessage });
      queryClient.invalidateQueries({ queryKey: getGetMailboxSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMessageThreadQueryKey(id as string) });
      setLocation('/mailbox');
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    }
  };

  const truncateWallet = (wallet: string) => `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <header className="h-16 flex items-center px-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur z-10">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!thread || thread.length === 0 || !targetMessage) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background items-center justify-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="font-bold text-lg">MAIL NOT FOUND</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation('/mailbox')}>RETURN TO MAILBOX</Button>
      </div>
    );
  }

  const isRequestOrJunk = targetMessage.folder === 'requests' || targetMessage.folder === 'junk';
  const showWarning = targetMessage.containsUrl && !targetMessage.isOutgoing && isRequestOrJunk;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2 active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="font-bold text-sm tracking-widest text-muted-foreground">CORRESPONDENCE</div>
        <div className="w-10 flex justify-end">
          {!targetMessage?.isOutgoing && (
            <Button variant="ghost" size="icon" onClick={() => setShareOpen(true)} className="active:scale-95 text-primary hover:bg-primary/10">
              <Share className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-6">
        
        {showWarning && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-destructive mb-1">SUSPICIOUS PACKAGE</p>
              <p className="text-sm text-destructive/90 leading-relaxed mb-2">
                This mail from an unknown sender contains links to: 
                <span className="font-mono bg-background/50 px-1 rounded mx-1">{targetMessage.urlDomains.join(', ')}</span>
              </p>
              <p className="text-xs text-destructive/70 font-semibold uppercase tracking-widest">Proceed with extreme caution.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 pb-32">
          {thread.map((msg, i) => {
            const isMe = msg.isOutgoing;
            return (
              <div 
                key={msg.id} 
                className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 100}ms`, animationDuration: '400ms' }}
              >
                <div className={cn(
                  "w-full bg-white dark:bg-card text-black dark:text-card-foreground border border-border/50 shadow-md p-8 relative",
                  isMe ? "border-t-8 border-t-muted rounded-b-sm" : "border-t-8 border-t-primary rounded-b-sm"
                )}>
                  <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">
                        {isMe ? 'SENDER' : 'FROM'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-mono">
                          {isMe ? 'You' : truncateWallet(msg.senderWallet)}
                        </span>
                        {!isMe && msg.senderVerified && (
                          <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 bg-accent text-accent-foreground rounded-sm uppercase">
                            SIGNED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">
                        DATE
                      </span>
                      <span className="text-xs font-bold">
                        {format(new Date(msg.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-base leading-relaxed whitespace-pre-wrap font-serif text-foreground/90">
                    {msg.body}
                  </div>
                  
                  {isMe && msg.status !== 'addressed' && (
                    <div className="mt-6 text-[10px] font-bold tracking-widest opacity-50 uppercase text-right">
                      STATUS: {msg.status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Action Bar */}
      {!targetMessage.isOutgoing && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border/50 p-4 safe-area-bottom z-20">
          <div className="max-w-md mx-auto flex flex-wrap items-center justify-center gap-2">
            
            <Button 
              size="lg" 
              className="rounded-full shadow-md hover-elevate active:scale-95"
              onClick={() => setLocation(`/compose?replyTo=${targetMessage.id}&to=${targetMessage.senderWallet}`)}
            >
              <Reply className="w-4 h-4 mr-2" />
              REPLY
            </Button>

            {isRequestOrJunk && (
              <Button 
                size="lg" 
                variant="secondary"
                className="rounded-full shadow-md active:scale-95"
                onClick={() => handleAction(acceptMessage, "Moved to Mailbox")}
                disabled={acceptMessage.isPending}
              >
                <Inbox className="w-4 h-4 mr-2" />
                ACCEPT
              </Button>
            )}

            {targetMessage.folder !== 'junk' && (
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full active:scale-95 border-border"
                onClick={() => handleAction(junkMessage, "Moved to Junk")}
                disabled={junkMessage.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <Button 
              size="lg" 
              variant="outline"
              className="rounded-full active:scale-95 border-border text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => {
                if(confirm("Block this wallet? They won't know they are blocked, but their mail will bounce.")) {
                  blockWallet.mutate({ data: { wallet: targetMessage.senderWallet } }, {
                    onSuccess: () => {
                      toast({ title: "Sender Blocked" });
                      setLocation('/mailbox');
                    }
                  });
                }
              }}
            >
              <Ban className="w-4 h-4" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="rounded-full active:scale-95 border-border text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => {
                const reason = prompt("Report this sender? Please enter a reason (spam, scam, abuse):");
                if(reason) {
                  reportSender.mutate({ data: { messageId: targetMessage.id, reason } }, {
                    onSuccess: () => {
                      toast({ title: "Sender Reported" });
                      setLocation('/mailbox');
                    }
                  });
                }
              }}
            >
              <Flag className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {targetMessage && (
        <ShareCardDialog 
          messageId={targetMessage.id} 
          open={shareOpen} 
          onOpenChange={setShareOpen} 
        />
      )}
    </div>
  );
}
