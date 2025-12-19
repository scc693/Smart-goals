# Project Prompt: Gamified Goal Tracker PWA

I want you to build a Goal Tracking Progressive Web App (PWA) from scratch. The app will gamify goal setting, track progress, and support social competition.

## Core Architecture
*   **Tech Stack:** React (Vite)
*   **UI Framework:** Material UI (MUI) or similar polished UI library.
*   **Backend:** Firebase (Authentication, Firestore, Hosting).
*   **Offline Functionality:** The app **must** work fully offline. Use Firebase Firestore's offline persistence and a Service Worker (e.g., via `vite-plugin-pwa`) to cache the app shell.

## Functional Requirements

### 1. Goal Structure & Tracking
*   **Hierarchy:** Users create **Goals**. Each Goal can have multiple **Sub-goals**. Each Sub-goal can have multiple **Steps**.
*   **Progress Bars:**
    *   **Goal Level:** A progress bar that fills up as Sub-goals are completed.
    *   **Sub-goal Level:** A progress bar that fills up as Steps are completed.
*   **Deadlines:** Goals can have an optional deadline or be open-ended.
*   **Personal Rewards:** Users can enter a text-based "Personal Reward" for themselves (e.g., "Buy a new game") linked to the completion of a Goal or Sub-goal. This is for self-motivation and is distinct from the gamification points.

### 2. Gamification & Points
*   **Earning Points:** Users earn points for completing:
    *   Steps (Small amount)
    *   Sub-goals (Medium amount)
    *   Goals (Large amount)
*   **Digital Trophies:** The system should support unlocking visual trophies/badges for milestones (e.g., "First Goal Completed", "1000 Points").

### 3. Groups & Social (The "Game" Aspect)
*   **Modes:** The app supports both **Solo** users and **Groups**.
*   **Creating/Joining Groups:**
    *   Users can create a new group (becoming the Admin).
    *   Users can join an existing group using a Group ID or invite code.
*   **Leaderboards:** Each group has a leaderboard ranking members by their current point total.
*   **Shared Goals:** Within a group, goals should be visible to other members to foster accountability.
*   **Private Goals:** Users must have the option to mark specific goals as "Private", hiding them from the group feed/leaderboard details, but keeping the points (or having an option to exclude them from the leaderboard).

### 4. Admin & Awards System
*   **Admin Role:** The Group Creator is the Admin and can appoint others.
*   **Redeemable Awards:**
    *   Admins can define "Group Awards" (e.g., "Gift Card", "Free Lunch", "Bragging Rights") with a specific Point Cost.
    *   Group members can "Redeem" their points for these awards.
    *   *Note:* Personal rewards (set by the user for themselves) are different from these Group Awards (set by the Admin).

### 5. Authentication & Sync
*   **Auth:** Support Email/Password and Google Sign-In.
*   **Data Sync:** Data must sync seamlessly between devices when online.
*   **Conflict Resolution:** Handle concurrent edits (e.g., if two users edit a shared group goal offline) using a "Last Write Wins" strategy.

## Implementation Guidelines
*   Start by setting up the project with Vite and Firebase.
*   Focus on the data model for recursive goals (Goal -> Sub -> Step).
*   Ensure the offline capability is robust from the start (test by disconnecting network).
*   Design the UI to look like a native app (mobile-first responsiveness).
