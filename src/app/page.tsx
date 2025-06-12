
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

  const showFloatingText = useCallback((text: string, x: number, y: number) => {
    const newText: FloatingText = { id: Date.now(), text, x, y, timestamp: Date.now() };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== newText.id));
    }, 1500); 
  }, []);
  
  const handleTap = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const pointsPerTap = isBoosterActive ? 2 : 1;
    setScore(prevScore => prevScore + pointsPerTap);

    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left + Math.random() * 40 - 20; 
    const y = event.clientY - rect.top - 30 + Math.random() * 20 - 10; 
    
    showFloatingText(`+${pointsPerTap}`, x, y);

  }, [isBoosterActive, showFloatingText]);

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
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      messages: [
        {
          address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // Known "blackhole" address
          amount: '1000000', // 0.001 TON (in nanoTONs)
        },
      ],
    };

    try {
      await tonConnectUI.sendTransaction(transaction);

      setIsBoosterActive(true);
      const now = Date.now();
      setBoosterEndTime(now + BOOSTER_DURATION_MS);
      setBoosterCooldownEndTime(now + BOOSTER_DURATION_MS + BOOSTER_COOLDOWN_MS);
      
      setScore(prevScore => prevScore + BOOSTER_ACTIVATION_BONUS); 
      showFloatingText(`+${BOOSTER_ACTIVATION_BONUS} Boost!`, window.innerWidth / 2, window.innerHeight / 3);

      toast({
        title: "Booster Activated!",
        description: `+${BOOSTER_ACTIVATION_BONUS} bonus! Transaction sent. You now earn 2x points for 1 minute.`,
        variant: "default", 
      });

      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      console.error("Transaction error:", error);
      let description = "Booster could not be activated.";
      // @ts-expect-error error may not be of type Error, but could have a message
      if (error && typeof error.message === 'string' && error.message.toLowerCase().includes('user rejected')) {
        description = "Transaction rejected by user.";
      // @ts-expect-error error may not be of type Error
      } else if (error && typeof error.message === 'string') {
        // @ts-expect-error error may not be of type Error
        description = `Transaction failed: ${error.message}`;
      }
      
      toast({
        title: "Transaction Failed",
        description: description,
        variant: "destructive",
      });
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsTransactionPending(false);
    }
  }, [wallet, isBoosterActive, boosterCooldownEndTime, isTransactionPending, tonConnectUI, toast, showFloatingText]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBoosterActive && boosterEndTime && boosterEndTime > Date.now()) {
      timer = setTimeout(() => {
        setIsBoosterActive(false);
        setBoosterEndTime(null);
        toast({
          title: "Booster Expired",
          description: "Your 2x points boost has ended.",
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
