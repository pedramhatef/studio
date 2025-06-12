
"use client";

import type { MouseEvent } from 'react';
import { useState, useEffect, useCallback } from "react";
import { WalletInfo } from "@/components/WalletInfo";
import { TapSection } from "@/components/TapSection";
import { BoosterButton } from "@/components/BoosterButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  timestamp: number;
}

const BOOSTER_DURATION_MS = 60 * 1000; // 1 minute
const BOOSTER_COOLDOWN_MS = 60 * 1000; // 1 minute
const BOOSTER_ACTIVATION_BONUS = 10; // Immediate bonus points for activating booster
const LOCAL_STORAGE_SCORES_KEY = 'tapTonScores';
const TRANSACTION_TIMEOUT_MS = 30000; // 30 seconds for transaction timeout

export default function TapTonPage() {
  const [score, setScore] = useState(0);
  const [isBoosterActive, setIsBoosterActive] = useState(false);
  const [boosterEndTime, setBoosterEndTime] = useState<number | null>(null);
  const [boosterCooldownEndTime, setBoosterCooldownEndTime] = useState<number | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  
  const { toast } = useToast();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
    }
  }, []);

  const loadScore = useCallback((address: string): number => {
    if (typeof window === 'undefined') return 0;
    try {
      const storedScores = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
      if (storedScores) {
        const scores: Record<string, number> = JSON.parse(storedScores);
        return scores[address] || 0;
      }
    } catch (error) {
      console.error("Failed to load scores from local storage:", error);
    }
    return 0;
  }, []);

  const saveScore = useCallback((address: string, newScore: number) => {
    if (typeof window === 'undefined') return;
    try {
      const storedScores = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
      let scores: Record<string, number> = {};
      if (storedScores) {
        scores = JSON.parse(storedScores);
      }
      scores[address] = newScore;
      localStorage.setItem(LOCAL_STORAGE_SCORES_KEY, JSON.stringify(scores));
    } catch (error) {
      console.error("Failed to save score to local storage:", error);
    }
  }, []);

  useEffect(() => {
    if (wallet?.account?.address) {
      const userAddress = wallet.account.address;
      const loadedScore = loadScore(userAddress);
      setScore(loadedScore);
    } else {
      setScore(0); // Reset score if wallet disconnects or is not present initially
    }
  }, [wallet, loadScore]);

  const showFloatingText = useCallback((text: string, x: number, y: number) => {
    const newText: FloatingText = { id: Date.now(), text, x, y, timestamp: Date.now() };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== newText.id));
    }, 1500); 
  }, []);
  
  const handleTap = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const pointsPerTap = isBoosterActive ? 100 : 1;
    const newScore = score + pointsPerTap;
    setScore(newScore);

    if (wallet?.account?.address) {
      saveScore(wallet.account.address, newScore);
    }

    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left + Math.random() * 40 - 20; 
    const y = event.clientY - rect.top - 30 + Math.random() * 20 - 10; 
    
    showFloatingText(`+${pointsPerTap}`, x, y);

  }, [isBoosterActive, score, showFloatingText, wallet, saveScore]);

  const activateBooster = useCallback(async () => {
    if (!wallet) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your TON wallet to activate the booster.",
        variant: "destructive",
      });
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
      }
      return;
    }

    if (isBoosterActive || (boosterCooldownEndTime && boosterCooldownEndTime > Date.now()) || isTransactionPending) {
      return; 
    }

    setIsTransactionPending(true);

    // ========================================================================
    // START: TON TRANSACTION CUSTOMIZATION AREA
    // You need to provide the actual details for your smart contract interaction.
    // You can tell me these values, and I will update them in the code below.
    // ========================================================================
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      messages: [
        {
          // TODO: Replace with YOUR smart contract address.
          // Example: 'EQYourContractAddressHereToo'
          // You can provide this to me.
          address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // This is a "blackhole" address (effectively burns TON).
                                                                      // REPLACE THIS with your actual contract address.
          
          // TODO: Adjust the amount (in nanoTONs) as needed for your contract.
          // This might be for gas, or if your contract function requires a payment.
          // Example: '5000000' for 0.005 TON.
          // You can provide this to me.
          amount: '1000000', // 0.001 TON (in nanoTONs) - placeholder amount.
          
          // TODO: Add a `payload` if your smart contract interaction requires it.
          // The payload is a base64 encoded string representing the message body (BoC - Bag of Cells).
          // This is how you call specific functions on your smart contract.
          // Example: payload: 'te6ccgEBAQEAAgAAAA==' // Replace with your actual payload.
          // You will need to generate this using TON development tools.
          // You can provide this to me.
          // payload: 'YOUR_BASE64_ENCODED_PAYLOAD_HERE', 
        },
      ],
    };
    // ========================================================================
    // END: TON TRANSACTION CUSTOMIZATION AREA
    // ========================================================================
    
    let transactionTimer: NodeJS.Timeout | null = null;

    try {
      const transactionPromise = tonConnectUI.sendTransaction(transaction);
      
      transactionTimer = setTimeout(() => {
        if (isTransactionPending) { 
            setIsTransactionPending(false);
            toast({
                title: "Transaction Timed Out",
                description: "The wallet did not respond in time. Please try again.",
                variant: "destructive",
            });
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
        }
      }, TRANSACTION_TIMEOUT_MS);

      await transactionPromise; 

      if (transactionTimer) clearTimeout(transactionTimer); 

      setIsBoosterActive(true);
      const now = Date.now();
      setBoosterEndTime(now + BOOSTER_DURATION_MS);
      setBoosterCooldownEndTime(now + BOOSTER_DURATION_MS + BOOSTER_COOLDOWN_MS);
      
      setScore(prevScore => {
        const updatedScore = prevScore + BOOSTER_ACTIVATION_BONUS;
        if (wallet?.account?.address) {
          saveScore(wallet.account.address, updatedScore);
        }
        return updatedScore;
      }); 
      showFloatingText(`+${BOOSTER_ACTIVATION_BONUS} Boost!`, typeof window !== 'undefined' ? window.innerWidth / 2 : 150 , typeof window !== 'undefined' ? window.innerHeight / 3 : 100);

      toast({
        title: "Booster Activated!",
        description: `+${BOOSTER_ACTIVATION_BONUS} bonus! Transaction sent to wallet. You now earn 100x points for 1 minute.`,
        variant: "default", 
      });

      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      if (transactionTimer) clearTimeout(transactionTimer);
      
      let title = "Action Failed";
      let description = "The action could not be completed.";
      let toastVariant: "destructive" | "default" = "destructive";
      let hapticType: 'error' | 'warning' = 'error';

      const errorMessageString = (typeof error === 'object' && error !== null && 'message' in error && typeof (error as Error).message === 'string') 
                                 ? (error as Error).message 
                                 : JSON.stringify(error); 
      const errorMessageLowerCase = errorMessageString.toLowerCase();
      
      if (errorMessageLowerCase.includes('user rejected') || 
          (errorMessageString.includes('tonconnectuierror') && errorMessageLowerCase.includes('transaction was not sent'))) {
        title = "Transaction Cancelled";
        description = "The transaction was not completed by you. Booster not activated.";
        toastVariant = "default"; 
        hapticType = 'warning';
        console.log("Transaction cancelled or not sent by user:", error); 
      } else if (errorMessageString) {
        title = "Transaction Error";
        description = `An error occurred: ${errorMessageString}. Booster not activated.`;
        console.error("Transaction processing error:", error); 
      } else {
        title = "Unexpected Error";
        description = "An unexpected error occurred. Booster not activated.";
        console.error("Unknown transaction error:", error);
      }
      
      toast({
        title: title,
        description: description,
        variant: toastVariant,
      });

      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(hapticType);
      }
    } finally {
      if (transactionTimer) clearTimeout(transactionTimer);
      setIsTransactionPending(false);
    }
  }, [wallet, isBoosterActive, boosterCooldownEndTime, isTransactionPending, tonConnectUI, toast, showFloatingText, saveScore]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBoosterActive && boosterEndTime && boosterEndTime > Date.now()) {
      timer = setTimeout(() => {
        setIsBoosterActive(false);
        setBoosterEndTime(null);
        toast({
          title: "Booster Expired",
          description: "Your 100x points boost has ended.",
        });
      }, boosterEndTime - Date.now());
    }
    return () => clearTimeout(timer);
  }, [isBoosterActive, boosterEndTime, toast]);


  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full p-4 space-y-6 bg-background text-foreground">
      <header className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-primary font-headline">TapTon Rewards</h1>
      </header>

      <WalletInfo />

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold font-headline">Your Score</CardTitle>
          <Coins className="h-6 w-6 text-amber-500" />
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold text-center text-primary">{score}</p>
        </CardContent>
      </Card>
      
      <div className="relative w-full max-w-md flex justify-center">
        <TapSection onTap={handleTap} isBoosterActive={isBoosterActive} />
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className="absolute text-2xl font-bold text-primary pointer-events-none opacity-100"
            style={{
              left: `${ft.x}px`,
              top: `${ft.y}px`,
              animation: `floatUpFadeOut 1.5s ease-out forwards`
            }}
          >
            {ft.text}
          </div>
        ))}
      </div>
      
      <BoosterButton 
        onActivateBooster={activateBooster} 
        boosterEndTime={boosterEndTime}
        boosterCooldownEndTime={boosterCooldownEndTime}
        isTransactionPending={isTransactionPending}
      />

      <footer className="text-xs text-muted-foreground mt-auto pt-4">
        Powered by TON Blockchain
      </footer>
      <style jsx global>{`
        @keyframes floatUpFadeOut {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-50px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

