# Component Documentation

This document describes the main UI components and their prop interfaces.

## 🧱 Core Components

### `GoalCard`
The primary component for displaying a goal in the tree. Supports expansion, completion toggling, and sub-goal creation.
- **Props:**
    - `goal: GoalWithChildren`: The goal object with nested children.
    - `onAddSubGoal: (parentId: string, ancestors: string[], level: number) => void`: Callback triggered when the 'plus' button is clicked.
    - `level?: number`: The nesting level for indentation (default: 0).

### `ActivityFeed`
Displays a real-time stream of group activities (completions, level-ups, etc.).
- **Props:**
    - `groupId: string | null`: The ID of the group to show activity for.
    - `className?: string`: Optional CSS classes for the container.

### `VerificationModal`
A modal for submitting proof (photo or text) for goal completion.
- **Props:**
    - `isOpen: boolean`: Controls modal visibility.
    - `onClose: () => void`: Callback to close the modal.
    - `goalId: string`: The ID of the goal being verified.
    - `goalTitle: string`: The title of the goal (for display).
    - `groupId: string`: The group context for the verification.

### `UserStatsCard`
Displays the user's current level, XP progress bar, and streak.
- **Props:** None (Uses `useUserStats` hook internally).

### `CreateGoalModal`
A modal for creating new goals or sub-goals.
- **Props:**
    - `isOpen: boolean`: Controls modal visibility.
    - `onClose: () => void`: Callback to close the modal.
    - `parentId: string | null`: If provided, creates a sub-goal.
    - `parentAncestors?: string[]`: The ancestor list of the parent.
    - `groupId?: string | null`: The group ID to associate with the new goal.

### `GroupsManager`
UI for creating and switching between groups.
- **Props:**
    - `onSelectGroup: (groupId: string | null) => void`: Callback when a group is selected.
    - `selectedGroupId: string | null`: Currently active group.

### `NotificationManager`
Handles PWA install prompts and push notification permissions.
- **Props:** None.

### `SortableGoalCard`
A wrapper around `GoalCard` for `@dnd-kit` drag-and-drop support.
- **Props:** (Same as `GoalCard` plus dnd-kit attributes).
