"use client";

import type { MouseEvent } from 'react';
import { useState, useEffect, useCallback } from "react";
import { WalletInfo } from "@/components/WalletInfo";
import { TapSection } from "@/components/TapSection";
import { BoosterButton } from "@/components/BoosterButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  timestamp: number;
}

const BOOSTER_DURATION_MS = 60 * 1000; // 1 minute
const BOOSTER_COOLDOWN_MS = 60 * 1000; // 1 minute

export default function TapTonPage() {
  const [score, setScore] = useState(0);
  const [isBoosterActive, setIsBoosterActive] = useState(false);
  const [boosterEndTime, setBoosterEndTime] = useState<number | null>(null);
  const [boosterCooldownEndTime, setBoosterCooldownEndTime] = useState<number | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const { toast } = useToast();

  // Telegram WebApp SDK interaction
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      // You can expand viewport if needed:
      // window.Telegram.WebApp.expand();
    }
  }, []);

  const showFloatingText = (text: string, x: number, y: number) => {
    const newText: FloatingText = { id: Date.now(), text, x, y, timestamp: Date.now() };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== newText.id));
    }, 1500); // Remove after 1.5 seconds
  };
  
  const handleTap = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const pointsPerTap = isBoosterActive ? 2 : 1;
    setScore(prevScore => prevScore + pointsPerTap);

    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    // Get tap position relative to the viewport for floating text
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left + Math.random() * 40 - 20; // Click position within button + random offset
    const y = event.clientY - rect.top - 30 + Math.random() * 20 - 10; // Click position within button - offset to float up + random offset
    
    showFloatingText(`+${pointsPerTap}`, x, y);

  }, [isBoosterActive]);

  const activateBooster = useCallback(() => {
    if (isBoosterActive || (boosterCooldownEndTime && boosterCooldownEndTime > Date.now())) {
      return; // Already active or in cooldown
    }
    setIsBoosterActive(true);
    const now = Date.now();
    setBoosterEndTime(now + BOOSTER_DURATION_MS);
    setBoosterCooldownEndTime(now + BOOSTER_DURATION_MS + BOOSTER_COOLDOWN_MS);
    
    toast({
      title: "Booster Activated!",
      description: "You earn 2x points for 1 minute.",
      variant: "default", 
    });

    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  }, [isBoosterActive, boosterCooldownEndTime, toast]);

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
