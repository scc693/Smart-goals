# Project: Gamified Goal Tracker PWA

## Overview
Build a Progressive Web App (PWA) for goal tracking that gamifies the experience. The app supports offline functionality, allowing users to track progress without an internet connection. It works for individual users and supports groups for social competition via leaderboards.

## Tech Stack
*   **Frontend:** React (Vite)
*   **UI Framework:** Material UI (MUI)
*   **Backend & Database:** Firebase (Authentication, Firestore, Hosting)
*   **PWA Support:** `vite-plugin-pwa` + Firestore Offline Persistence

## Core Features & Requirements

### 1. Goal Management
*   **Hierarchy:** Goals can have **Sub-goals**, and Sub-goals can have **Steps**.
*   **Progress Tracking:**
    *   Each Goal has a progress bar.
    *   Each Sub-goal should have its own progress bar.
    *   Progress is calculated based on the completion of Steps.
*   **Deadlines:** Goals can have an optional deadline or be open-ended.
*   **Personal Rewards:** Users can assign specific text-based rewards for themselves upon completion of sub-goals or goals (e.g., "Buy a coffee"). These are for self-motivation and **not** tied to the points system.

### 2. Gamification & Points
*   **Points System:** Users earn points for completing Steps, Sub-goals, and Goals.
*   **Leaderboard:** A social leaderboard ranks members within a Group based on their points.
*   **Digital Trophies:** (Future) Visual achievements for milestones.

### 3. Group Dynamics
*   **Solo vs. Group:** Users start in "Solo Mode". They can choose to **Create** a new group or **Join** an existing group using a Group ID.
*   **Shared Goals:** Within a group, goals are shared/visible to other members (unless marked Private).
*   **Private Goals:** Users can mark specific goals as "Private" to exclude them from the feed/leaderboard visibility, though points still count (or can be excluded from leaderboard if desired).
*   **Admins:**
    *   The user who creates a group is the Admin.
    *   Admins can appoint other admins.
    *   **Group Awards:** Admins define redeemable awards (e.g., "Gift Card", "Back Massage") that cost points.
    *   *Note:* Regular members view and redeem these awards (Redemption UI pending).

### 4. Offline Capabilities
*   **Full Functionality:** The app must allow viewing and editing goals while offline.
*   **Sync:** Changes sync automatically when connection is restored.
*   **Conflict Resolution:** "Last Write Wins" strategy for concurrent edits on shared data.

### 5. Authentication
*   **Methods:** Email/Password and Google Sign-In.
*   **Security:** Standard Firebase Auth security.

## Data Model (Firestore)

**Users (`users` collection)**
*   `uid`: string
*   `displayName`: string
*   `email`: string
*   `currentPoints`: number
*   `groupIds`: array of strings (List of groups the user belongs to)

**Groups (`groups` collection)**
*   `id`: string
*   `name`: string
*   `adminIds`: array of strings (UIDs)
*   `memberIds`: array of strings (UIDs)
*   `awards`: array of objects `{ id, name, cost, description }`

**Goals (`goals` collection)**
*   `id`: string
*   `userId`: string
*   `groupId`: string (Optional, if shared)
*   `title`: string
*   `description`: string
*   `progress`: number (0-100)
*   `completed`: boolean
*   `points`: number (Points value of the goal)
*   `deadline`: timestamp
*   `reward`: string (Personal text reward)
*   `isPrivate`: boolean
*   `subGoals`: array of objects
    *   `title`: string
    *   `completed`: boolean
    *   `steps`: array of objects `{ title, completed }`

## Current MVP Status
*   Basic Goal/Sub-goal/Step creation and editing is implemented.
*   Points are awarded on Goal completion (currently fixed 100pts, needs refinement for granularity).
*   Group creation and Joining via ID is implemented.
*   Leaderboard displays members of the current group.
*   Admin Panel allows creating Awards.
*   Personal Reward text field is implemented.

## Next Steps for Development
1.  **Refine Progress Logic:** Ensure progress bars update dynamically as individual Steps are checked off.
2.  **Point Granularity:** Award points for Steps and Sub-goals, not just the main Goal.
3.  **Award Redemption:** Build the UI for non-admin members to view available Group Awards and "Redeem" them (deducting points).
4.  **Sub-goal Progress:** Visualize progress bars specifically for sub-goals in the UI.
