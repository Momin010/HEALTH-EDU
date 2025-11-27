import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [roomCode, setRoomCode] = useState('');

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
          {profile && (
            <div className="mt-4 text-sm text-gray-500">
              <p>Welcome, {profile.full_name || profile.email}!</p>
              <p className="capitalize">Role: {profile.role}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Create Room Button - Only for teachers */}
          {profile?.role === 'teacher' && (
            <button
              onClick={() => navigate('/host')}
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors shadow-lg"
            >
              Create Room (Teacher)
            </button>
          )}

          {/* Join Room Section */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {profile?.role === 'teacher' ? 'Or join a room as a student:' : 'Join an existing room:'}
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter Room Code"
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono tracking-wider focus:outline-none focus:border-blue-500"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Student Entry Link - For teachers to share with students */}
          {profile?.role === 'teacher' && (
            <div className="text-center border-t pt-6">
              <p className="text-gray-600 mb-3">Share this link with your students:</p>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.origin + '/student')}
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                {window.location.origin}/student
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={signOut}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Perfect for health education quizzes!</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;