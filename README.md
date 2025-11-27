# Kahooot Clone

A real-time quiz application built with React and Supabase, similar to Kahoot for health education.

## Features

- **Host Dashboard**: Create rooms, add questions (multiple choice or true/false), start quizzes
- **Player Interface**: Join rooms with codes, answer questions in real-time
- **Real-time Updates**: Live leaderboard and question broadcasting
- **Health Education Focus**: Designed for educational quizzes

## Setup

1. **Clone and Install Dependencies**
   ```bash
   cd kahooot-clone
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
   - Copy your project URL and anon key

3. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run the Application**
   ```bash
   npm run dev
   ```

## Usage

### For Teachers (Hosts)
1. Go to the main page
2. Click "Create Room" to generate a room code
3. Add questions (multiple choice with 4 options or true/false)
4. Share the room code with students
5. Click "Start Quiz" when ready

### For Students (Players)
1. Go to `/join/{room_code}` (replace with actual code)
2. Enter your name
3. Answer questions as they appear
4. View live leaderboard

## Database Schema

- **rooms**: Quiz rooms with codes and status
- **questions**: Quiz questions with options and correct answers
- **players**: Participants with names and scores
- **answers**: Submitted answers with correctness
- **current_question**: Tracks the active question for each room

## Technologies Used

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Supabase for backend and real-time features