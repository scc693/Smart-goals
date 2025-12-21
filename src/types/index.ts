import { Timestamp } from "firebase/firestore";

export interface Goal {
    id: string;
    userId: string;
    title: string;
    type: 'goal' | 'sub-goal' | 'step';
    status: 'active' | 'completed';

    // Recursion Logic
    parentId: string | null;
    ancestors: string[]; // Array of parent IDs [root_id, subgoal_id] for efficient querying

    // Shared/Social
    groupId: string | null;
    sharedWith: string[]; // Array of userUIDs for read/write access

    // Progress
    totalSteps: number;
    completedSteps: number;

    // Metadata
    deadline: Timestamp | null;
    createdAt: Timestamp;
    order?: number; // For manual sorting
}

export interface Group {
    id: string;
    name: string;
    members: string[]; // Array of userUIDs
    createdBy: string;
    createdAt: Timestamp;
}
