import { useLocation, useSearch } from 'wouter';
import { useEffect, useRef, useState } from 'react';
import { useSendMessage, getGetMailboxSummaryQueryKey, getListMessagesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import bs58 from 'bs58';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

const composeSchema = z.object({
  recipientWallet: z.string().refine((val) => {
    try {
      const decoded = bs58.decode(val);
      return decoded.length === 32; // Solana pubkey is 32 bytes
    } catch {
      return false;
    }
  }, {
    message: "THAT ADDRESS DOESN'T LOOK RIGHT."
  }),
  body: z.string().min(1, "CANNOT SEND EMPTY MAIL.").max(4000, "MAIL TOO LONG."),
});

export default function Compose() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryParams = new URLSearchParams(search);
  const replyToId = queryParams.get('replyTo');
  const prefillTo = queryParams.get('to');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sendMessage = useSendMessage();

  const [isSending, setIsSending] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel a pending post-send navigation if the user leaves this screen
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const form = useForm<z.infer<typeof composeSchema>>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      recipientWallet: prefillTo || '',
      body: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof composeSchema>) => {
    try {
      setIsSending(true);
      await sendMessage.mutateAsync({
        data: {
          recipientWallet: values.recipientWallet,
          body: values.body,
          replyToMessageId: replyToId || undefined
        }
      });
      
      toast({ title: "MAIL SENT." });
      queryClient.invalidateQueries({ queryKey: getGetMailboxSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
      
      const navigateAway = () => {
        if (replyToId) {
          window.history.back();
        } else {
          setLocation('/mailbox/sent');
        }
      };

      // Reduced-motion users navigate immediately; otherwise let the
      // envelope-departure animation play out first
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        navigateAway();
      } else {
        navTimerRef.current = setTimeout(navigateAway, 600);
      }
      
    } catch (e: any) {
      setIsSending(false);
      toast({ title: "RETURN TO SENDER", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="h-16 flex items-center justify-between px-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2 active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="font-bold text-sm tracking-widest text-muted-foreground uppercase">
          {replyToId ? 'WRITE REPLY' : 'NEW MAIL'}
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col">
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-500",
          isSending && "translate-y-[-100vh] opacity-0 scale-95"
        )}>
          
          {!replyToId && (
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl mb-6 flex items-start gap-3 animate-in fade-in">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-foreground mb-1">ANY WALLET CAN RECEIVE MAIL.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Send to any valid Solana address. Even if they've never opened their mailbox yet, it will be waiting for them.
                </p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-6 bg-white dark:bg-card border-2 border-border shadow-sm p-5 rounded-sm relative">
              
              {/* Envelope flap aesthetic */}
              <div className="absolute top-0 left-0 w-full h-0 border-b-[20px] border-b-border/10 border-l-[100px] border-l-transparent border-r-[100px] border-r-transparent opacity-50 rotate-180 origin-top pointer-events-none" />

              <FormField
                control={form.control}
                name="recipientWallet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">TO (ADDRESS)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Paste a Solana address..." 
                        className={cn(
                          "h-14 rounded-none border-0 border-b-2 border-border/50 bg-transparent text-base font-mono focus-visible:ring-0 px-0 rounded-none shadow-none",
                          replyToId && "opacity-60 pointer-events-none"
                        )}
                        readOnly={!!replyToId}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="font-bold text-xs tracking-widest" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col">
                    <FormLabel className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">MESSAGE</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your message here..." 
                        className="flex-1 min-h-[200px] resize-none rounded-none border-0 bg-transparent text-base leading-relaxed p-0 focus-visible:ring-0 shadow-none font-serif"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="font-bold text-xs tracking-widest" />
                  </FormItem>
                )}
              />

              <div className="mt-auto pt-6">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 rounded-full text-base font-bold tracking-widest shadow-xl hover-elevate active:scale-95 transition-all"
                  disabled={sendMessage.isPending || isSending}
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Send className="w-5 h-5 mr-2 -ml-1" />
                  )}
                  {isSending ? 'SENDING...' : 'SEND MAIL'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
