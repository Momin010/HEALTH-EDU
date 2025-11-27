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

### For Teachers (Require Authentication)
1. **Choose Role**: Visit main page, click "I'm a Teacher"
2. **Sign Up/Login**: Authenticate with your account
3. **Create Room**: Click "Create Room" to generate a room code
4. **Add Questions**: Create multiple choice (4 options) or true/false questions
5. **Share Access**: Give students the direct link: `yoursite.com/student`
6. **Start Quiz**: Click "Start Quiz" when ready

### For Students (No Authentication Required)
1. **Choose Role**: Visit main page, click "I'm a Student"
2. **Enter Room**: Go to student page and enter room code
3. **Choose Name**: Enter your display name (no account needed)
4. **Session Persistence**: Stay in the game even after page refresh
5. **Play Quiz**: Answer questions as they appear in real-time
6. **View Results**: See live leaderboard and final scores

## Authentication Model

### Teacher Authentication
- **Required**: Teachers must create accounts to host quizzes
- **Secure Access**: Login required for room creation and management
- **Role-based**: Only users with 'teacher' role can create rooms

### Student Guest Access
- **No Accounts Needed**: Students join with just room code + username
- **Session Persistence**: localStorage maintains session across page refreshes
- **Temporary Players**: Player data stored in database but no user accounts
- **Easy Access**: Direct link `yoursite.com/student` for students

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