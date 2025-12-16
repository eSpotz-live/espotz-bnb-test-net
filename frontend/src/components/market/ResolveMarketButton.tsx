'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';

export function ResolveMarketButton({ marketId }: { marketId: `0x${string}` }) {
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [showConfirm, setShowConfirm] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleResolve = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'resolveMarket',
      args: [marketId, outcome === 'YES' ? 0 : 1], // 0 = YES, 1 = NO
    } as any);
    setShowConfirm(false);
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="btn-primary w-full"
      >
        Resolve Market
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOutcome('YES')}
          className={`py-2 px-4 rounded-lg font-semibold transition ${
            outcome === 'YES'
              ? 'bg-green-500 text-white'
              : 'bg-espotz-black text-gray-400 border border-gray-700'
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setOutcome('NO')}
          className={`py-2 px-4 rounded-lg font-semibold transition ${
            outcome === 'NO'
              ? 'bg-red-500 text-white'
              : 'bg-espotz-black text-gray-400 border border-gray-700'
          }`}
        >
          NO
        </button>
      </div>
      <button
        onClick={handleResolve}
        disabled={isPending || isConfirming}
        className="btn-success w-full"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Resolving...' : isSuccess ? 'Resolved!' : `Resolve as ${outcome}`}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        className="btn-secondary w-full"
      >
        Cancel
      </button>
    </div>
  );
}
