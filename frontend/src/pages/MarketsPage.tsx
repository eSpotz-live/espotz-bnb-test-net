import { useState } from 'react';
import { MarketCard } from '@/components/market/MarketCard';
import { useMarketIds } from '@/hooks/usePredictionMarket';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { FaucetButton } from '@/components/common/FaucetButton';

export default function MarketsPage() {
  const { data: marketIds, isLoading, error } = useMarketIds();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved' | 'cancelled'>('all');

  const marketIdList = (marketIds as `0x${string}`[]) || [];

  return (
    <div className="min-h-screen bg-espotz-black">
      <Navigation currentPage="markets" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Prediction Markets</h1>
              <p className="text-gray-400">Trade on the outcomes of esports events</p>
            </div>
            <FaucetButton variant="compact" showBalance />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-espotz-dark-gray rounded-xl p-6 mb-8 border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Search Markets</label>
              <input
                type="text"
                placeholder="Search by question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-espotz-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Filter by Status</label>
              <div className="flex gap-2">
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
                  onClick={() => setFilterStatus('resolved')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'resolved'
                      ? 'bg-blue-500 text-white'
                      : 'bg-espotz-black text-gray-400 hover:text-white'
                  }`}
                >
                  Resolved
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

        {/* Markets Grid */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-gray-400">Loading markets...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-red-400">Error loading markets. Please try again later.</p>
          </div>
        )}

        {!isLoading && !error && marketIdList.length === 0 && (
          <div className="bg-espotz-dark-gray rounded-xl p-12 text-center border border-gray-800">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold mb-2">No Markets Yet</h3>
            <p className="text-gray-400">Check back soon for new prediction markets!</p>
          </div>
        )}

        {!isLoading && !error && marketIdList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketIdList.map((marketId) => (
              <MarketCard key={marketId} marketId={marketId} />
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold mb-4">How Prediction Markets Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-cyan-400 text-xl font-bold">1</span>
              </div>
              <h4 className="font-semibold mb-2">Buy Shares</h4>
              <p className="text-sm text-gray-400">
                Purchase YES or NO shares based on your prediction of the outcome
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-purple-400 text-xl font-bold">2</span>
              </div>
              <h4 className="font-semibold mb-2">Trade Freely</h4>
              <p className="text-sm text-gray-400">
                Trade shares at any time before the market resolves using the order book
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-green-400 text-xl font-bold">3</span>
              </div>
              <h4 className="font-semibold mb-2">Claim Winnings</h4>
              <p className="text-sm text-gray-400">
                When the market resolves, claim 10,000 USDT per winning share
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
