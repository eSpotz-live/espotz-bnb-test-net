'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';

export function PauseMarketButton({ marketId }: { marketId: `0x${string}` }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handlePause = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'pauseMarket',
      args: [marketId],
    } as any);
  };

  return (
    <button
      onClick={handlePause}
      disabled={isPending || isConfirming}
      className="btn-warning w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Pausing...' : isSuccess ? 'Paused!' : 'Pause Market'}
    </button>
  );
}
