import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import HostDashboard from './components/HostDashboard';
import PlayerJoin from './components/PlayerJoin';
import QuizPlayer from './components/QuizPlayer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/join/:roomCode" element={<PlayerJoin />} />
        <Route path="/play/:roomCode" element={<QuizPlayer />} />
      </Routes>
    </Router>
  );
}

export default App;