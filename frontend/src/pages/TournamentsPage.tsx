import { useState } from 'react';
import { TournamentCard } from '@/components/tournament/TournamentCard';
import { useTournamentIds } from '@/hooks/useTournament';
import { Navigation } from '@/components/layout/Navigation';
import { CreateTournamentModal } from '@/components/tournament/CreateTournamentModal';
import { Footer } from '@/components/layout/Footer';
import { FaucetButton } from '@/components/common/FaucetButton';

export default function TournamentsPage() {
  const { data: tournamentIds, isLoading, error } = useTournamentIds();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'active' | 'completed' | 'cancelled'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const tournamentIdList = (tournamentIds as `0x${string}`[]) || [];

  return (
    <div className="min-h-screen bg-espotz-black">
      <Navigation currentPage="tournaments" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Tournaments</h1>
              <p className="text-gray-400">Compete in organized esports prediction tournaments</p>
            </div>
            <div className="flex items-center gap-3">
              <FaucetButton variant="compact" showBalance />
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                Create Tournament
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-espotz-dark-gray rounded-xl p-6 mb-8 border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Search Tournaments</label>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Filter by Status</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'all'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-espotz-black text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('open')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'open'
                      ? 'bg-blue-500 text-white'
                      : 'bg-espotz-black text-gray-400 hover:text-white'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-espotz-black text-gray-400 hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'completed'
                      ? 'bg-purple-500 text-white'
                      : 'bg-espotz-black text-gray-400 hover:text-white'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilterStatus('cancelled')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'cancelled'
                      ? 'bg-red-500 text-white'
                      : 'bg-espotz-black text-gray-400 hover:text-white'
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tournaments Grid */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-gray-400">Loading tournaments...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-red-400">Error loading tournaments. Please try again later.</p>
          </div>
        )}

        {!isLoading && !error && tournamentIdList.length === 0 && (
          <div className="bg-espotz-dark-gray rounded-xl p-12 text-center border border-gray-800">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold mb-2">No Tournaments Yet</h3>
            <p className="text-gray-400">Check back soon for upcoming tournaments!</p>
          </div>
        )}

        {!isLoading && !error && tournamentIdList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournamentIdList.map((tournamentId) => (
              <TournamentCard key={tournamentId} tournamentId={tournamentId} />
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold mb-4">How Tournaments Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-cyan-400 text-xl font-bold">1</span>
              </div>
              <h4 className="font-semibold mb-2">Register</h4>
              <p className="text-sm text-gray-400">
                Pay the entry fee to join the tournament and compete for the prize pool
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-purple-400 text-xl font-bold">2</span>
              </div>
              <h4 className="font-semibold mb-2">Trade</h4>
              <p className="text-sm text-gray-400">
                Make predictions on tournament markets to earn points and climb the leaderboard
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-green-400 text-xl font-bold">3</span>
              </div>
              <h4 className="font-semibold mb-2">Win Prizes</h4>
              <p className="text-sm text-gray-400">
                Top performers share the prize pool when the tournament completes
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
