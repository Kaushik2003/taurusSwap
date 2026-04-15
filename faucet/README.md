# 🧪 Taurus Faucet

A premium, high-fidelity testnet asset dispenser for the Algorand Taurus ecosystem. Built with a **Glassmorphism Brutalist** aesthetic to match the TaurusSwap core protocol.

![Taurus Faucet Preview](https://github.com/manovHacksaw/taurus-faucet/raw/main/public/logo.png)

## ✨ Features

- **Multi-Asset Support**: Request TestNet ALGO and customized ecosystem tokens.
- **Real-Time Vault Monitoring**: Live tracking of faucet reserves for all supported assets.
- **Glassmorphism UI**: High-end visual system with vibrant greens, deep shadows, and interactive cards.
- **Verification System**: Integrated Cloudflare Turnstile for bot protection.
- **Wallet Integration**: Full support for Pera, Defly, Lute, and other Algorand providers via `@txnlab/use-wallet`.
- **Transaction Tracking**: Global and user-specific recent transaction history.

## 🚀 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Tailwind CSS with custom Glassmorphism tokens
- **Blockchain**: [Algosdk](https://github.com/algorand/js-algorand-sdk)
- **Deployment**: Optimized for Vercel/Netlify

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Recommended) or Node.js 20+
- An Algorand TestNet account with assets to act as the dispenser.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/manovHacksaw/taurus-faucet.git
   cd taurus-faucet
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory:
   ```env
   # Algod Configuration
   NEXT_PUBLIC_ALGOD_SERVER="https://testnet-api.algonode.cloud"
   NEXT_PUBLIC_ALGOD_PORT="443"
   NEXT_PUBLIC_ALGOD_TOKEN=""

   # Dispenser Private Key
   DISPENSER_MNEMONIC="your 25 word mnemonic here"

   # Infrastructure (Redis for Rate Limiting)
   UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token"

   # Security (Turnstile)
   NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key"
   TURNSTILE_SECRET_KEY="your-secret-key"
   ```

### Development

Run the development server:
```bash
bun dev
```

## 🏗️ Deployment

This project includes a `.npmrc` file configured with `legacy-peer-deps=true` to resolve specific peer-dependency conflicts between the wallet connector and React 18 during production builds on platforms like Vercel.

---

Built with 💚 for the **Algorand Taurus Ecosystem**.
