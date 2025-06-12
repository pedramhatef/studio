
"use client";

import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem } from "lucide-react";
import { useState, useEffect } from 'react';

export function WalletInfo() {
  const wallet = useTonWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold font-headline">TON Wallet</CardTitle>
        <Gem className="h-6 w-6 text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <TonConnectButton />
        {isClient && wallet && (
          <div className="text-xs text-muted-foreground break-all">
            Connected: {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
