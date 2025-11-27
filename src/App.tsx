import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HostDashboard from './components/HostDashboard';
import PlayerJoin from './components/PlayerJoin';
import QuizPlayer from './components/QuizPlayer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<HostDashboard />} />
          <Route path="/join/:roomCode" element={<PlayerJoin />} />
          <Route path="/play/:roomCode" element={<QuizPlayer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;