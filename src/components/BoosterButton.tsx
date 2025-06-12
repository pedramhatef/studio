"use client";

import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react"; // Zap for boost/energy
import { useEffect, useState } from 'react';

interface BoosterButtonProps {
  onActivateBooster: () => void;
  boosterEndTime: number | null;
  boosterCooldownEndTime: number | null;
}

export function BoosterButton({ onActivateBooster, boosterEndTime, boosterCooldownEndTime }: BoosterButtonProps) {
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
    if (!isBoosterCurrentlyActive && !isCooldownActive) {
      onActivateBooster();
    }
  };
  
  let buttonText = "Activate 2x Boost (1 min)";
  let disabled = false;
  let remainingTime = 0;

  if (isBoosterCurrentlyActive && boosterEndTime) {
    remainingTime = Math.ceil((boosterEndTime - currentTime) / 1000);
    buttonText = `Boost Active! (${remainingTime}s left)`;
    disabled = true;
  } else if (isCooldownActive && boosterCooldownEndTime) {
    remainingTime = Math.ceil((boosterCooldownEndTime - currentTime) / 1000);
    buttonText = `Cooldown (${remainingTime}s)`;
    disabled = true;
  }

  return (
    <Button
      onClick={handleActivate}
      disabled={disabled}
      variant="outline"
      className="w-full max-w-md bg-accent hover:bg-accent/90 text-accent-foreground border-accent shadow-md"
    >
      <Zap className="mr-2 h-5 w-5" />
      {buttonText}
    </Button>
  );
}
