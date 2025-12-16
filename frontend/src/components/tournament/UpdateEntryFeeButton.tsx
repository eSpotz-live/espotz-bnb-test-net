'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

export function UpdateEntryFeeButton({ tournamentId }: { tournamentId: `0x${string}` }) {
  const [entryFee, setEntryFee] = useState('');
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleUpdate = () => {
    if (!entryFee) return;
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'updateEntryFee',
      args: [tournamentId, parseUnits(entryFee, 6)],
    } as any);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-400 mb-2">New Entry Fee (USDT)</label>
        <input
          type="number"
          value={entryFee}
          onChange={(e) => setEntryFee(e.target.value)}
          placeholder="0.00"
          className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
        />
      </div>
      <button
        onClick={handleUpdate}
        disabled={isPending || isConfirming || !entryFee}
        className="btn-warning w-full"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Updating...' : isSuccess ? 'Updated!' : 'Update Entry Fee'}
      </button>
    </div>
  );
}
