
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

// Helper to get item from Telegram CloudStorage
const getCloudStorageItem = (key: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!(typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage && window.Telegram?.WebApp?.initDataUnsafe?.user)) {
      console.warn(`[Mobile Debug] CloudStorage unavailable when trying to get item: ${key}`);
      resolve(null);
      return;
    }
    window.Telegram.WebApp.CloudStorage.getItem(key, (error, value) => {
      if (error) {
        console.warn(`[Mobile Debug] Telegram CloudStorage.getItem error for key ${key}:`, error);
        resolve(null); // Resolve null on error to signal fallback
        return;
      }
      if (value === null || typeof value === 'undefined' || value.trim() === "") {
        console.log(`[Mobile Debug] CloudStorage.getItem for key ${key}: value is null, undefined, or empty ("${value}").`);
        resolve(null);
      } else {
        console.log(`[Mobile Debug] CloudStorage.getItem for key ${key}: value is "${value}".`);
        resolve(value);
      }
    });
  });
};


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
      console.log("[Mobile Debug] Telegram WebApp ready() called.");
      window.Telegram.WebApp.ready();
    }
  }, []);

  const loadScore = useCallback(async (address: string): Promise<number> => {
    let scoreToLoad: number | null = null;
    console.log(`[Mobile Debug] Starting loadScore for address: ${address}`);

    // Attempt 1: Telegram CloudStorage
    const cloudValue = await getCloudStorageItem(`score_${address}`);

    if (cloudValue !== null) { // cloudValue is a non-empty string here
      const parsedScore = parseInt(cloudValue, 10);
      if (!isNaN(parsedScore)) {
        console.log(`[Mobile Debug] Score ${parsedScore} parsed from CloudStorage for ${address}`);
        scoreToLoad = parsedScore;
      } else {
        console.warn(`[Mobile Debug] CloudStorage for ${address} contained non-integer value: "${cloudValue}". Will try localStorage.`);
      }
    } else {
      console.log(`[Mobile Debug] No valid score from CloudStorage (getItem returned null). Will try localStorage.`);
    }

    // Attempt 2: localStorage (if CloudStorage didn't return a score or had an error)
    if (scoreToLoad === null && typeof window !== 'undefined') {
      console.log(`[Mobile Debug] Attempting to load from localStorage for ${address}`);
      try {
        const storedScoresString = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
        if (storedScoresString) {
          let scoresObj: Record<string, number> = {};
          try {
              scoresObj = JSON.parse(storedScoresString);
          } catch (parseError) {
              console.error(`[Mobile Debug] Error parsing localStorage scores string for ${address}:`, parseError, "String was:", storedScoresString);
              // scoresObj remains {}
          }
          const localScore = scoresObj[address];
          if (typeof localScore === 'number') {
            console.log(`[Mobile Debug] Score ${localScore} loaded from localStorage for ${address}`);
            scoreToLoad = localScore;
          } else {
            console.log(`[Mobile Debug] No score for ${address} in parsed localStorage data. Data:`, scoresObj);
          }
        } else {
          console.log(`[Mobile Debug] No '${LOCAL_STORAGE_SCORES_KEY}' item in localStorage.`);
        }
      } catch (localStorageReadError) { 
        console.error(`[Mobile Debug] Failed to execute localStorage.getItem for ${address}:`, localStorageReadError);
      }
    }
    
    const finalScore = scoreToLoad !== null ? scoreToLoad : 0;
    console.log(`[Mobile Debug] Final score determined for ${address}: ${finalScore}.`);
    return finalScore;
  }, []);
  
  const saveScore = useCallback((address: string, newScore: number) => {
    console.log(`[Mobile Debug] Attempting to save score ${newScore} for address ${address}.`);
    // Save to localStorage (acts as a primary or fallback)
    if (typeof window !== 'undefined') {
      try {
        const storedScores = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
        let scores: Record<string, number> = {};
        if (storedScores) {
          try {
            scores = JSON.parse(storedScores);
          } catch (e) {
            console.error("[Mobile Debug] Error parsing localStorage scores during save, resetting.", e);
            scores = {}; 
          }
        }
        scores[address] = newScore;
        localStorage.setItem(LOCAL_STORAGE_SCORES_KEY, JSON.stringify(scores));
        console.log(`[Mobile Debug] Score ${newScore} saved to localStorage for ${address}.`);
      } catch (error) {
        console.error(`[Mobile Debug] Failed to save score ${newScore} to local storage for ${address}:`, error);
      }
    }
  
    // Also save to Telegram CloudStorage if available
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      console.log(`[Mobile Debug] Attempting to save score ${newScore} to CloudStorage for ${address}.`);
      window.Telegram.WebApp.CloudStorage.setItem(`score_${address}`, newScore.toString(), (error, stored) => {
        if (error) {
          console.error(`[Mobile Debug] Telegram CloudStorage.setItem error for address ${address}, score ${newScore}:`, error);
        } else if (stored) {
          console.log(`[Mobile Debug] Score ${newScore} saved to Telegram CloudStorage successfully for ${address}. (stored=${stored})`);
        } else {
          console.warn(`[Mobile Debug] Score ${newScore} NOT saved to Telegram CloudStorage for ${address} (callback returned stored=${stored}, no explicit error).`);
        }
      });
    } else {
      console.log(`[Mobile Debug] CloudStorage not available for saving score ${newScore} for ${address}.`);
    }
  }, []);

  useEffect(() => {
    if (wallet?.account?.address) {
      const userAddress = wallet.account.address;
      console.log(`[Mobile Debug] Wallet effect: Wallet connected for ${userAddress}. Loading score.`);
      loadScore(userAddress)
        .then(loadedScore => {
          console.log(`[Mobile Debug] Wallet effect: loadScore promise resolved for ${userAddress}. Setting score to: ${loadedScore}`);
          setScore(loadedScore);
        })
        // No catch here, loadScore is designed to always resolve.
        // Errors within loadScore are logged there.
    } else {
      console.log("[Mobile Debug] Wallet effect: Wallet disconnected or not available. Resetting local score state to 0.");
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
      validUntil: Math.floor(Date.now() / 1000) + 300, 
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
    
