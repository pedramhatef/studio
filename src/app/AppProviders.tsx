"use client";

import type { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// The manifest URL is for TON Connect, specific to the user's setup.
const tonConnectManifestUrl = "https://pedramhatef.github.io/my-twa/tonconnect-manifest.json";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TonConnectUIProvider manifestUrl={tonConnectManifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
