'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';

export function CancelMarketButton({ marketId }: { marketId: `0x${string}` }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCancel = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'cancelMarket',
      args: [marketId],
    } as any);
    setShowConfirm(false);
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="btn-danger w-full"
      >
        Cancel Market
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-red-400">
        This action cannot be undone. All orders will be refundable.
      </p>
      <button
        onClick={handleCancel}
        disabled={isPending || isConfirming}
        className="btn-danger w-full"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Cancelling...' : isSuccess ? 'Cancelled!' : 'Confirm Cancel'}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        className="btn-secondary w-full"
      >
        Go Back
      </button>
    </div>
  );
}
