'use client';

import { useMarket } from '@/hooks/usePredictionMarket';
import { formatUnits } from 'viem';
import { format } from 'date-fns';

interface MarketCardProps {
  marketId: `0x${string}`;
}

export function MarketCard({ marketId }: MarketCardProps) {
  const { data: market, isLoading, error } = useMarket(marketId);

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
    yesSupply,
    noSupply,
    totalCollateral,
    status,
    winningOutcome,
    expireTime,
    tournamentOperator
  } = market as any;

  // MarketStatus enum: 0=Active, 1=Paused, 2=Resolved, 3=Cancelled
  const isActive = Number(status) === 0;
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
    <a href={`/markets/${marketId}`} className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold line-clamp-2 flex-1">{question}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor} ml-2`}>
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Total Volume</p>
          <p className="text-xl font-bold">{totalVolume.toFixed(2)} USDT</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Expiry</p>
          <p className="text-sm font-semibold">{format(expiryDate, 'MMM dd, yyyy')}</p>
          <p className="text-xs text-gray-500">{format(expiryDate, 'HH:mm')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">YES Shares</p>
          <p className="text-sm font-semibold text-green-400">
            {formatUnits(yesSupply || 0n, 6)}
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">NO Shares</p>
          <p className="text-sm font-semibold text-red-400">
            {formatUnits(noSupply || 0n, 6)}
          </p>
        </div>
      </div>
    </a>
  );
}
