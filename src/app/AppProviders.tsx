
"use client";

import type { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// Explicitly set the absolute URL for the manifest.
const tonConnectManifestUrl = "https://studio-zeta-five.vercel.app/tonconnect-manifest.json";

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
