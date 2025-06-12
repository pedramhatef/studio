import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AppProviders } from './AppProviders';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

export const metadata: Metadata = {
  title: 'TapTon Rewards',
  description: 'Tap to earn rewards in the TON ecosystem!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="font-body antialiased">
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
