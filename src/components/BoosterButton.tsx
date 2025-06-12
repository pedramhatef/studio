
"use client";

import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react"; 
import { useEffect, useState } from 'react';

interface BoosterButtonProps {
  onActivateBooster: () => void;
  boosterEndTime: number | null;
  boosterCooldownEndTime: number | null;
  isTransactionPending: boolean;
}

export function BoosterButton({ onActivateBooster, boosterEndTime, boosterCooldownEndTime, isTransactionPending }: BoosterButtonProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isBoosterCurrentlyActive = boosterEndTime !== null && boosterEndTime > currentTime;
  const isCooldownActive = boosterCooldownEndTime !== null && boosterCooldownEndTime > currentTime;

  const handleActivate = () => {
    if (!isBoosterCurrentlyActive && !isCooldownActive && !isTransactionPending) {
      onActivateBooster();
    }
  };
  
  let buttonText = "Activate 2x Boost (1 min)";
  let isDisabled = false;
  let ButtonIcon = Zap;

  if (isTransactionPending) {
    buttonText = "Processing Transaction...";
    isDisabled = true;
    ButtonIcon = Loader2;
  } else if (isBoosterCurrentlyActive && boosterEndTime) {
    const remainingTime = Math.ceil((boosterEndTime - currentTime) / 1000);
    buttonText = `Boost Active! (${remainingTime}s left)`;
    isDisabled = true;
  } else if (isCooldownActive && boosterCooldownEndTime) {
    const remainingTime = Math.ceil((boosterCooldownEndTime - currentTime) / 1000);
    buttonText = `Cooldown (${remainingTime}s)`;
    isDisabled = true;
  }

  return (
    <Button
      onClick={handleActivate}
      disabled={isDisabled}
      variant="outline"
      className="w-full max-w-md bg-accent hover:bg-accent/90 text-accent-foreground border-accent shadow-md"
    >
      <ButtonIcon className={`mr-2 h-5 w-5 ${isTransactionPending ? 'animate-spin' : ''}`} />
      {buttonText}
    </Button>
  );
}
