import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PlayerJoin = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user already has a session for this room
    const savedSession = localStorage.getItem(`quiz_session_${roomCode}`);
    if (savedSession) {
      const session = JSON.parse(savedSession);
      if (session.playerName && session.playerId) {
        // User already joined, go directly to play
        navigate(`/play/${roomCode}`);
        return;
      }
    }
  }, [roomCode, navigate]);

  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode) return;

    setIsLoading(true);
    setError('');

    try {
      // Check if room exists
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('code', roomCode.toUpperCase())
        .single();

      console.log('Room check:', { room, roomError, roomCode: roomCode.toUpperCase() });

      if (roomError || !room) {
        console.error('Room error:', roomError);
        setError('Room not found: ' + (roomError?.message || 'Unknown error'));
        setIsLoading(false);
        return;
      }

      if (room.status !== 'waiting' && room.status !== 'active') {
        setError('Room is not available');
        setIsLoading(false);
        return;
      }

      // Check if player with this name already exists in room
      const { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id)
        .eq('name', playerName.trim())
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

      console.log('Checking existing player:', { existingPlayer, checkError });

      let playerId: string;

      if (existingPlayer) {
        // Reconnect existing player
        playerId = existingPlayer.id;
        // Update connection status
        await supabase
          .from('players')
          .update({ is_connected: true })
          .eq('id', playerId);
      } else {
        // Create new player
        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert([{
            room_id: room.id,
            name: playerName.trim(),
            score: 0,
            is_connected: true
          }])
          .select()
          .single();

        console.log('Creating new player:', { newPlayer, playerError });

        if (playerError || !newPlayer) {
          console.error('Player creation error:', playerError);
          setError('Failed to join room: ' + (playerError?.message || 'Unknown error'));
          setIsLoading(false);
          return;
        }

        playerId = newPlayer.id;
      }

      // Save session to localStorage for persistence
      const session = {
        roomCode: roomCode.toUpperCase(),
        playerId,
        playerName: playerName.trim(),
        timestamp: Date.now()
      };
      localStorage.setItem(`quiz_session_${roomCode}`, JSON.stringify(session));

      // Navigate to quiz player
      navigate(`/play/${roomCode}`);
    } catch (err) {
      console.error('Error joining room:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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