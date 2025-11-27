import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from '../contexts/AuthContext';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  type: "multiple_choice" | "true_false";
  order_index: number;
}

interface CurrentQuestion {
  question_id: string;
  question_index: number;
  time_limit: number;
}

const QuizPlayer = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [score, setScore] = useState<number>(0);
  const [players, setPlayers] = useState<any[]>([]);

  const questionChannelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !roomCode || roomCode === 'undefined') {
      navigate('/');
      return;
    }

    initializePlayer();
  }, [user, roomCode]);

  const initializePlayer = async () => {
    if (!user || !roomCode) return;

    // Get room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) {
      navigate('/');
      return;
    }

    // Get or create player
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomData.id)
      .eq('user_id', user!.id)
      .single();

    if (playerError && playerError.code !== 'PGRST116') {
      console.error('Error finding player:', playerError);
      return;
    }

    // Load questions and subscribe
    loadQuestions(roomData.id);
    subscribeToCurrentQuestion(roomData.id);
    loadPlayers(roomData.id);
  };

  const loadQuestions = async (roomId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('room_id', roomId)
      .order('order_index');

    if (!error && data) {
      setAllQuestions(data);
    }
  };

  // Subscribe to current_question table
  const subscribeToCurrentQuestion = (roomId: string) => {
    const channel = supabase
      .channel(`current_question_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'current_question',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const cq: CurrentQuestion = payload.new;
          const question = allQuestions.find((q) => q.id === cq.question_id);
          if (question) {
            setCurrentQuestion(question);
            setSelectedAnswer(null);
            setTimeLeft(cq.time_limit);
            startTimer(cq.time_limit);
          }
        }
      )
      .subscribe();

    questionChannelRef.current = channel;
  };

  const startTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let time = duration;
    setTimeLeft(time);

    timerRef.current = setInterval(() => {
      time -= 1;
      setTimeLeft(time);
      if (time <= 0) {
        clearInterval(timerRef.current!);
        submitAnswer(); // auto-submit
      }
    }, 1000);
  };

  const submitAnswer = async () => {
    if (!currentQuestion || selectedAnswer === null || !user) return;

    // Submit answer
    await supabase
      .from('answers')
      .insert([{
        player_id: user.id, // This should be the player id, not user id
        question_id: currentQuestion.id,
        answer: selectedAnswer,
        is_correct: selectedAnswer === currentQuestion.correct_answer
      }]);

    setSelectedAnswer(null);
  };

  const loadPlayers = async (roomId: string) => {
    const { data } = await supabase
      .from('players')
      .select(`
        id,
        name,
        score,
        profiles!inner (
          full_name,
          email
        )
      `)
      .eq('room_id', roomId)
      .eq('is_connected', true)
      .order('score', { ascending: false });

    if (data) {
      // Transform the data to match our Player interface
      const transformedPlayers: any[] = data.map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        profiles: player.profiles ? {
          full_name: player.profiles.full_name,
          email: player.profiles.email
        } : undefined
      }));
      setPlayers(transformedPlayers);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      questionChannelRef.current?.unsubscribe?.();
    };
  }, []);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Waiting for next question...</h1>
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
                  onClick={() => setSelectedAnswer(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-3 rounded border ${
                    selectedAnswer === index
                      ? selectedAnswer === currentQuestion.correct_answer
                        ? "bg-green-400 text-white"
                        : "bg-red-400 text-white"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </div>

          {selectedAnswer !== null && (
            <button
              onClick={submitAnswer}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Submit Answer
            </button>
          )}

          {selectedAnswer !== null && (
            <div className="text-center text-green-600 font-semibold mt-4">
              Answer submitted!
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