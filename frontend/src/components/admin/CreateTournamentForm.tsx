'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

const GAMES = [
  { value: 'cod', label: 'COD Mobile' },
  { value: 'pubg', label: 'PUBG Mobile' },
  { value: 'ff', label: 'FreeFire' },
  { value: 'fortnite', label: 'Fortnite' },
  { value: 'cs', label: 'CS' },
  { value: 'lol', label: 'League of Legends' },
  { value: 'valorant', label: 'Valorant' },
];

export function CreateTournamentForm() {
  const [name, setName] = useState('');
  const [game, setGame] = useState('cod');
  const [description, setDescription] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Convert datetime-local to Unix timestamp
  const datetimeToUnix = (datetime: string): number => {
    return Math.floor(new Date(datetime).getTime() / 1000);
  };

  // Get default datetime values (start in 1 day, end in 8 days)
  const getDefaultStartDateTime = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 16);
  };

  const getDefaultEndDateTime = () => {
    const date = new Date();
    date.setDate(date.getDate() + 8);
    return date.toISOString().slice(0, 16);
  };

  const setDefaultTimes = () => {
    setStartDateTime(getDefaultStartDateTime());
    setEndDateTime(getDefaultEndDateTime());
  };

  const handleCreate = () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }
    if (!name || !entryFee || !startDateTime || !endDateTime) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);

    // Game label with max players and description encoded
    const gameLabel = GAMES.find(g => g.value === game)?.label || 'Unknown';
    const gameWithMeta = `${gameLabel}|MAX_PLAYERS:${maxPlayers || '0'}|DESC:${description}`;

    const startUnix = datetimeToUnix(startDateTime);
    const endUnix = datetimeToUnix(endDateTime);

    // Contract signature: createTournament(name, game, operator, startTime, endTime, entryFee)
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'createTournament',
      args: [
        name,
        gameWithMeta,
        address, // operator is the connected wallet
        BigInt(startUnix),
        BigInt(endUnix),
        parseUnits(entryFee, 6), // USDT has 6 decimals - entryFee is last
      ],
    } as any);
  };

  return (
    <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
      <h3 className="text-xl font-bold mb-6">Create New Tournament</h3>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Tournament Name *</label>
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
          <label className="block text-sm text-gray-400 mb-2">Game *</label>
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
            placeholder="Predict the outcomes of your tournament matches"
            rows={2}
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Entry Fee */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Entry Fee (USDT) *</label>
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
          <label className="block text-sm text-gray-400 mb-2">Max Players (Optional)</label>
          <input
            type="number"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            placeholder="100"
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Start Date/Time */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Start Date & Time *</label>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* End Date/Time */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">End Date & Time *</label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
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
          disabled={isPending || isConfirming || !name || !entryFee || !startDateTime || !endDateTime}
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
  );
}
