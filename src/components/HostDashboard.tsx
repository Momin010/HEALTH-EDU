import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Question {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  type: 'multiple_choice' | 'true_false';
  order_index: number;
}

interface Room {
  id: string;
  code: string;
  status: 'waiting' | 'active' | 'finished';
  current_question_index: number;
}

const HostDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    type: 'multiple_choice',
    order_index: 0
  });
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== 'teacher') {
      navigate('/');
      return;
    }

    loadExistingRoom();
    subscribeToRoomUpdates();
  }, [user, profile]);

  const loadExistingRoom = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('host_id', user.id)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setRoom(data);
      loadQuestions(data.id);
      loadPlayers(data.id);
    }
  };

  const subscribeToRoomUpdates = () => {
    if (!user) return;

    // Subscribe to room changes
    const roomSubscription = supabase
      .channel('room_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `host_id=eq.${user.id}`
      }, () => {
        loadExistingRoom();
      })
      .subscribe();

    // Subscribe to player changes
    const playerSubscription = supabase
      .channel('player_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players'
      }, () => {
        if (room) {
          loadPlayers(room.id);
        }
      })
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
      playerSubscription.unsubscribe();
    };
  };

  const loadQuestions = async (roomId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('room_id', roomId)
      .order('order_index');

    if (data && !error) {
      setQuestions(data);
    }
  };

  const loadPlayers = async (roomId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        name,
        score,
        profiles(full_name, email)
      `)
      .eq('room_id', roomId)
      .eq('is_connected', true);

    if (data && !error) {
      setPlayers(data);
    }
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!user) return;

    setIsLoading(true);
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert([{
        code,
        host_id: user.id,
        status: 'waiting',
        current_question_index: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      setIsLoading(false);
      return;
    }

    setRoom(data);
    setIsLoading(false);
  };

  const addQuestion = async () => {
    if (!room || !currentQuestion.question_text.trim()) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .insert([{
        room_id: room.id,
        ...currentQuestion,
        order_index: questions.length
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding question:', error);
      setIsLoading(false);
      return;
    }

    setQuestions([...questions, data]);
    setCurrentQuestion({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      type: 'multiple_choice',
      order_index: questions.length + 1
    });
    setIsLoading(false);
  };

  const startQuiz = async () => {
    if (!room) return;

    setIsLoading(true);
    await supabase
      .from('rooms')
      .update({ status: 'active' })
      .eq('id', room.id);

    // Start with first question
    await broadcastNextQuestion();
    setIsLoading(false);
  };

  const broadcastNextQuestion = async () => {
    if (!room || questions.length === 0) return;

    const currentIndex = room.current_question_index;
    const nextQuestion = questions.find(q => q.order_index === currentIndex);

    if (nextQuestion) {
      await supabase
        .from('current_question')
        .upsert([{
          room_id: room.id,
          question_id: nextQuestion.id,
          question_index: currentIndex,
          time_limit: 30
        }]);
    }
  };

  const nextQuestion = async () => {
    if (!room) return;

    const { data, error } = await supabase.rpc('next_question', {
      room_uuid: room.id
    });

    if (!error && data) {
      // Question advanced, broadcast next
      await broadcastNextQuestion();
    }
  };

  const handleQuestionTypeChange = (type: 'multiple_choice' | 'true_false') => {
    setCurrentQuestion({
      ...currentQuestion,
      type,
      options: type === 'true_false' ? ['True', 'False'] : ['', '', '', '']
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Kahooot Clone - Host Dashboard</h1>

      {!room ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create a New Room</h2>
          <button
            onClick={createRoom}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Room Code: {room.code}</h2>
            <p className="text-gray-600">Share this code with players to join the quiz.</p>
            <p className="text-sm text-gray-500 mt-2">
              Status: <span className="capitalize font-semibold">{room.status}</span> |
              Players: {players.length}
            </p>
          </div>

          {room.status === 'waiting' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Add Questions</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Question Type</label>
                  <select
                    value={currentQuestion.type}
                    onChange={(e) => handleQuestionTypeChange(e.target.value as 'multiple_choice' | 'true_false')}
                    className="w-full p-2 border rounded"
                  >
                    <option value="multiple_choice">Multiple Choice (4 options)</option>
                    <option value="true_false">True/False</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Question</label>
                  <input
                    type="text"
                    value={currentQuestion.question_text}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, question_text: e.target.value})}
                    className="w-full p-2 border rounded"
                    placeholder="Enter your question"
                  />
                </div>

                {currentQuestion.type === 'multiple_choice' ? (
                  <div className="grid grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium mb-1">
                          Option {index + 1}
                          <input
                            type="radio"
                            name="correct"
                            checked={currentQuestion.correct_answer === index}
                            onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: index})}
                            className="ml-2"
                          />
                        </label>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion({...currentQuestion, options: newOptions});
                          }}
                          className="w-full p-2 border rounded"
                          placeholder={`Option ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">Correct Answer</label>
                    <div className="flex space-x-4">
                      <label>
                        <input
                          type="radio"
                          name="correct"
                          checked={currentQuestion.correct_answer === 0}
                          onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: 0})}
                        />
                        True
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="correct"
                          checked={currentQuestion.correct_answer === 1}
                          onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: 1})}
                        />
                        False
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={addQuestion}
                  disabled={isLoading}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
                >
                  {isLoading ? 'Adding...' : 'Add Question'}
                </button>
              </div>

              {questions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Questions ({questions.length})</h3>
                  <ul className="space-y-2">
                    {questions.map((q, index) => (
                      <li key={q.id} className="p-2 bg-gray-50 rounded">
                        {q.question_text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {questions.length > 0 && room.status === 'waiting' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <button
                onClick={startQuiz}
                disabled={isLoading}
                className="bg-purple-500 text-white px-6 py-3 rounded text-lg hover:bg-purple-600 disabled:bg-gray-300"
              >
                {isLoading ? 'Starting...' : 'Start Quiz'}
              </button>
            </div>
          )}

          {room.status === 'active' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Quiz in Progress</h2>
              <p className="text-gray-600 mb-4">
                Current Question: {room.current_question_index + 1} of {questions.length}
              </p>
              <button
                onClick={nextQuestion}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Next Question
              </button>
            </div>
          )}

          {players.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Players ({players.length})</h3>
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{player.name}</span>
                    <span className="font-semibold">{player.score} points</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HostDashboard;