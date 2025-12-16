'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';

export function CreateMarketForm() {
  const [question, setQuestion] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [minOrderSize, setMinOrderSize] = useState('');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCreate = () => {
    if (!question || !resolutionTime || !minOrderSize) return;

    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'createMarket',
      args: [
        question,
        BigInt(resolutionTime),
        parseUnits(minOrderSize, 6)
      ],
    } as any);
  };

  const setDefaultResolutionTime = (days: number) => {
    const timestamp = Math.floor(Date.now() / 1000 + days * 86400);
    setResolutionTime(timestamp.toString());
  };

  return (
    <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
      <h3 className="text-xl font-bold mb-6">Create New Market</h3>

      <div className="space-y-4">
        {/* Question */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will Team A win the tournament?"
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Resolution Time */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Resolution Time (Unix timestamp)</label>
          <input
            type="number"
            value={resolutionTime}
            onChange={(e) => setResolutionTime(e.target.value)}
            placeholder={Math.floor(Date.now() / 1000 + 86400).toString()}
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setDefaultResolutionTime(1)}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              +1 day
            </button>
            <button
              onClick={() => setDefaultResolutionTime(7)}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              +7 days
            </button>
            <button
              onClick={() => setDefaultResolutionTime(30)}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              +30 days
            </button>
          </div>
        </div>

        {/* Min Order Size */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Minimum Order Size (USDT)</label>
          <input
            type="number"
            value={minOrderSize}
            onChange={(e) => setMinOrderSize(e.target.value)}
            placeholder="1.00"
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={isPending || isConfirming || !question || !resolutionTime || !minOrderSize}
          className="btn-primary w-full"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Creating...' : isSuccess ? 'Created!' : 'Create Market'}
        </button>

        {isSuccess && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400">
              Market created successfully! Transaction hash: {hash?.slice(0, 10)}...{hash?.slice(-8)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
