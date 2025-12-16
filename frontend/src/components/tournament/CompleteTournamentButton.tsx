'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

export function CompleteTournamentButton({ tournamentId }: { tournamentId: `0x${string}` }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleComplete = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'completeTournament',
      args: [tournamentId],
    } as any);
    setShowConfirm(false);
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="btn-primary w-full"
      >
        Complete Tournament
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        This will finalize the tournament and distribute prizes to winners.
      </p>
      <button
        onClick={handleComplete}
        disabled={isPending || isConfirming}
        className="btn-success w-full"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Completing...' : isSuccess ? 'Completed!' : 'Confirm Complete'}
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
