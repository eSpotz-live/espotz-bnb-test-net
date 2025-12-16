'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { COLLATERAL_VAULT_ABI } from '@/contracts/abis';

export function DeauthorizeMarketButton() {
  const [marketAddress, setMarketAddress] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleDeauthorize = () => {
    if (!marketAddress) return;
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
      abi: COLLATERAL_VAULT_ABI,
      functionName: 'deauthorizeMarket',
      args: [marketAddress as `0x${string}`],
    } as any);
    setShowConfirm(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Market Address</label>
        <input
          type="text"
          value={marketAddress}
          onChange={(e) => setMarketAddress(e.target.value)}
          placeholder="0x..."
          className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!marketAddress}
          className="btn-danger w-full"
        >
          Deauthorize Market
        </button>
      ) : (
        <>
          <p className="text-sm text-red-400">
            This will prevent the market from accessing the vault. Confirm deauthorization?
          </p>
          <button
            onClick={handleDeauthorize}
            disabled={isPending || isConfirming}
            className="btn-danger w-full"
          >
            {isPending ? 'Confirming...' : isConfirming ? 'Deauthorizing...' : isSuccess ? 'Deauthorized!' : 'Confirm Deauthorize'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="btn-secondary w-full"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
