import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import {
  useCreateAuthChallenge,
  useVerifyAuthSignature,
  useGetSession,
  getGetSessionQueryKey,
  useLogout,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useAuthFlow() {
  const { signMessage, disconnect, publicKey, select, wallets, connected } = useWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createChallenge = useCreateAuthChallenge();
  const verifySignature = useVerifyAuthSignature();
  const logoutMutation = useLogout();

  const { data: session, isLoading: isSessionLoading } = useGetSession();

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const signIn = useCallback(async () => {
    if (!publicKey) {
      toast({ title: "No wallet connected", variant: "destructive" });
      return;
    }
    if (!signMessage) {
      toast({ title: "Wallet does not support signing", variant: "destructive" });
      return;
    }

    try {
      setIsAuthenticating(true);
      const walletAddress = publicKey.toBase58();

      // 1. Get challenge
      const challenge = await createChallenge.mutateAsync({
        data: { wallet: walletAddress },
      });

      // 2. Sign message
      const encodedMessage = new TextEncoder().encode(challenge.message);
      const signature = await signMessage(encodedMessage);

      // 3. Verify signature
      await verifySignature.mutateAsync({
        data: {
          wallet: walletAddress,
          nonce: challenge.nonce,
          signature: bs58.encode(signature),
        },
      });

      // 4. Update session
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      toast({ title: "Signed in successfully" });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Sign in failed", 
        description: err?.message || "Could not verify wallet signature.",
        variant: "destructive" 
      });
      disconnect(); // Disconnect if auth fails to stay consistent
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage, createChallenge, verifySignature, queryClient, disconnect, toast]);

  const signOut = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
      await disconnect();
      queryClient.setQueryData(getGetSessionQueryKey(), { wallet: null, authenticated: false });
      queryClient.clear();
      toast({ title: "Signed out" });
    } catch (err) {
      console.error(err);
    }
  }, [logoutMutation, disconnect, queryClient, toast]);

  return {
    session,
    isSessionLoading,
    isAuthenticating,
    signIn,
    signOut,
    wallets,
    select,
    connected,
    publicKey
  };
}
