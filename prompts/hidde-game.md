# Prompt for AI Agent: Implement "Row Harder!" Button Masher Game

**Objective:** Implement a simple, real-time multiplayer button masher game called "Row Harder!" integrated into an existing web application.

**Target Platform & Stack:**

- **Framework:** Next.js (TypeScript)
- **Backend/Database:** Supabase (Postgres, Realtime, Auth, Edge Functions recommended)
- **Existing Context:** The application already has user authentication (Supabase Auth), user profiles (`profiles` table), and likely a main leaderboard system for a "Greek themed stag do" website. The game score should integrate with this leaderboard.

**Game Concept:** Players join a game lobby, and upon starting, frantically tap/click a designated area for a fixed duration (e.g., 10 seconds). The player with the highest tap count wins points based on rank, which contribute to the main stag do leaderboard.

**Detailed Requirements:**

**I. Core Gameplay Loop**

1.  **Initiation:** User interaction (e.g., button click) triggers game creation or joining.
2.  **Lobby:** Display a waiting area showing joined players.
3.  **Start:** Synchronized game start initiated by a user action or timer.
4.  **Countdown:** Brief (e.g., 3-second) visual countdown for all players.
5.  **Mashing Phase:** Fixed duration (e.g., 10 seconds) where players tap/click rapidly.
6.  **Real-time Feedback:**
    - Live display of the player's own tap count.
    - (Recommended) Live display of opponents' progress (counts or visual representation).
7.  **Game End:** Input disabled upon timer completion.
8.  **Results Display:** Ranked list of all participants showing final tap counts and highlighting the winner(s).
9.  **Scoring:** Points awarded based on final rank.
10. **Leaderboard Update:** Awarded points added to the main application leaderboard.
11. **Post-Game Options:** Ability to play again or return to the main site.

**II. Functional Requirements**

1.  **Game Management:**
    - Create/manage game instances (track status: 'waiting', 'starting', 'in_progress', 'finished').
    - Handle users joining/leaving 'waiting' lobbies.
    - Display lobby participants.
    - Implement a clear game start mechanism.
2.  **Synchronization:**
    - Ensure game start and timers are synchronized across all clients in a session using Supabase Realtime and potentially server-side timestamps.
3.  **Gameplay Interface (Client-Side):**
    - Designate a clear, large, easily tappable "mash zone".
    - Prominently display the game timer and the player's score.
    - (Optional) Display opponent info (names, scores/progress).
    - Provide immediate visual/audio feedback on tap registration.
    - Incorporate Greek-themed visuals (e.g., Trireme ship, oars animating based on tap speed).
4.  **Results & Scoring:**
    - Accurately capture final tap counts.
    - Calculate rank, handling ties appropriately.
    - Display clear, ranked results post-game.
    - Define and implement a point system based on rank (e.g., 1st=100, 2nd=75, 3rd=50, others=10).
5.  **Leaderboard Integration:**
    - Securely update the main leaderboard (associated with user profiles) with the awarded points. This MUST be done server-side (Edge Function) or via secure database logic (RLS, triggers) to prevent cheating.
6.  **State Handling:**
    - Manage application state across different game phases (lobby, countdown, playing, results).
    - Handle potential disconnects/errors gracefully.

**III. Technical Requirements (Supabase & Next.js)**

1.  **Database Schema:**
    - `games`: `id (pk)`, `status (text)`, `created_at`, `started_at`, `finished_at`.
    - `game_participants`: `id (pk)`, `game_id (fk)`, `user_id (fk)`, `tap_count (int)`, `rank (int)`, `score_awarded (int)`. Add unique constraint on `(game_id, user_id)`.
    - (Reference Existing) `profiles` table for user data and main leaderboard score.
2.  **Supabase Realtime:**
    - Use channels scoped per game instance (e.g., `realtime:public:games:id=eq.{game_id}`, `realtime:public:game_participants:game_id=eq.{game_id}`).
    - Use Broadcast for essential state changes: `user_joined`, `game_starting` (with start timestamp), `game_finished`.
    - Handle real-time opponent score display (recommend updating `game_participants.tap_count` directly and relying on Realtime replication for simplicity and fewer messages).
3.  **Client-Side (Next.js / TypeScript / React):**
    - Component structure for different game views (Lobby, Game, Results).
    - State management (`useState`, `useEffect`, context, or library like Zustand/Jotai).
    - Efficient event handling for taps (`onClick`, `onTouchStart`).
    - Supabase JS client (`@supabase/supabase-js`) for DB interaction and Realtime subscriptions.
4.  **Server-Side Logic (Supabase Edge Functions Recommended):**
    - **`finish-game` (Essential & Secure):** Triggered post-game. Fetches participants, calculates ranks, determines points, updates `game_participants`, updates main `profiles`/`leaderboard`, sets game status to 'finished'.
    - (Optional but Recommended) Functions for `create-game`, `join-game`, `start-game` for better validation and security.

**IV. Non-Functional Requirements**

1.  **Performance:** Responsive UI, low-latency tap registration and feedback.
2.  **Usability:** Simple, intuitive interface. Clear instructions. Mobile-first design.
3.  **Reliability:** Graceful handling of network issues and user disconnections.
4.  **Security:** Prevent cheating, especially regarding score reporting (handled by server-side logic).

**Deliverable:** Implement the "Row Harder!" game based on these requirements within the specified technical stack. Ensure integration with existing user authentication and the main leaderboard.
