'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

export function StartTournamentButton({ tournamentId }: { tournamentId: `0x${string}` }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleStart = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'startTournament',
      args: [tournamentId],
    } as any);
  };

  return (
    <button
      onClick={handleStart}
      disabled={isPending || isConfirming}
      className="btn-success w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Starting...' : isSuccess ? 'Started!' : 'Start Tournament'}
    </button>
  );
}
