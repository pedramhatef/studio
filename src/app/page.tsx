
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

  const loadScore = useCallback(async (address: string): Promise<number> => {
    // Attempt 1: Telegram CloudStorage
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      try {
        const cloudValue = await new Promise<string | null | undefined>((resolve) => {
          window.Telegram.WebApp.CloudStorage.getItem(`score_${address}`, (error, value) => {
            if (error) {
              console.warn(`Telegram CloudStorage.getItem error for address ${address} (will try localStorage):`, error);
              resolve(null); // Signal to try localStorage by resolving with null
              return;
            }
            resolve(value); // value can be string, null, or undefined
          });
        });

        // Check if cloudValue is a non-empty string that can be parsed to a number
        if (cloudValue !== null && typeof cloudValue !== 'undefined' && cloudValue.trim() !== "") {
          const parsedScore = parseInt(cloudValue, 10);
          if (!isNaN(parsedScore)) {
            // console.log(`Score ${parsedScore} loaded from CloudStorage for ${address}`);
            return parsedScore;
          } else {
            console.warn(`CloudStorage for ${address} contained non-integer value: "${cloudValue}". Treating as no score in cloud.`);
          }
        }
        // If cloudValue is null, undefined, empty, or non-integer, it means no valid score in cloud. Fall through to localStorage.
        // console.log(`No valid score in CloudStorage for ${address} or CloudStorage returned error/empty, trying localStorage.`);
      } catch (e) {
        console.error(`Exception during CloudStorage.getItem access for ${address} (will try localStorage):`, e);
        // Fall through to localStorage
      }
    } else {
      // console.log("Telegram CloudStorage not available, trying localStorage.");
    }

    // Attempt 2: localStorage (if CloudStorage didn't return a score, had an error, or wasn't available)
    if (typeof window !== 'undefined') {
      try {
        const storedScores = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
        if (storedScores) {
          const scores: Record<string, number> = JSON.parse(storedScores);
          const localScore = scores[address];
          if (typeof localScore === 'number') {
            // console.log(`Score ${localScore} loaded from localStorage for ${address}`);
            return localScore;
          }
        }
      } catch (localStorageError) {
        console.error(`Failed to load score from local storage for ${address}:`, localStorageError);
      }
    }
    
    // console.log(`No score found in CloudStorage or localStorage for ${address}, defaulting to 0.`);
    return 0; // Default score if all fails or nothing found
  }, []);
  
  const saveScore = useCallback((address: string, newScore: number) => {
    // Save to localStorage (acts as a primary or fallback)
    if (typeof window !== 'undefined') {
      try {
        // console.log(`Saving score ${newScore} to localStorage for ${address}`);
        const storedScores = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
        let scores: Record<string, number> = {};
        if (storedScores) {
          try {
            scores = JSON.parse(storedScores);
          } catch (e) {
            console.error("Error parsing localStorage scores, resetting.", e);
            scores = {}; // Reset if parsing fails
          }
        }
        scores[address] = newScore;
        localStorage.setItem(LOCAL_STORAGE_SCORES_KEY, JSON.stringify(scores));
      } catch (error) {
        console.error(`Failed to save score ${newScore} to local storage for ${address}:`, error);
      }
    }
  
    // Also save to Telegram CloudStorage if available
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      try {
        // console.log(`Attempting to save score ${newScore} to CloudStorage for ${address}`);
        window.Telegram.WebApp.CloudStorage.setItem(`score_${address}`, newScore.toString(), (error, stored) => {
          if (error) {
            console.error(`Telegram CloudStorage.setItem error for address ${address}, score ${newScore}:`, error);
          } else if (stored) {
            // console.log(`Score ${newScore} saved to Telegram CloudStorage successfully for ${address}.`);
          } else {
            console.warn(`Score ${newScore} NOT saved to Telegram CloudStorage for ${address} (stored callback returned false, no explicit error). This might lead to data loss on other devices/sessions.`);
          }
        });
      } catch (cloudError) {
        console.error(`Exception trying Telegram CloudStorage.setItem for ${address}, score ${newScore}:`, cloudError);
      }
    }
  }, []);

  useEffect(() => {
    if (wallet?.account?.address) {
      const userAddress = wallet.account.address;
      loadScore(userAddress)
        .then(loadedScore => {
          setScore(loadedScore);
        })
        .catch(error => {
          // This catch should ideally not be hit if loadScore is designed to always resolve.
          console.error(`Critical error in loadScore promise for ${userAddress}, defaulting to 0:`, error);
          setScore(0);
        });
    } else {
      setScore(0); // Reset score if wallet disconnects
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
    
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      messages: [
        {
          address: 'kQDTFrVTNx99jQhfXYGysnxb2L5xkqvXLiqNOMCJY-w-YiOz', 
          amount: '50000000', 
          payload: 'te6ccgEBAQEAAgAAAAEAAAAAAAAAAQ==', 
        },
      ],
    };
        
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
    

    