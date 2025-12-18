PROMPT: Gamified Goal Tracker PWA (Initial Build)
Role: You are an expert Full-Stack Engineer specializing in React, Vite, and Firebase.
Context: This is a brand-new, empty repository. No code has been implemented yet.
Mission: Build a Progressive Web App (PWA) for gamified goal tracking with offline support.
🛠 Tech Stack Requirements
 * Frontend: React (Vite) + TypeScript
 * UI Framework: Material UI (MUI)
 * Backend/DB: Firebase (Auth, Firestore, Hosting)
 * PWA: vite-plugin-pwa + Firestore Offline Persistence
🎯 Implementation Strategy
Phase 1: Environment & Scaffolding
 * Initialize a Vite project with TypeScript and MUI.
 * Set up folder structure: /src/components, /src/hooks, /src/context, /src/firebase, /src/types.
 * Configure vite-plugin-pwa and Firebase initialization.
Phase 2: Data Architecture & Auth
 * Define TypeScript interfaces for Users, Groups, and Goals.
 * Implement Firebase Authentication (Email/Password and Google Sign-In).
 * Enable Firestore Offline Persistence for seamless offline editing and syncing.
Phase 3: Core Feature - Goal Hierarchy & Logic
 * Implement the Goal Engine: Goals -> Sub-goals -> Steps.
 * Progress Logic: Automatically calculate and update progress bars for both Sub-goals and Goals as Steps are toggled.
 * Point System: Implement granular point awarding for Steps, Sub-goals, and Goals.
Phase 4: Social, Groups & Rewards
 * Groups: Logic to Create/Join groups via ID.
 * Leaderboard: Display members of the current group ranked by points.
 * Admin & Awards: Admin UI to create Awards; Member UI to "Redeem" awards by deducting points.
 * Personal Rewards: Text-based reward field for individual motivation.
🗄 Data Model (Firestore)
 * Users: uid, displayName, email, currentPoints, groupIds[]
 * Groups: id, name, adminIds[], memberIds[], awards: [{id, name, cost, description}]
 * Goals: id, userId, groupId (optional), title, description, progress, completed, points, deadline, reward (text), isPrivate, subGoals: [{title, completed, steps: [{title, completed}]}]
⚠️ Development Rules
 * Iterative Feedback: Complete one phase at a time. Stop and ask for review before moving to the next phase.
 * Documentation: Add brief comment blocks to complex logic (especially progress calculations and offline sync).
 * Atomic Implementation: Ensure every feature is fully functional (e.g., dynamic progress bars) before proceeding to UI polish.
Next Step: Please initialize the Vite project with TypeScript, install MUI and Firebase, and set up the base folder structure. Stop when the "Hello World" page is running.
