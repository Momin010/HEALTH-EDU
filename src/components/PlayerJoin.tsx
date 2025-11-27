import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PlayerJoin = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode) return;

    // Check if room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      setError('Room not found');
      return;
    }

    if (room.status !== 'waiting' && room.status !== 'active') {
      setError('Room is not available');
      return;
    }

    // Add player to room
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([{
        room_id: room.id,
        name: playerName.trim(),
        score: 0
      }])
      .select()
      .single();

    if (playerError) {
      setError('Failed to join room');
      return;
    }

    // Navigate to quiz player
    navigate(`/play/${roomCode}`, { state: { playerId: player.id } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Join Quiz</h1>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Room Code</label>
          <div className="text-center text-2xl font-mono bg-gray-100 p-4 rounded">
            {roomCode?.toUpperCase()}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-center">
            {error}
          </div>
        )}

        <button
          onClick={joinRoom}
          disabled={!playerName.trim()}
          className="w-full bg-blue-500 text-white py-3 rounded font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Join Quiz
        </button>
      </div>
    </div>
  );
};

export default PlayerJoin;