import { useState } from 'react';
import { useAccount } from 'wagmi';
import { BalanceDisplay } from '@/components/vault/BalanceDisplay';
import { DepositButton } from '@/components/vault/DepositButton';
import { WithdrawButton } from '@/components/vault/WithdrawButton';
import { ApproveUSDTButton } from '@/components/vault/ApproveUSDTButton';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { useUSDTAllowance } from '@/hooks/useCollateralVault';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { hasAllowance } = useUSDTAllowance(address);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-espotz-black">
        <Navigation currentPage="portfolio" />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-6">Connect Your Wallet</h1>
            <p className="text-gray-400 mb-8">Connect your wallet to view your portfolio and manage funds</p>
            <ConnectButton />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-espotz-black">
      <Navigation currentPage="portfolio" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
        <p className="text-gray-400 mb-8">Manage your funds and view positions</p>

        {/* How to Get Started */}
        <div className="bg-espotz-dark-gray rounded-xl p-6 mb-8 border border-gray-800">
          <h3 className="text-xl font-bold mb-6">How to Get Started</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-400 text-xl font-bold">1</span>
              </div>
              <h4 className="font-semibold mb-2">Approve USDT</h4>
              <p className="text-sm text-gray-400">Allow the vault contract to use your USDT</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-400 text-xl font-bold">2</span>
              </div>
              <h4 className="font-semibold mb-2">Deposit USDT</h4>
              <p className="text-sm text-gray-400">Add USDT to your vault balance</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-400 text-xl font-bold">3</span>
              </div>
              <h4 className="font-semibold mb-2">Trade Markets</h4>
              <p className="text-sm text-gray-400">Use your balance to trade on prediction markets</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-400 text-xl font-bold">4</span>
              </div>
              <h4 className="font-semibold mb-2">Withdraw</h4>
              <p className="text-sm text-gray-400">Withdraw USDT to your external wallet</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Balance Display */}
          <div>
            <BalanceDisplay />
          </div>

          {/* Deposit/Withdraw Actions */}
          <div className="space-y-6">
            {/* Approve USDT */}
            <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold mb-4">Step 1: Approve USDT</h3>
              {hasAllowance ? (
                <div className="flex items-center gap-2 text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">USDT Approved</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-4">
                    Before depositing, you must approve the vault contract to spend your USDT tokens
                  </p>
                  <ApproveUSDTButton />
                </>
              )}
            </div>

            {/* Deposit */}
            <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold mb-4">Deposit USDT</h3>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Amount (USDT)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <DepositButton amount={depositAmount} />
            </div>

            {/* Withdraw */}
            <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold mb-4">Withdraw USDT</h3>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Amount (USDT)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <WithdrawButton amount={withdrawAmount} />
            </div>
          </div>
        </div>

        {/* Connected Wallet Info */}
        <div className="mt-8 bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Connected Wallet</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Address</p>
              <p className="font-mono">{address}</p>
            </div>
            <div className="text-sm">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full">Connected</span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
