'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

export function WithdrawFeesButton({ tournamentId }: { tournamentId: `0x${string}` }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleWithdraw = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'withdrawEntryFees',
      args: [tournamentId],
    } as any);
  };

  return (
    <button
      onClick={handleWithdraw}
      disabled={isPending || isConfirming}
      className="btn-success w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Withdrawing...' : isSuccess ? 'Withdrawn!' : 'Withdraw Entry Fees'}
    </button>
  );
}
