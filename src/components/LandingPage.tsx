import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [hasHostSession, setHasHostSession] = useState(false);

  useEffect(() => {
    // Check if user has an active host session
    const hostSession = localStorage.getItem('host_session');
    if (hostSession) {
      const session = JSON.parse(hostSession);
      // Check if session is recent (within 24 hours)
      if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
        setHasHostSession(true);
      } else {
        localStorage.removeItem('host_session');
      }
    }
  }, []);

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      navigate(`/join/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Kahooot Clone</h1>
          <p className="text-gray-600">Interactive Quiz Platform</p>
        </div>

        <div className="space-y-6">
          {/* User Type Selection */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">What would you like to do?</p>
          </div>

          {hasHostSession ? (
            <button
              onClick={() => navigate('/host')}
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors shadow-lg"
            >
              Continue Hosting Quiz
            </button>
          ) : (
            <button
              onClick={() => navigate('/host')}
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors shadow-lg"
            >
              Create New Quiz
            </button>
          )}

          <button
            onClick={() => navigate('/student')}
            className="w-full bg-green-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-600 transition-colors shadow-lg"
          >
            Join Quiz as Student
          </button>

          {/* Quick Join Section */}
          <div className="text-center border-t pt-6">
            <p className="text-gray-600 mb-4">Or join directly with a room code:</p>
            <div className="space-y-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter Room Code"
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono tracking-wider focus:outline-none focus:border-green-500"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                Quick Join
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Perfect for health education quizzes!</p>
          <p className="mt-2">Everything saved locally - no accounts needed!</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;