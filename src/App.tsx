import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import StudentEntry from './components/StudentEntry';
import HostDashboard from './components/HostDashboard';
import PlayerJoin from './components/PlayerJoin';
import PlayerLobby from './components/PlayerLobby';
import QuizPlayer from './components/QuizPlayer';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes - no authentication required */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/student" element={<StudentEntry />} />
        <Route path="/join/:roomCode" element={<PlayerJoin />} />
        <Route path="/lobby/:roomId" element={<PlayerLobby />} />
        <Route path="/play/:roomCode" element={<QuizPlayer />} />
      </Routes>
    </Router>
  );
}

export default App;