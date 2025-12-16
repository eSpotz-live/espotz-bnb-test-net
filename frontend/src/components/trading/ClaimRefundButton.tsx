'use client';

import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';
import { useClaimRefund } from '@/hooks/usePredictionMarket';

export function ClaimRefundButton({ marketId }: { marketId: `0x${string}` }) {
  const { writeContract, isPending, isConfirming } = useClaimRefund();

  const handleRefund = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'claimRefund',
      args: [marketId],
    } as any);
  };

  return (
    <button
      onClick={handleRefund}
      disabled={isPending || isConfirming}
      className="btn-warning w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Claim Refund'}
    </button>
  );
}
