import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { calculatePoints, QUIZ_CONFIG } from "../data/quizQuestions";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  type: "multiple_choice" | "true_false";
  order_index: number;
}

interface Room {
  id: string;
  code: string;
  status: "waiting" | "active" | "finished";
  current_question_index: number;
}

interface CurrentQuestion {
  question_id: string;
  question_index: number;
  time_limit: number;
}

interface PlayerSession {
  roomCode: string;
  playerId: string;
  playerName: string;
  timestamp: number;
}

const QuizPlayer = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(QUIZ_CONFIG.TIME_LIMIT);
  const [players, setPlayers] = useState<any[]>([]);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);

  const questionChannelRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!roomCode || roomCode === 'undefined') {
      navigate('/');
      return;
    }

    // Check for existing session
    const savedSession = localStorage.getItem(`quiz_session_${roomCode}`);
    if (!savedSession) {
      // No session, redirect to join
      navigate(`/join/${roomCode}`);
      return;
    }

    const session: PlayerSession = JSON.parse(savedSession);
    setPlayerSession(session);

    initializePlayer(session);
  }, [roomCode, navigate]);

  const initializePlayer = async (session: PlayerSession) => {
    if (!roomCode) return;

    // Get room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) {
      // Room not found, clear session
      localStorage.removeItem(`quiz_session_${roomCode}`);
      navigate(`/join/${roomCode}`);
      return;
    }

    // Verify player still exists
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', session.playerId)
      .eq('room_id', roomData.id)
      .single();

    if (playerError || !playerData) {
      // Player not found, clear session
      localStorage.removeItem(`quiz_session_${roomCode}`);
      navigate(`/join/${roomCode}`);
      return;
    }

    // Load questions and subscribe
    loadQuestions(roomData.id);
    subscribeToCurrentQuestion(roomData.id);
    subscribeToRoomUpdates(roomData.id);
    loadPlayers(roomData.id);
  };

  const loadQuestions = async (roomId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('room_id', roomId)
      .order('order_index');

    if (!error && data) {
      console.log('Loaded questions:', data);
      setAllQuestions(data);
    } else if (error) {
      console.error('Error loading questions:', error);
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
          console.log('🔥 CURRENT QUESTION UPDATE:', payload);
          console.log('All questions available:', allQuestions);
          const cq = payload.new as CurrentQuestion;
          if (cq && cq.question_id) {
            console.log('Looking for question with ID:', cq.question_id);
            const question = allQuestions.find((q) => q.id === cq.question_id);
            if (question) {
              console.log('✅ FOUND QUESTION:', question);
              setCurrentQuestion(question);
              setSelectedAnswer(null);
              setTimeLeft(cq.time_limit || QUIZ_CONFIG.TIME_LIMIT);
              startTimer(QUIZ_CONFIG.TIME_LIMIT);
            } else {
              console.log('❌ Question not found for ID:', cq.question_id);
              console.log('Available questions:', allQuestions);
            }
          } else {
            console.log('❌ No question_id in payload:', cq);
          }
        }
      )
      .subscribe();

    console.log('🎯 Subscribed to current_question for room:', roomId);

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
        submitAnswer(); // auto-submit with 0 points
      }
    }, 1000);
  };

  const submitAnswer = async () => {
    if (!currentQuestion || selectedAnswer === null || !playerSession) return;

    // Calculate points based on speed (time left)
    const pointsEarned = calculatePoints(timeLeft);
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    const finalPoints = isCorrect ? pointsEarned : 0;

    // Submit answer
    await supabase
      .from('answers')
      .insert([{
        player_id: playerSession.playerId,
        question_id: currentQuestion.id,
        answer: selectedAnswer,
        is_correct: isCorrect
      }]);

    // Update player score if answer is correct
    if (finalPoints > 0) {
      // First get current score
      const { data: currentPlayer } = await supabase
        .from('players')
        .select('score')
        .eq('id', playerSession.playerId)
        .single();
      
      if (currentPlayer) {
        const newScore = currentPlayer.score + finalPoints;
        await supabase
          .from('players')
          .update({ score: newScore })
          .eq('id', playerSession.playerId);
      }
    }

    setSelectedAnswer(null);
  };

  const subscribeToRoomUpdates = (roomId: string) => {
    const channel = supabase
      .channel(`player_room_${roomId}`)
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
          event: "*",
        },
        async (payload) => {
          console.log('Room update:', payload);
          const updated = payload.new as Room;
          if (updated && updated.status === 'active') {
            // Quiz started, reload questions to ensure we have the latest
            await loadQuestions(roomId);
          }
        }
      )
      .subscribe();

    questionChannelRef.current = channel;
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
        profiles: player.profiles && player.profiles.length > 0 ? {
          full_name: player.profiles[0].full_name,
          email: player.profiles[0].email
        } : undefined
      }));
      setPlayers(transformedPlayers);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionChannelRef.current) {
        try {
          questionChannelRef.current.unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing channel:', e);
        }
      }
    };
  }, []);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Odotetaan seuraavaa kysymystä...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Kysymyksiä ladattu: {allQuestions.length}</p>
          <p className="text-gray-600">Huone: {roomCode}</p>
          <p className="text-gray-500 text-sm mt-2">
            Tarkista konsoli (F12) nähdäksesi debug-tietoja
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Terveystieto KPL36</h1>
            <div className="text-right">
              <div className="text-sm text-gray-600">Aikaa jäljellä</div>
              <div className="text-3xl font-bold text-red-500">{timeLeft}s</div>
              <div className="text-sm text-green-600">
                Max pistettä: {QUIZ_CONFIG.MAX_POINTS}
              </div>
              {selectedAnswer === null && (
                <div className="text-sm text-blue-600">
                  Ansaittavissa: {calculatePoints(timeLeft)} pistettä
                </div>
              )}
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