'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { COLLATERAL_VAULT_ABI } from '@/contracts/abis';

export function AuthorizeMarketButton() {
  const [marketAddress, setMarketAddress] = useState('');
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleAuthorize = () => {
    if (!marketAddress) return;
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
      abi: COLLATERAL_VAULT_ABI,
      functionName: 'authorizeMarket',
      args: [marketAddress as `0x${string}`],
    } as any);
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
      <button
        onClick={handleAuthorize}
        disabled={isPending || isConfirming || !marketAddress}
        className="btn-success w-full"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Authorizing...' : isSuccess ? 'Authorized!' : 'Authorize Market'}
      </button>
    </div>
  );
}
