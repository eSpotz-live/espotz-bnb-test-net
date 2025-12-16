import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface NavigationProps {
  currentPage?: 'home' | 'tournaments' | 'markets' | 'portfolio' | 'admin';
}

export function Navigation({ currentPage = 'home' }: NavigationProps) {
  const isActive = (page: string) => currentPage === page;

  return (
    <nav className="bg-espotz-dark-gray border-b border-espotz-mid-gray">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center">
            <img
              src="/espotz-logo.svg"
              alt="Espotz Logo"
              className="h-10 w-auto"
            />
          </Link>
          <div className="hidden md:flex gap-6">
            <Link
              to="/tournaments"
              className={`transition ${isActive('tournaments') ? 'text-cyan-400 font-semibold' : 'text-gray-300 hover:text-cyan-400'}`}
            >
              Tournaments
            </Link>
            <Link
              to="/markets"
              className={`transition ${isActive('markets') ? 'text-cyan-400 font-semibold' : 'text-gray-300 hover:text-cyan-400'}`}
            >
              Markets
            </Link>
            <Link
              to="/portfolio"
              className={`transition ${isActive('portfolio') ? 'text-cyan-400 font-semibold' : 'text-gray-300 hover:text-cyan-400'}`}
            >
              Portfolio
            </Link>
            <Link
              to="/admin"
              className={`transition ${isActive('admin') ? 'text-cyan-400 font-semibold' : 'text-gray-300 hover:text-cyan-400'}`}
            >
              Admin
            </Link>
          </div>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
