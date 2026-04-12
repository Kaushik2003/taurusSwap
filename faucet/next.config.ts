import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Only the server-side API route ever imports algosdk / node:crypto.
  // Prevent Next.js from trying to bundle those in the browser.
  serverExternalPackages: ['algosdk'],
  transpilePackages: [
    '@txnlab/use-wallet-react',
    '@txnlab/use-wallet',
    '@perawallet/connect',
    '@blockshake/defly-connect',
    '@walletconnect/sign-client',
    '@walletconnect/modal',
    'lute-connect',
    '@agoralabs-sh/avm-web-provider'
  ],
};

export default nextConfig;
