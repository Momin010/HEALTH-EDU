import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { quizQuestions, QUIZ_CONFIG } from '../data/quizQuestions';

interface Room {
  id: string;
  code: string;
  status: 'waiting' | 'active' | 'finished';
  current_question_index: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
}

interface HostSession {
  roomId: string;
  roomCode: string;
  timestamp: number;
}

const HostDashboard = () => {
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);

  // keep refs to subscriptions so we can unsubscribe correctly
  const roomChannelRef = useRef<any | null>(null);
  const playersChannelRef = useRef<any | null>(null);

  // Load existing host session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('host_session');
    if (savedSession) {
      const session: HostSession = JSON.parse(savedSession);
      // Check if session is recent (within 24 hours)
      if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
        loadExistingRoom(session.roomId);
      } else {
        localStorage.removeItem('host_session');
      }
    }

    // cleanup on unmount
    return () => {
      cleanupSubscriptions();
    };
  }, []);

  // load existing room by ID
  const loadExistingRoom = async (roomId: string) => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading existing room:', error);
      localStorage.removeItem('host_session');
      return;
    }

    if (data && (data.status === 'waiting' || data.status === 'active')) {
      setRoom(data);
      await loadPlayers(data.id);
      subscribeToRoomUpdates(data.id);
    } else {
      // Room not available, clear session
      localStorage.removeItem('host_session');
    }
  };

  // subscribe to room-level updates and player updates for the room
  const subscribeToRoomUpdates = (roomId: string) => {
    // cleanup any previous channels first
    cleanupSubscriptions();

    // Subscribe to changes on the rooms table for this room
    const roomChannel = supabase
      .channel(`room_updates_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        async (payload) => {
          // Update room data locally
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const updatedRoom = payload.new as Room;
            setRoom(updatedRoom);
          }
        }
      )
      .subscribe();

    roomChannelRef.current = roomChannel;

    // Subscribe to player changes for this room
    const playersChannel = supabase
      .channel(`players_updates_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        async () => {
          // reload players when changes occur
          await loadPlayers(roomId);
        }
      )
      .subscribe();

    playersChannelRef.current = playersChannel;
  };

  // unsubscribe channels if set
  const cleanupSubscriptions = () => {
    try {
      if (roomChannelRef.current) {
        if (typeof roomChannelRef.current.unsubscribe === 'function') {
          roomChannelRef.current.unsubscribe();
        } else if (typeof roomChannelRef.current.remove === 'function') {
          roomChannelRef.current.remove();
        }
        roomChannelRef.current = null;
      }
    } catch (e) {
      console.warn('Error unsubscribing room channel', e);
    }

    try {
      if (playersChannelRef.current) {
        if (typeof playersChannelRef.current.unsubscribe === 'function') {
          playersChannelRef.current.unsubscribe();
        } else if (typeof playersChannelRef.current.remove === 'function') {
          playersChannelRef.current.remove();
        }
        playersChannelRef.current = null;
      }
    } catch (e) {
      console.warn('Error unsubscribing players channel', e);
    }
  };

  const loadPlayers = async (roomId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, score')
      .eq('room_id', roomId)
      .eq('is_connected', true)
      .order('score', { ascending: false });

    if (!error && data) {
      setPlayers(data);
    } else if (error) {
      console.error('Error loading players:', error);
    }
  };

  const createRoom = async () => {
    setIsLoading(true);

    const code = QUIZ_CONFIG.ROOM_CODE;
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          code,
          status: 'waiting',
          current_question_index: 0
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      setIsLoading(false);
      return;
    }

    // Save host session to localStorage
    const session: HostSession = {
      roomId: data.id,
      roomCode: code,
      timestamp: Date.now()
    };
    localStorage.setItem('host_session', JSON.stringify(session));

    // set room and subscribe to updates for this new room
    setRoom(data);
    await loadPlayers(data.id);
    subscribeToRoomUpdates(data.id);

    // Add the hardcoded questions to the database
    const insertedQuestions = await addQuestionsToDatabase(data.id);
    setDbQuestions(insertedQuestions);

    setIsLoading(false);
  };

  const addQuestionsToDatabase = async (roomId: string) => {
    // Convert quiz questions to database format
    const questionsToInsert = quizQuestions.map((q, index) => ({
      room_id: roomId,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      type: q.type,
      order_index: index
    }));

    const { data, error } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (error) {
      console.error('Error adding questions:', error);
      return [];
    }

    // Store the database question IDs for later use
    const dbQuestions = data.map((dbQ, index) => ({
      ...dbQ,
      // Map back to original question for reference
      originalIndex: index
    }));
    
    return dbQuestions;
  };

  const startQuiz = async () => {
    if (!room) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'active' })
      .eq('id', room.id);

    if (error) {
      console.error('Error starting quiz:', error);
      setIsLoading(false);
      return;
    }

    // reflect locally and broadcast first question
    setRoom((r) => (r ? { ...r, status: 'active' } : r));
    await broadcastNextQuestion(room.id);
    setIsLoading(false);
  };

  const broadcastNextQuestion = async (roomId?: string) => {
    const rId = roomId ?? room?.id;
    if (!rId) return;

    // Ensure we have questions - if not, load from database
    let questionsToUse = dbQuestions;
    if (questionsToUse.length === 0) {
      const { data: dbQ } = await supabase
        .from('questions')
        .select('*')
        .eq('room_id', rId)
        .order('order_index');
      questionsToUse = dbQ || [];
      setDbQuestions(questionsToUse);
    }

    if (questionsToUse.length === 0) return;

    // reload room to get latest index if necessary
    const { data: roomData } = await supabase
      .from('rooms')
      .select('current_question_index')
      .eq('id', rId)
      .single();

    const currentIndex = roomData?.current_question_index ?? 0;
    const nextQuestion = questionsToUse.find((q) => q.order_index === currentIndex);

    if (nextQuestion) {
      const { error } = await supabase
        .from('current_question')
        .upsert([
          {
            room_id: rId,
            question_id: nextQuestion.id,
            question_index: currentIndex,
            time_limit: QUIZ_CONFIG.TIME_LIMIT
          }
        ]);

      if (error) {
        console.error('Error broadcasting question:', error);
      }
    }
  };

  const nextQuestion = async () => {
    if (!room) return;

    // Call RPC that advances the current_question_index server-side
    const { error } = await supabase.rpc('next_question', {
      room_uuid: room.id
    });

    if (error) {
      console.error('Error advancing question (rpc next_question):', error);
      return;
    }

    // After RPC, re-broadcast the now-current question
    await broadcastNextQuestion(room.id);

    // refresh room info locally (so UI like "Current Question: X of Y" updates)
    const { data: freshRoom } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room.id)
      .single();

    if (freshRoom) setRoom(freshRoom);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Terveystieto KPL36 - Quiz Isäntä</h1>

      {!room ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Luo Terveystiedon Quiz Huone</h2>
          <p className="text-gray-600 mb-4">
            Tämä quiz sisältää 10 kysymystä itsehoidosta ja lääkkeistä (KPL 36).
          </p>
          <button
            onClick={createRoom}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {isLoading ? 'Luodaan...' : 'Luo Quiz Huone'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Huone Koodi: {room.code}</h2>
            <p className="text-gray-600 mb-2">
              Opiskelijat voivat liittyä tähän quiz-huoneeseen huonekoodilla.
            </p>
            <p className="text-sm text-gray-500">
              Tila: <span className="capitalize font-semibold">{room.status}</span> | 
              Pelaajat: {players.length} | 
              Kysymykset: {quizQuestions.length}
            </p>
          </div>

          {room.status === 'waiting' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Quiz valmis aloitettavaksi</h2>
              <p className="text-gray-600 mb-4">
                10 kysymystä itsehoidosta ja lääkkeistä. Opiskelijoilla on 30 sekuntia aikaa per kysymys.
              </p>
              <button
                onClick={startQuiz}
                disabled={isLoading}
                className="bg-green-500 text-white px-6 py-3 rounded text-lg hover:bg-green-600 disabled:bg-gray-300"
              >
                {isLoading ? 'Aloitetaan...' : 'Aloita Quiz'}
              </button>
            </div>
          )}

          {room.status === 'active' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Quiz käynnissä</h2>
              <p className="text-gray-600 mb-4">
                Nykyinen kysymys: {room.current_question_index + 1} / {quizQuestions.length}
              </p>
              <button onClick={nextQuestion} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Seuraava kysymys
              </button>
            </div>
          )}

          {players.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Pelaajat ({players.length})</h3>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>#{index + 1} {player.name}</span>
                    <span className="font-semibold">{player.score} pistettä</span>
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
