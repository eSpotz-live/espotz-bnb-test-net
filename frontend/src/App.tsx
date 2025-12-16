import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MarketsPage from './pages/MarketsPage'
import MarketDetailPage from './pages/MarketDetailPage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentDetailPage from './pages/TournamentDetailPage'
import PortfolioPage from './pages/PortfolioPage'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/markets" element={<MarketsPage />} />
      <Route path="/markets/:marketId" element={<MarketDetailPage />} />
      <Route path="/tournaments" element={<TournamentsPage />} />
      <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
