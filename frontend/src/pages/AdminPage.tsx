import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { CreateMarketForm } from '@/components/admin/CreateMarketForm';
import { CreateTournamentForm } from '@/components/admin/CreateTournamentForm';
import { AuthorizeMarketButton } from '@/components/admin/AuthorizeMarketButton';
import { DeauthorizeMarketButton } from '@/components/admin/DeauthorizeMarketButton';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';

export default function AdminPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-espotz-black">
      <Navigation currentPage="admin" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
          <p className="text-gray-400">Create and manage markets, tournaments, and system settings</p>
        </div>

        {!isConnected ? (
          <div className="bg-espotz-dark-gray rounded-xl p-12 text-center border border-gray-800">
            <h3 className="text-2xl font-bold mb-4">Connect Your Wallet</h3>
            <p className="text-gray-400 mb-6">Connect your wallet to access admin functions</p>
            <ConnectButton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
              <h3 className="text-yellow-400 font-bold mb-2">⚠️ Admin Functions</h3>
              <p className="text-sm text-gray-400">
                These functions require appropriate permissions. Ensure you have the necessary roles before attempting
                these operations. Unauthorized attempts will fail and consume gas.
              </p>
            </div>

            {/* Create Market & Tournament */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CreateMarketForm />
              <CreateTournamentForm />
            </div>

            {/* Vault Management */}
            <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold mb-6">Vault Market Authorization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4">Authorize Market</h4>
                  <AuthorizeMarketButton />
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Deauthorize Market</h4>
                  <DeauthorizeMarketButton />
                </div>
              </div>
            </div>

            {/* Info Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h4 className="font-bold mb-3">Contract Addresses</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400">Prediction Market</p>
                    <p className="font-mono text-xs break-all text-cyan-400">
                      {ESPOTZ_CONTRACTS.addresses.PredictionMarket}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tournament</p>
                    <p className="font-mono text-xs break-all text-cyan-400">
                      {ESPOTZ_CONTRACTS.addresses.Tournament}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Collateral Vault</p>
                    <p className="font-mono text-xs break-all text-cyan-400">
                      {ESPOTZ_CONTRACTS.addresses.CollateralVault}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">USDT</p>
                    <p className="font-mono text-xs break-all text-cyan-400">
                      {ESPOTZ_CONTRACTS.addresses.USDT}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h4 className="font-bold mb-3">Network Info</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400">Network</p>
                    <p className="font-semibold">{ESPOTZ_CONTRACTS.network}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Chain ID</p>
                    <p className="font-semibold">{ESPOTZ_CONTRACTS.chainId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Explorer</p>
                    <a
                      href={`https://testnet.bscscan.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      BSCScan Testnet
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h4 className="font-bold mb-3">Quick Links</h4>
                <div className="space-y-2 text-sm">
                  <Link to="/markets" className="block text-cyan-400 hover:text-cyan-300">
                    → View All Markets
                  </Link>
                  <Link to="/tournaments" className="block text-cyan-400 hover:text-cyan-300">
                    → View All Tournaments
                  </Link>
                  <Link to="/portfolio" className="block text-cyan-400 hover:text-cyan-300">
                    → Manage Portfolio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
