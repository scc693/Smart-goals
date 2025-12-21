# API Documentation

This document provides documentation for the custom hooks and utility functions used in the Smart Goals PWA.

## 🪝 Hooks

### `useGoals`
Fetches goals for the authenticated user, including owned goals, shared goals, and group goals.
- **Parameters:**
    - `groupIds: string[]` (Optional): List of group IDs to include in the query.
- **Returns:** TanStack Query object containing `Goal[]`.

### `useMutations`
A collection of hooks for modifying goals.

#### `useCreateGoal`
Creates a new goal or sub-goal.
- **Mutation Input:**
    - `title: string`
    - `type: 'goal' | 'sub-goal' | 'step'`
    - `parentId: string | null`
    - `groupId: string | null`
    - `deadline: Timestamp | null`
    - `requiresVerification?: boolean`
- **Behavior:** Updates ancestor `totalSteps` if the new goal is of type `step`.

#### `useDeleteGoal`
Deletes a goal and all its descendants.
- **Mutation Input:**
    - `goalId: string`
    - `ancestors: string[]`
- **Behavior:** Subtracts completed/total steps from ancestors before deletion.

#### `useToggleStep`
Toggles a step's completion status.
- **Mutation Input:**
    - `stepId: string`
    - `ancestors: string[]`
    - `isCompleted: boolean`
- **Behavior:** Updates ancestor `completedSteps`.

#### `useMarkGoalComplete`
Marks a non-step goal as complete.
- **Mutation Input:**
    - `goalId: string`
    - `isCompleted: boolean`

#### `useReorderGoals`
Updates the manual order of goals.
- **Mutation Input:**
    - `items: { id: string; order: number }[]`

### `useVerification`
Hooks for the peer verification system.

#### `useRequestVerification`
Submits a verification request for a goal.
- **Mutation Input:**
    - `goalId: string`
    - `goalTitle: string`
    - `groupId: string`
    - `proofUrl?: string`
    - `proofText?: string`
- **Behavior:** Changes goal status to `pending_verification` and creates an activity.

#### `useApproveVerification`
Approves a pending verification request.
- **Mutation Input:**
    - `verificationId: string`
    - `goalId: string`
    - `goalTitle: string`
    - `requesterId: string`
    - `groupId: string`
- **Behavior:** Completes the goal, awards XP to both the requester and the helper, and updates ancestor counts.

### `useUserStats`
Fetches and updates user statistics.

#### `useUserStats`
Fetches the current user's XP, level, and streak.
- **Returns:** TanStack Query object containing `UserStats`.

#### `useAwardXP`
Awards XP to the current user.
- **Mutation Input:**
    - `amount: number`
    - `reason: string`

### `useActivityFeed`
Fetches the activity stream for a group.
- **Parameters:**
    - `groupId: string | null`
    - `filter: 'all' | 'mine'`
- **Returns:** Infinite TanStack Query object.

---

## 🛠️ Utilities

### `tree-utils.ts`

#### `buildGoalTree(goals: Goal[]): GoalWithChildren[]`
Converts a flat list of goals into a hierarchical tree structure based on `parentId`.
- **Sorting:** Sorts by `order` if present, then by `createdAt`.

### `useUserStats.ts` (Logic)

#### `calculateLevel(xp: number): number`
Calculates the user level based on total XP. Formula: `floor(sqrt(xp / 100)) + 1`.

#### `xpForLevel(level: number): number`
Calculates the total XP required to reach a specific level.

### `utils.ts`

#### `cn(...inputs: ClassValue[])`
Utility for merging Tailwind CSS classes using `clsx` and `tailwind-merge`.
