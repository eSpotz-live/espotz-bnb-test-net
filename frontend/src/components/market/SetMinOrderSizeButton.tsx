'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';

export function SetMinOrderSizeButton({ marketId }: { marketId: `0x${string}` }) {
  const [minSize, setMinSize] = useState('');
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSetMinSize = () => {
    if (!minSize) return;
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'setMinOrderSize',
      args: [marketId, parseUnits(minSize, 6)],
    } as any);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Min Order Size (USDT)</label>
        <input
          type="number"
          value={minSize}
          onChange={(e) => setMinSize(e.target.value)}
          placeholder="0.00"
          className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
        />
      </div>
      <button
        onClick={handleSetMinSize}
        disabled={isPending || isConfirming || !minSize}
        className="btn-primary w-full"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Updating...' : isSuccess ? 'Updated!' : 'Set Min Order Size'}
      </button>
    </div>
  );
}
