'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { PlaceOrderButton } from '@/components/trading/PlaceOrderButton';
import { useVaultBalance, useUSDTAllowance, useApproveUSDT } from '@/hooks/useCollateralVault';

interface TradingInterfaceProps {
  marketId: `0x${string}`;
}

export function TradingInterface({ marketId }: TradingInterfaceProps) {
  const { address, isConnected } = useAccount();
  const { availableBalance, refetch: refetchBalance } = useVaultBalance(address);
  const { hasAllowance, refetch: refetchAllowance } = useUSDTAllowance(address);
  const { approve, isPending: isApproving, isConfirming: isApprovingConfirming, isSuccess: approveSuccess } = useApproveUSDT();

  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [pricePercent, setPricePercent] = useState(''); // User enters percentage (1-99)
  const [quantity, setQuantity] = useState('');
  const [expiryOption, setExpiryOption] = useState('1d'); // Default 1 day

  // Refetch balance and allowance on mount and when address changes
  useEffect(() => {
    if (address) {
      refetchBalance();
      refetchAllowance();
    }
  }, [address, refetchBalance, refetchAllowance]);

  // Refetch allowance after successful approval
  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
    }
  }, [approveSuccess, refetchAllowance]);

  // Convert percentage to basis points for contract (50% -> 5000)
  const priceBasisPoints = pricePercent ? (parseFloat(pricePercent) * 100).toString() : '';

  // Get expiry unix timestamp from selected option
  const getExpiryUnix = (): number => {
    const now = Math.floor(Date.now() / 1000);
    const hour = 60 * 60;
    const day = 24 * hour;

    switch (expiryOption) {
      case '1h': return now + hour;
      case '6h': return now + 6 * hour;
      case '12h': return now + 12 * hour;
      case '1d': return now + day;
      case '3d': return now + 3 * day;
      case '7d': return now + 7 * day;
      case '30d': return now + 30 * day;
      default: return now + day;
    }
  };

  // Calculate estimated cost/proceeds
  const calculateTotal = () => {
    if (!pricePercent || !quantity) return '0.00';
    const priceNum = parseFloat(pricePercent);
    const quantityNum = parseFloat(quantity);
    if (side === 'BUY') {
      return ((priceNum / 100) * quantityNum).toFixed(2);
    } else {
      return (((100 - priceNum) / 100) * quantityNum).toFixed(2);
    }
  };

  const maxPayout = () => {
    if (!quantity) return '0.00';
    const quantityNum = parseFloat(quantity);
    return quantityNum.toFixed(2);
  };

  return (
    <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
      <h3 className="text-xl font-bold mb-6">Place Order</h3>

      {/* Outcome Selection */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Outcome</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setOutcome('YES')}
            className={`py-3 px-4 rounded-lg font-semibold transition ${
              outcome === 'YES'
                ? 'bg-green-500 text-white'
                : 'bg-espotz-black text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => setOutcome('NO')}
            className={`py-3 px-4 rounded-lg font-semibold transition ${
              outcome === 'NO'
                ? 'bg-red-500 text-white'
                : 'bg-espotz-black text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            NO
          </button>
        </div>
      </div>

      {/* Side Selection */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Order Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSide('BUY')}
            className={`py-3 px-4 rounded-lg font-semibold transition ${
              side === 'BUY'
                ? 'bg-cyan-500 text-white'
                : 'bg-espotz-black text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setSide('SELL')}
            className={`py-3 px-4 rounded-lg font-semibold transition ${
              side === 'SELL'
                ? 'bg-orange-500 text-white'
                : 'bg-espotz-black text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            SELL
          </button>
        </div>
      </div>

      {/* Price Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Price (1% - 99%)
        </label>
        <div className="relative">
          <input
            type="number"
            min="1"
            max="99"
            step="1"
            value={pricePercent}
            onChange={(e) => setPricePercent(e.target.value)}
            placeholder="50"
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white focus:outline-none focus:border-cyan-500"
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Probability you believe {outcome} will win
        </p>
      </div>

      {/* Quantity Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Quantity (USDT)
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="10.00"
          className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Order Expiration */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">
          Order Expiration
        </label>
        <select
          value={expiryOption}
          onChange={(e) => setExpiryOption(e.target.value)}
          className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="1h">1 Hour</option>
          <option value="6h">6 Hours</option>
          <option value="12h">12 Hours</option>
          <option value="1d">1 Day</option>
          <option value="3d">3 Days</option>
          <option value="7d">7 Days</option>
          <option value="30d">30 Days</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          How long your limit order stays active
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-espotz-black rounded-lg p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Order Type:</span>
          <span className="font-semibold">
            {side} {outcome} @ {pricePercent || '0'}%
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">
            {side === 'BUY' ? 'Cost' : 'Collateral Required'}:
          </span>
          <span className="font-semibold">{calculateTotal()} USDT</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Max Payout:</span>
          <span className="font-semibold text-green-400">{maxPayout()} USDT</span>
        </div>
        <div className="flex justify-between text-sm border-t border-gray-700 pt-2 mt-2">
          <span className="text-gray-400">Vault Balance:</span>
          <span className={`font-semibold ${availableBalance && availableBalance > 0n ? 'text-green-400' : 'text-yellow-400'}`}>
            {availableBalance ? formatUnits(availableBalance, 6) : '0'} USDT
          </span>
        </div>
      </div>

      {/* Step 1: Approve USDT if needed */}
      {!hasAllowance && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400 mb-3">
            <strong>Step 1:</strong> Approve USDT for the vault before trading
          </p>
          <button
            onClick={approve}
            disabled={isApproving || isApprovingConfirming}
            className="btn-warning w-full"
          >
            {isApproving ? 'Confirming...' : isApprovingConfirming ? 'Approving...' : approveSuccess ? 'Approved!' : 'Approve USDT'}
          </button>
        </div>
      )}

      {/* Step 2: Deposit if vault balance is 0 */}
      {hasAllowance && availableBalance === 0n && (
        <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-sm text-orange-400 mb-3">
            <strong>Step 2:</strong> Deposit USDT to your vault balance
          </p>
          <a href="/portfolio" className="btn-primary w-full block text-center">
            Go to Portfolio to Deposit
          </a>
        </div>
      )}

      {/* Place Order Button */}
      <PlaceOrderButton
        marketId={marketId}
        side={side}
        outcome={outcome}
        price={priceBasisPoints}
        quantity={quantity}
        expireTime={getExpiryUnix()}
        disabled={!hasAllowance || availableBalance === 0n}
      />

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-400">
          <strong>Note:</strong> Orders are placed on-chain and require gas. Make sure you have
          enough vault balance to cover your order.
        </p>
      </div>
    </div>
  );
}
