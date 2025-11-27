import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentEntry = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      navigate(`/join/${roomCode.trim().toUpperCase()}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Join Quiz</h1>
          <p className="text-gray-600">Enter your room code to start playing!</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter Room Code"
              className="w-full p-4 border-2 border-gray-300 rounded-lg text-center text-3xl font-mono tracking-wider focus:outline-none focus:border-green-500"
              maxLength={6}
              autoFocus
            />
            <button
              onClick={handleJoinRoom}
              disabled={!roomCode.trim()}
              className="w-full bg-green-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              Join Quiz
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🎓 Perfect for health education learning!</p>
          <p className="mt-2">Ask your teacher for the room code</p>
        </div>
      </div>
    </div>
  );
};

export default StudentEntry;