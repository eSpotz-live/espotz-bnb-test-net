import { Link } from 'react-router-dom';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-espotz-black">
      <Navigation currentPage="home" />

      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-6">
            Trade on Esports Outcomes
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Predict the future of competitive gaming with decentralized prediction markets on BNB Smart Chain
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/markets" className="btn-primary">
              Explore Markets
            </Link>
            <Link to="/tournaments" className="btn-secondary">
              View Tournaments
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="card p-6">
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-bold mb-2">Esports Markets</h3>
            <p className="text-gray-400">
              Trade on outcomes of major esports tournaments including Valorant, CS2, Dota 2, and more
            </p>
          </div>

          <div className="card p-6">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Central Limit Order Book</h3>
            <p className="text-gray-400">
              Professional trading experience with order books, market depth, and instant execution
            </p>
          </div>

          <div className="card p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Fully Collateralized</h3>
            <p className="text-gray-400">
              All positions backed 1:1 by USDT collateral for guaranteed settlements
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
