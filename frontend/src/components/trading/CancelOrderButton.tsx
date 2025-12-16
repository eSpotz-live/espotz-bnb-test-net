'use client';

import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';
import { useCancelOrder } from '@/hooks/usePredictionMarket';

export function CancelOrderButton({ orderId }: { orderId: `0x${string}` }) {
  const { writeContract, isPending, isConfirming } = useCancelOrder();

  const handleCancel = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'cancelOrder',
      args: [orderId],
    } as any);
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isPending || isConfirming}
      className="btn-outline-danger"
    >
      {isPending ? '...' : isConfirming ? 'Cancelling...' : 'Cancel'}
    </button>
  );
}
