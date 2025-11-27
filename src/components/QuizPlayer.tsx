import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  type: 'multiple_choice' | 'true_false';
}

interface Player {
  id: string;
  name: string;
  score: number;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const QuizPlayer = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !roomCode) {
      navigate('/');
      return;
    }

    initializePlayer();
  }, [user, roomCode]);

  const initializePlayer = async () => {
    try {
      // Get room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('code', roomCode.toUpperCase())
        .single();

      if (roomError || !roomData) {
        navigate('/');
        return;
      }

      setRoomId(roomData.id);
      setRoomStatus(roomData.status);

      // Get or create player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('user_id', user.id)
        .single();

      if (playerError && playerError.code !== 'PGRST116') {
        console.error('Error finding player:', playerError);
        navigate('/');
        return;
      }

      if (playerData) {
        setPlayerId(playerData.id);
      } else {
        // Player not found, redirect to join
        navigate(`/join/${roomCode}`);
        return;
      }

      // Subscribe to updates
      subscribeToRoom(roomData.id);
      subscribeToPlayers(roomData.id);
      subscribeToCurrentQuestion(roomData.id);

      // Load initial data
      loadPlayers(roomData.id);
      fetchCurrentQuestion(roomData.id);

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing player:', error);
      navigate('/');
    }
  };

  const subscribeToRoom = (roomId: string) => {
    const subscription = supabase
      .channel('room_status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        setRoomStatus(payload.new.status);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const subscribeToPlayers = (roomId: string) => {
    const subscription = supabase
      .channel('players_update')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadPlayers(roomId);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const subscribeToCurrentQuestion = (roomId: string) => {
    const subscription = supabase
      .channel('current_question_update')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'current_question',
        filter: `room_id=eq.${roomId}`
      }, () => {
        fetchCurrentQuestion(roomId);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  };

  useEffect(() => {
    if (currentQuestion && !hasAnswered) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentQuestion, hasAnswered]);

  const fetchCurrentQuestion = async (roomId: string) => {
    const { data } = await supabase
      .from('current_question')
      .select(`
        question_id,
        questions (
          id,
          question_text,
          options,
          type
        )
      `)
      .eq('room_id', roomId)
      .single();

    if (data?.questions) {
      setCurrentQuestion(data.questions as unknown as Question);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setTimeLeft(30);
    } else {
      setCurrentQuestion(null);
    }
  };

  const loadPlayers = async (roomId: string) => {
    const { data } = await supabase
      .from('players')
      .select(`
        id,
        name,
        score,
        profiles (
          full_name,
          email
        )
      `)
      .eq('room_id', roomId)
      .eq('is_connected', true)
      .order('score', { ascending: false });

    if (data) {
      setPlayers(data);
    }
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion || hasAnswered || !playerId) return;

    setHasAnswered(true);

    // Fetch correct answer
    const { data: questionData } = await supabase
      .from('questions')
      .select('correct_answer')
      .eq('id', currentQuestion.id)
      .single();

    const correctAnswer = questionData?.correct_answer;
    const isCorrect = selectedAnswer === correctAnswer;

    // Submit answer
    await supabase
      .from('answers')
      .insert([{
        player_id: playerId,
        question_id: currentQuestion.id,
        answer: selectedAnswer,
        is_correct: isCorrect,
        time_taken: 30 - timeLeft
      }]);

    // Update score if correct
    if (isCorrect) {
      const { data: playerData } = await supabase
        .from('players')
        .select('score')
        .eq('id', playerId)
        .single();

      const newScore = (playerData?.score || 0) + 10;

      await supabase
        .from('players')
        .update({ score: newScore })
        .eq('id', playerId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (roomStatus === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-center mb-6">Quiz Ended!</h1>
          <h2 className="text-xl font-semibold mb-4">Final Leaderboard</h2>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div key={player.id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                <span className="font-semibold">#{index + 1} {player.name}</span>
                <span className="text-lg font-bold">{player.score} points</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (roomStatus === 'waiting' || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Waiting for quiz to start...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Room: {roomCode}</h1>
            <div className="text-right">
              <div className="text-sm text-gray-600">Time Left</div>
              <div className="text-3xl font-bold text-red-500">{timeLeft}s</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">{currentQuestion.question_text}</h2>

            <div className={`grid gap-4 ${currentQuestion.type === 'multiple_choice' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !hasAnswered && setSelectedAnswer(index)}
                  disabled={hasAnswered}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    selectedAnswer === index
                      ? 'bg-blue-500 text-white'
                      : hasAnswered
                      ? 'bg-gray-200 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <span className="font-semibold mr-2">
                    {currentQuestion.type === 'multiple_choice' ? String.fromCharCode(65 + index) : ''}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </div>

          {!hasAnswered && (
            <button
              onClick={submitAnswer}
              disabled={selectedAnswer === null}
              className="w-full bg-green-500 text-white py-3 rounded font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Submit Answer
            </button>
          )}

          {hasAnswered && (
            <div className="text-center text-green-600 font-semibold">
              Answer submitted! Waiting for next question...
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
          <div className="space-y-2">
            {players.slice(0, 10).map((player, index) => (
              <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>#{index + 1} {player.name}</span>
                <span className="font-semibold">{player.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPlayer;