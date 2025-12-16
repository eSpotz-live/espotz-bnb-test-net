'use client';

import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';
import { useClaimWinnings } from '@/hooks/usePredictionMarket';

export function ClaimWinningsButton({ marketId }: { marketId: `0x${string}` }) {
  const { writeContract, isPending, isConfirming, isSuccess } = useClaimWinnings();

  const handleClaim = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'claimWinnings',
      args: [marketId],
    } as any);
  };

  return (
    <button
      onClick={handleClaim}
      disabled={isPending || isConfirming}
      className="btn-success w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Claiming...' : isSuccess ? 'Claimed!' : 'Claim Winnings'}
    </button>
  );
}
