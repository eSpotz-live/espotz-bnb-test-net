'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

const GAMES = [
  { value: 'cod', label: 'COD Mobile', image: '/games/COD2.png' },
  { value: 'pubg', label: 'PUBG Mobile', image: '/games/pubg.png' },
  { value: 'ff', label: 'FreeFire', image: '/games/FF.png' },
  { value: 'fortnite', label: 'Fortnite', image: '/games/fortnite.png' },
  { value: 'cs', label: 'CS', image: '/games/CS.png' },
  { value: 'lol', label: 'League of Legends', image: '/games/LOL.png' },
  { value: 'valorant', label: 'Valorant', image: '/games/valorant.png' },
];

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTournamentModal({ isOpen, onClose }: CreateTournamentModalProps) {
  const [name, setName] = useState('');
  const [game, setGame] = useState('cod');
  const [description, setDescription] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCreate = () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }
    if (!name || !entryFee || !startTime || !endTime) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);

    // Game label with max players and description encoded
    const gameLabel = GAMES.find(g => g.value === game)?.label || 'Unknown';
    const gameWithMeta = `${gameLabel}|MAX_PLAYERS:${maxPlayers || '0'}|DESC:${description}`;

    // Contract signature: createTournament(name, game, operator, startTime, endTime, entryFee)
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'createTournament',
      args: [
        name,
        gameWithMeta,
        address, // operator is the connected wallet
        BigInt(startTime),
        BigInt(endTime),
        parseUnits(entryFee, 6), // USDT has 6 decimals - entryFee is last
      ],
    } as any);
  };

  const setDefaultTimes = () => {
    const now = Math.floor(Date.now() / 1000);
    setStartTime((now + 86400).toString()); // +1 day
    setEndTime((now + 86400 * 8).toString()); // +8 days
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-espotz-dark-gray rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Create Tournament</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Tournament Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tournament Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Valorant Champions 2025"
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Game Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Game</label>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              >
                {GAMES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Predict the outcomes of Valorant Champions 2025 matches"
                rows={3}
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Entry Fee */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Entry Fee (USDT)</label>
              <input
                type="number"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="10.00"
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Max Players (Optional)
                <span className="text-xs text-gray-500 ml-2">Stored off-chain for now</span>
              </label>
              <input
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                placeholder="100"
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Time (Unix timestamp)</label>
              <input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder={Math.floor(Date.now() / 1000 + 86400).toString()}
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Time (Unix timestamp)</label>
              <input
                type="number"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder={Math.floor(Date.now() / 1000 + 86400 * 8).toString()}
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={setDefaultTimes}
                className="text-xs text-cyan-400 hover:text-cyan-300 mt-2"
              >
                Set default times (starts in 1 day, ends in 8 days)
              </button>
            </div>

            {/* Error Display */}
            {(error || writeError) && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">
                  {error || writeError?.message || 'Transaction failed'}
                </p>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={isPending || isConfirming || !name || !entryFee || !startTime || !endTime}
              className="btn-primary w-full"
            >
              {isPending ? 'Confirm in wallet...' : isConfirming ? 'Creating...' : isSuccess ? 'Created!' : 'Create Tournament'}
            </button>

            {isSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400">
                  Tournament created successfully! Transaction: {hash?.slice(0, 10)}...{hash?.slice(-8)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
