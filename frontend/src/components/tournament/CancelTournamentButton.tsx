'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

export function CancelTournamentButton({ tournamentId }: { tournamentId: `0x${string}` }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCancel = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'cancelTournament',
      args: [tournamentId],
    } as any);
    setShowConfirm(false);
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="btn-danger w-full"
      >
        Cancel Tournament
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-red-400">
        This action cannot be undone. Entry fees will be refunded to participants.
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
