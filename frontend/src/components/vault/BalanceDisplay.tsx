'use client';

import { useAccount } from 'wagmi';
import { useVaultBalance } from '@/hooks/useCollateralVault';
import { formatUnits } from 'viem';

export function BalanceDisplay() {
  const { address } = useAccount();
  const { totalBalance, lockedBalance, availableBalance } = useVaultBalance(address);

  return (
    <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
      <h3 className="text-xl font-bold mb-4">Vault Balance</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Deposited:</span>
          <span className="text-white font-semibold">
            {totalBalance ? formatUnits(totalBalance, 6) : '0.00'} USDT
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Locked in Positions:</span>
          <span className="text-orange-400 font-semibold">
            {lockedBalance ? formatUnits(lockedBalance, 6) : '0.00'} USDT
          </span>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-700">
          <span className="text-gray-200">Available to Trade:</span>
          <span className="text-green-400 font-bold text-lg">
            {formatUnits(availableBalance, 6)} USDT
          </span>
        </div>
      </div>
    </div>
  );
}
