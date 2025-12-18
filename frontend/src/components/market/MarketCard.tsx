'use client';

import { useMarket } from '@/hooks/usePredictionMarket';
import { useMarketDisplayPrice } from '@/hooks/useMarketPrice';
import { formatUnits } from 'viem';
import { format } from 'date-fns';

interface MarketCardProps {
  marketId: `0x${string}`;
}

export function MarketCard({ marketId }: MarketCardProps) {
  const { data: market, isLoading, error } = useMarket(marketId);
  const { yesPrice, noPrice, isLoading: priceLoading } = useMarketDisplayPrice(marketId);

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error || !market) {
    return null;
  }

  // Solidity structs return as objects - use exact field names from ABI
  const {
    question,
    totalCollateral,
    status,
    winningOutcome,
    expireTime,
  } = market as any;

  // MarketStatus enum: 0=Active, 1=Paused, 2=Resolved, 3=Cancelled
  const isPaused = Number(status) === 1;
  const isResolved = Number(status) === 2;
  const isCancelled = Number(status) === 3;

  const totalVolume = totalCollateral ? Number(formatUnits(totalCollateral, 6)) : 0;
  const expiryDate = expireTime ? new Date(Number(expireTime) * 1000) : new Date();
  const isExpired = expiryDate < new Date();

  // Determine market status display
  let statusColor = 'bg-green-500/20 text-green-400';
  let statusText = 'Active';

  if (isCancelled) {
    statusColor = 'bg-red-500/20 text-red-400';
    statusText = 'Cancelled';
  } else if (isResolved) {
    statusColor = 'bg-blue-500/20 text-blue-400';
    statusText = Number(winningOutcome) === 0 ? 'Resolved: YES' : 'Resolved: NO';
  } else if (isPaused) {
    statusColor = 'bg-yellow-500/20 text-yellow-400';
    statusText = 'Paused';
  } else if (isExpired) {
    statusColor = 'bg-orange-500/20 text-orange-400';
    statusText = 'Expired';
  }

  return (
    <a href={`/markets/${marketId}`} className="card p-6 hover:shadow-lg transition-shadow group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold line-clamp-2 flex-1 group-hover:text-cyan-400 transition">{question}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor} ml-2 shrink-0`}>
          {statusText}
        </span>
      </div>

      {/* Price Buttons - Polymarket Style */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-left transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Yes</span>
            <span className="text-lg font-bold text-green-400">
              {priceLoading ? '...' : `${yesPrice}¢`}
            </span>
          </div>
        </button>
        <button className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-left transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">No</span>
            <span className="text-lg font-bold text-red-400">
              {priceLoading ? '...' : `${noPrice}¢`}
            </span>
          </div>
        </button>
      </div>

      {/* Volume and Expiry */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Vol:</span>
          <span className="font-semibold text-gray-300">${totalVolume.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Ends:</span>
          <span className="font-medium">{format(expiryDate, 'MMM dd')}</span>
        </div>
      </div>
    </a>
  );
}
