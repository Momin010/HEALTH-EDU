import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Question {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  type: 'multiple_choice' | 'true_false';
}

interface QuestionDB {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  type: 'multiple_choice' | 'true_false';
}

const HostDashboard = () => {
  const [roomCode, setRoomCode] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    type: 'multiple_choice'
  });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isQuizStarted, setIsQuizStarted] = useState(false);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ code, status: 'waiting' }])
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      return;
    }

    setRoomId(data.id);
    setRoomCode(code);
  };

  const addQuestion = async () => {
    if (!roomId || !currentQuestion.question_text.trim()) return;

    const { data, error } = await supabase
      .from('questions')
      .insert([{
        room_id: roomId,
        ...currentQuestion
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding question:', error);
      return;
    }

    setQuestions([...questions, data]);
    setCurrentQuestion({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      type: 'multiple_choice'
    });
  };

  const startQuiz = async () => {
    if (!roomId) return;

    await supabase
      .from('rooms')
      .update({ status: 'active' })
      .eq('id', roomId);

    setIsQuizStarted(true);
    // Start broadcasting questions
    broadcastNextQuestion();
  };

  const broadcastNextQuestion = async () => {
    if (questions.length === 0) return;

    const question = questions[0];
    await supabase
      .from('current_question')
      .upsert([{ room_id: roomId, question_id: question.id }]);
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

      {!roomId ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create a New Room</h2>
          <button
            onClick={createRoom}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Room
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Room Code: {roomCode}</h2>
            <p className="text-gray-600">Share this code with players to join the quiz.</p>
          </div>

          {!isQuizStarted && (
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
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Add Question
                </button>
              </div>

              {questions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Questions ({questions.length})</h3>
                  <ul className="space-y-2">
                    {questions.map((q, index) => (
                      <li key={index} className="p-2 bg-gray-50 rounded">
                        {q.question_text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {questions.length > 0 && !isQuizStarted && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <button
                onClick={startQuiz}
                className="bg-purple-500 text-white px-6 py-3 rounded text-lg hover:bg-purple-600"
              >
                Start Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HostDashboard;