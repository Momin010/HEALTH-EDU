import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Room {
  id: string;
  code: string;
  status: "waiting" | "active" | "finished";
  current_question_index: number;
}

const PlayerLobby = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);

  const roomChannelRef = useRef<any>(null);

  // Load room initially
  useEffect(() => {
    if (!roomId) return;
    loadRoom();
    subscribeToRoom();
    return () => cleanup();
  }, [roomId]);

  const loadRoom = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!error && data) setRoom(data);
  };

  const subscribeToRoom = () => {
    if (!roomId) return;

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
          const updated = payload.new as Room;
          if (updated && updated.status) {
            setRoom(updated);

            // When status becomes "active", go to player question screen
            if (updated.status === "active") {
              navigate(`/play/${roomId}`);
            }
          }
        }
      )
      .subscribe();

    roomChannelRef.current = channel;
  };

  const cleanup = () => {
    try {
      roomChannelRef.current?.unsubscribe?.();
    } catch {}
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">Waiting Room</h1>
      <p className="text-xl mb-2">Room Code: {room?.code}</p>
      <p className="text-gray-600">Waiting for teacher to start...</p>
    </div>
  );
};

export default PlayerLobby;