'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { PlaceOrderButton } from '@/components/trading/PlaceOrderButton';
import { useVaultBalance, useUSDTAllowance, useApproveUSDT } from '@/hooks/useCollateralVault';
import { useMarketPrice } from '@/hooks/useMarketPrice';

interface TradingInterfaceProps {
  marketId: `0x${string}`;
}

export function TradingInterface({ marketId }: TradingInterfaceProps) {
  const { address, isConnected } = useAccount();
  const { availableBalance, refetch: refetchBalance } = useVaultBalance(address);
  const { hasAllowance, refetch: refetchAllowance } = useUSDTAllowance(address);
  const { approve, isPending: isApproving, isConfirming: isApprovingConfirming, isSuccess: approveSuccess } = useApproveUSDT();
  const { yesPrice, noPrice, yesBid, yesAsk, noBid, noAsk } = useMarketPrice(marketId);

  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [priceCents, setPriceCents] = useState(''); // User enters price in cents (1-99)
  const [amount, setAmount] = useState(''); // Amount in dollars
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

  // Convert cents to basis points for contract (50 cents -> 5000 bp)
  const priceBasisPoints = priceCents ? (parseFloat(priceCents) * 100).toString() : '';

  // Calculate quantity from amount (amount / price per share in dollars)
  const calculateQuantity = (): string => {
    if (!priceCents || !amount) return '0';
    const cents = parseFloat(priceCents);
    const amountNum = parseFloat(amount);
    if (cents <= 0) return '0';
    // shares = amount / (price in dollars)
    // e.g., $10 at 50¢ = 20 shares
    const shares = amountNum / (cents / 100);
    return shares.toFixed(2);
  };

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

  // Get suggested price based on side and outcome
  const getSuggestedPrice = () => {
    if (outcome === 'YES') {
      if (side === 'BUY') return yesAsk ?? yesPrice;
      return yesBid ?? yesPrice;
    } else {
      if (side === 'BUY') return noAsk ?? noPrice;
      return noBid ?? noPrice;
    }
  };

  // Calculate potential return
  const calculatePotentialReturn = () => {
    if (!priceCents || !amount) return '0.00';
    const cents = parseFloat(priceCents);
    const amountNum = parseFloat(amount);
    if (cents <= 0) return '0.00';
    // Each share pays $1 if correct
    const shares = amountNum / (cents / 100);
    const payout = shares; // shares * $1
    const profit = payout - amountNum;
    return profit.toFixed(2);
  };

  const calculatePotentialPayout = () => {
    if (!priceCents || !amount) return '0.00';
    const cents = parseFloat(priceCents);
    const amountNum = parseFloat(amount);
    if (cents <= 0) return '0.00';
    const shares = amountNum / (cents / 100);
    return shares.toFixed(2);
  };

  return (
    <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
      <h3 className="text-xl font-bold mb-6">Place Order</h3>

      {/* Buy/Sell Toggle - Polymarket Style */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-0 bg-espotz-black rounded-lg p-1">
          <button
            onClick={() => setSide('BUY')}
            className={`py-2.5 px-4 rounded-md font-semibold transition ${
              side === 'BUY'
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide('SELL')}
            className={`py-2.5 px-4 rounded-md font-semibold transition ${
              side === 'SELL'
                ? 'bg-red-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Outcome Selection with Prices - Polymarket Style */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Outcome</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setOutcome('YES')}
            className={`py-3 px-4 rounded-lg font-semibold transition border ${
              outcome === 'YES'
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-espotz-black text-gray-400 hover:text-white border-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>Yes</span>
              <span className="text-lg">{yesPrice}¢</span>
            </div>
          </button>
          <button
            onClick={() => setOutcome('NO')}
            className={`py-3 px-4 rounded-lg font-semibold transition border ${
              outcome === 'NO'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-espotz-black text-gray-400 hover:text-white border-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>No</span>
              <span className="text-lg">{noPrice}¢</span>
            </div>
          </button>
        </div>
      </div>

      {/* Amount Input - Polymarket Style */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.00"
            className="w-full bg-espotz-black border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-lg"
          />
        </div>
        <div className="flex gap-2 mt-2">
          {['10', '25', '50', '100'].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val)}
              className="px-3 py-1 text-sm bg-espotz-black border border-gray-700 rounded hover:border-cyan-500 transition"
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      {/* Price Input in Cents - Polymarket Style */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-400">Limit Price</label>
          <button
            onClick={() => setPriceCents(getSuggestedPrice()?.toString() || '')}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Use market price ({getSuggestedPrice()}¢)
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            min="1"
            max="99"
            step="1"
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            placeholder={getSuggestedPrice()?.toString() || '50'}
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white focus:outline-none focus:border-cyan-500 text-lg"
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">¢</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          1¢ = 1% probability
        </p>
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
      </div>

      {/* Order Summary - Polymarket Style */}
      <div className="bg-espotz-black rounded-lg p-4 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Order:</span>
          <span className="font-semibold">
            {side} {outcome} @ {priceCents || '0'}¢
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Shares:</span>
          <span className="font-semibold">{calculateQuantity()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Cost:</span>
          <span className="font-semibold">${amount || '0.00'}</span>
        </div>
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Potential Payout:</span>
            <span className="font-bold text-green-400">${calculatePotentialPayout()}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Profit if {outcome} wins:</span>
            <span className="text-green-400">+${calculatePotentialReturn()}</span>
          </div>
        </div>
        <div className="flex justify-between text-sm border-t border-gray-700 pt-3 mt-3">
          <span className="text-gray-400">Vault Balance:</span>
          <span className={`font-semibold ${availableBalance && availableBalance > 0n ? 'text-green-400' : 'text-yellow-400'}`}>
            ${availableBalance ? Number(formatUnits(availableBalance, 6)).toFixed(2) : '0.00'}
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
        quantity={calculateQuantity()}
        expireTime={getExpiryUnix()}
        disabled={!hasAllowance || availableBalance === 0n || !amount || !priceCents}
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
