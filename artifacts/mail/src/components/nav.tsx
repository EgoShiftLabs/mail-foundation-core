import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Mail, Settings, PenSquare, Inbox, ShieldQuestion, Trash2, Send, Package, Menu } from 'lucide-react';
import { useGetMailboxSummary, getGetMailboxSummaryQueryKey } from '@workspace/api-client-react';
import mailboxImage from '@/assets/mailbox-hero.webp';
import { useEffect, useState } from 'react';

export function TopNav() {
  const [location] = useLocation();
  const { data: summary } = useGetMailboxSummary({ query: { queryKey: getGetMailboxSummaryQueryKey(), refetchInterval: 15000 } });

  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (summary?.hasNewMail) {
      setHasNew(true);
    } else {
      setHasNew(false);
    }
  }, [summary?.hasNewMail]);

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-md mx-auto w-full px-4 h-16 flex items-center justify-between">
        
        <Link href="/mailbox" className="flex items-center gap-3 active:scale-95 transition-transform">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <img 
              src={mailboxImage} 
              alt="Mailbox" 
              className={cn(
                "w-full h-full object-contain drop-shadow-sm transition-transform duration-300",
                hasNew ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""
              )}
            />
            {hasNew && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background animate-pulse" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight leading-none text-foreground">$MAIL</span>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase leading-none mt-0.5">Post Office</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-2">
          <Link 
            href="/compose" 
            className={cn(
              "p-2.5 rounded-full transition-all active:scale-95",
              location === '/compose' ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted text-muted-foreground hover:text-foreground bg-card border border-border/50"
            )}
          >
            <PenSquare className="w-5 h-5" />
          </Link>
          <Link 
            href="/settings" 
            className={cn(
              "p-2.5 rounded-full transition-all active:scale-95",
              location === '/settings' ? "bg-foreground text-background shadow-md" : "hover:bg-muted text-muted-foreground hover:text-foreground bg-card border border-border/50"
            )}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function BottomNav({ currentFolder }: { currentFolder: string }) {
  const { data: summary } = useGetMailboxSummary({ query: { queryKey: getGetMailboxSummaryQueryKey(), refetchInterval: 15000 } });
  
  const tabs = [
    { id: 'mailbox', label: 'MAILBOX', icon: Inbox, count: summary?.mailboxUnread || 0 },
    { id: 'requests', label: 'REQUESTS', icon: ShieldQuestion, count: summary?.requestsCount || 0 },
    { id: 'junk', label: 'JUNK', icon: Trash2, count: summary?.junkCount || 0 },
    { id: 'sent', label: 'SENT', icon: Send, count: 0 },
    { id: 'porch', label: 'PORCH', icon: Package, count: 0, muted: true },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="max-w-md mx-auto w-full px-2 py-2 flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentFolder === tab.id;
          
          return (
            <Link
              key={tab.id}
              href={`/mailbox/${tab.id === 'mailbox' ? '' : tab.id}`}
              className={cn(
                "flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                tab.muted && !isActive && "opacity-50"
              )}
              title={tab.muted ? "Coming later" : undefined}
            >
              <div className="relative">
                <Icon className={cn("w-6 h-6 mb-1", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                {tab.count > 0 && (
                  <span className={cn(
                    "absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none min-w-[16px] text-center",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground text-background"
                  )}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </div>
              <span className={cn("text-[9px] font-bold tracking-widest", isActive ? "text-primary" : "")}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
