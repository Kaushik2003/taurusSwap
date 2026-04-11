import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space',
});

export const metadata: Metadata = {
  title: 'TaurusSwap Faucet — Get Testnet Tokens',
  description:
    'Claim free testnet stablecoins (USDC, USDT, USDD, BUSD, TUSD) for the TaurusSwap AMM on Algorand.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
