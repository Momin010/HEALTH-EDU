# Kahooot Clone

A real-time quiz application built with React and Supabase, similar to Kahoot for health education.

## Features

- **Teacher Authentication**: Secure login system for quiz hosts
- **Student Guest Access**: No accounts needed - just enter room code and username
- **Session Persistence**: Students stay in game even after page refresh
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

### For Quiz Hosts (No Authentication)
1. **Start Hosting**: Visit main page, click "Create New Quiz"
2. **Create Room**: System generates a unique room code automatically
3. **Add Questions**: Create multiple choice (4 options) or true/false questions
4. **Share Code**: Tell students the room code or use `yoursite.com/student`
5. **Start Quiz**: Click "Start Quiz" when ready
6. **Session Saved**: Your quiz persists if you refresh the page

### For Quiz Players (No Authentication)
1. **Join Quiz**: Visit main page, click "Join Quiz as Student"
2. **Enter Code**: Type the room code provided by the host
3. **Choose Name**: Enter your display name
4. **Stay Connected**: Your session persists even after page refresh
5. **Play Quiz**: Answer questions as they appear in real-time
6. **View Scores**: See live leaderboard and final results

## No Authentication Required!

### Completely LocalStorage-Based
- **No User Accounts**: Everything works without any login/signup
- **Session Persistence**: All data saved locally in your browser
- **Host Sessions**: Quiz hosts' sessions persist across browser refreshes
- **Student Sessions**: Players stay in games even after page reload
- **24-Hour Sessions**: Automatic cleanup of old sessions

### How It Works
- **Hosts**: Create rooms, add questions, start quizzes (all saved locally)
- **Students**: Join with room code + name, play quizzes (sessions persist)
- **Real-time**: Live updates via Supabase, but no user authentication needed

## Database Schema

- **rooms**: Quiz rooms with codes and status
- **questions**: Quiz questions with options and correct answers
- **players**: Participants with names and scores (no user_id for students)
- **answers**: Submitted answers with correctness
- **current_question**: Tracks the active question for each room

## Technologies Used

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Supabase for backend and real-time features