-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create tables
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  current_question_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings
  correct_answer INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('multiple_choice', 'true_false')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  score INTEGER DEFAULT 0,
  is_connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken INTEGER, -- seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE current_question (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  time_limit INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_question ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their rooms" ON rooms FOR UPDATE USING (auth.uid() = host_id);

-- Questions policies
CREATE POLICY "Anyone can view questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Hosts can manage questions in their rooms" ON questions FOR ALL USING (
  EXISTS (SELECT 1 FROM rooms WHERE rooms.id = questions.room_id AND rooms.host_id = auth.uid())
);

-- Players policies
CREATE POLICY "Players can view players in their room" ON players FOR SELECT USING (
  room_id IN (SELECT id FROM rooms WHERE host_id = auth.uid()) OR user_id = auth.uid()
);
CREATE POLICY "Users can join rooms as players" ON players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own player status" ON players FOR UPDATE USING (auth.uid() = user_id);

-- Answers policies
CREATE POLICY "Users can view answers for questions in rooms they participate in" ON answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM players WHERE players.id = answers.player_id AND players.user_id = auth.uid())
);
CREATE POLICY "Users can submit their own answers" ON answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE players.id = answers.player_id AND players.user_id = auth.uid())
);

-- Current question policies
CREATE POLICY "Anyone can view current questions" ON current_question FOR SELECT USING (true);
CREATE POLICY "Hosts can manage current questions in their rooms" ON current_question FOR ALL USING (
  EXISTS (SELECT 1 FROM rooms WHERE rooms.id = current_question.room_id AND rooms.host_id = auth.uid())
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_questions_room_id ON questions(room_id);
CREATE INDEX idx_questions_order ON questions(room_id, order_index);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_answers_player_id ON answers(player_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_current_question_room_id ON current_question(room_id);

-- Functions for quiz management
CREATE OR REPLACE FUNCTION next_question(room_uuid UUID)
RETURNS UUID AS $$
DECLARE
  next_q_id UUID;
  current_idx INTEGER;
BEGIN
  -- Get current question index
  SELECT current_question_index INTO current_idx FROM rooms WHERE id = room_uuid;

  -- Get next question
  SELECT id INTO next_q_id
  FROM questions
  WHERE room_id = room_uuid AND order_index = current_idx + 1
  ORDER BY order_index
  LIMIT 1;

  -- If there's a next question, update current question and increment index
  IF next_q_id IS NOT NULL THEN
    -- Update current question
    INSERT INTO current_question (room_id, question_id, question_index)
    VALUES (room_uuid, next_q_id, current_idx + 1)
    ON CONFLICT (room_id) DO UPDATE SET
      question_id = EXCLUDED.question_id,
      question_index = EXCLUDED.question_index;

    -- Update room's current question index
    UPDATE rooms SET current_question_index = current_idx + 1 WHERE id = room_uuid;

    RETURN next_q_id;
  ELSE
    -- No more questions, finish quiz
    UPDATE rooms SET status = 'finished', current_question_index = current_idx WHERE id = room_uuid;
    DELETE FROM current_question WHERE room_id = room_uuid;
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get room players count
CREATE OR REPLACE FUNCTION get_room_players_count(room_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM players WHERE room_id = room_uuid AND is_connected = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();