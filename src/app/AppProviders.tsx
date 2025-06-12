"use client";

import type { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// This will point to the manifest file hosted within your Next.js app's public directory.
// Make sure to replace 'YOUR_DEPLOYED_APP_URL' in public/tonconnect-manifest.json
// with your actual deployment URL (e.g., https://your-app.vercel.app).
// The manifest will then be accessible at https://your-app.vercel.app/tonconnect-manifest.json
const tonConnectManifestUrl = "/tonconnect-manifest.json";

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
