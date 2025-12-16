'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';

export function ResumeMarketButton({ marketId }: { marketId: `0x${string}` }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleResume = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'resumeMarket',
      args: [marketId],
    } as any);
  };

  return (
    <button
      onClick={handleResume}
      disabled={isPending || isConfirming}
      className="btn-success w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Resuming...' : isSuccess ? 'Resumed!' : 'Resume Market'}
    </button>
  );
}
