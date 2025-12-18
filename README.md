# Espotz - Esports Prediction Markets

A decentralized prediction market platform for esports events built on BNB Smart Chain Testnet.

**Live Demo:** [https://espotz-bnb.netlify.app](https://espotz-bnb.netlify.app)

## Overview

Espotz allows users to trade on the outcomes of esports events using a central limit order book (CLOB) system. Users can:

- Create and trade on prediction markets
- Buy/Sell YES and NO outcome shares
- Participate in tournaments with prize pools
- Earn rewards by making accurate predictions

## Architecture

### Smart Contracts (Solidity)

- **MockUSDT** - ERC20 test token with public mint function for testnet
- **CollateralVault** - Manages user deposits and withdrawals with EIP-2612 permit support
- **OutcomeToken** - ERC1155 tokens representing YES/NO positions
- **PredictionMarket** - Core trading logic with on-chain order book
- **Tournament** - Tournament management with entry fees and prize distribution

### Frontend (React + TypeScript)

- **Vite** - Build tool and dev server
- **wagmi v2** - Ethereum hooks for React
- **viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI
- **TailwindCSS** - Styling

## Contract Addresses (BSC Testnet - Chain ID: 97)

| Contract | Address |
|----------|---------|
| MockUSDT | `0x9a4A325c2Ff2aCA74246ef031C8891b2d1096113` |
| CollateralVault | `0x9c1C147C35FC910141E18bDEd52A14ac40014c06` |
| PredictionMarket | `0xbFac61515177aa5504131FC93643e507785AB165` |
| Tournament | `0xaE855c89c23544129f9d0B8E414aCbc9B221dc59` |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd espotz-bnb

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Getting Test Tokens

1. **BNB (for gas)** - Use one of these faucets:
   - [BNB Chain Official Faucet](https://www.bnbchain.org/en/testnet-faucet)
   - [QuickNode Faucet](https://faucet.quicknode.com/binance-smart-chain/bnb-testnet)

2. **MockUSDT** - Click the "Faucet" button in the app to mint 1,000 USDT

## Features

### Prediction Markets

- View all markets with YES/NO prices displayed in cents
- Real-time price updates (5-second refresh)
- Place limit orders with dollar amounts
- View order book with bid/ask prices

### Trading Interface

- Polymarket-inspired UX design
- Buy/Sell toggle
- Quick amount buttons ($10, $25, $50, $100)
- Limit price input in cents (1-99)
- Potential payout and profit calculations

### Tournaments

- Create tournaments with entry fees
- Join tournaments and compete on the leaderboard
- Win prizes from the prize pool

### Portfolio

- View vault balance
- Deposit/Withdraw USDT
- Approve token spending

## Tech Stack

- **Blockchain:** BNB Smart Chain Testnet
- **Smart Contracts:** Solidity, Hardhat
- **Frontend:** React 18, TypeScript, Vite
- **State Management:** TanStack Query (React Query)
- **Wallet:** RainbowKit, wagmi v2
- **Styling:** TailwindCSS
- **Deployment:** Netlify

## License

MIT
