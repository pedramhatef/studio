
"use client";

import type { MouseEvent } from 'react';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react"; // Or Zap for energy

interface TapButtonProps {
  onTap: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  isBoosterActive: boolean;
}

export function TapSection({ onTap, disabled, isBoosterActive }: TapButtonProps) {
  return (
    <div className="flex flex-col items-center space-y-4">
      <Button
        onClick={onTap}
        disabled={disabled}
        className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/50 transition-all duration-150 ease-in-out active:scale-95 shadow-2xl flex flex-col items-center justify-center text-primary-foreground"
        aria-label="Tap to earn"
      >
        <Image 
          src="https://placehold.co/150x150.png" 
          alt="Tap Coin" 
          width={100} 
          height={100} 
          data-ai-hint="coin token" 
          className="rounded-full pointer-events-none mb-2"
        />
        <div className="flex items-center space-x-2">
           <Hand className="w-8 h-8" />
           <span className="text-2xl font-bold font-headline">TAP!</span>
        </div>
      </Button>
      {isBoosterActive && (
        <p className="text-accent font-semibold animate-pulse">100X POINTS ACTIVE!</p>
      )}
    </div>
  );
}
