import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import StudentEntry from './components/StudentEntry';
import HostDashboard from './components/HostDashboard';
import PlayerJoin from './components/PlayerJoin';
import PlayerLobby from './components/PlayerLobby';
import QuizPlayer from './components/QuizPlayer';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Teacher routes - require authentication */}
      <Route path="/host" element={user ? <HostDashboard /> : <Auth onAuthSuccess={() => {}} />} />

      {/* Student routes - no authentication required */}
      <Route path="/student" element={<StudentEntry />} />
      <Route path="/join/:roomCode" element={<PlayerJoin />} />
      <Route path="/lobby/:roomId" element={<PlayerLobby />} />
      <Route path="/play/:roomCode" element={<QuizPlayer />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;