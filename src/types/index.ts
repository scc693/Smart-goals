import { FieldValue, Timestamp } from "firebase/firestore";

export interface Goal {
    id: string;
    userId: string;
    title: string;
    type: 'goal' | 'sub-goal' | 'step';
    status: 'active' | 'completed' | 'pending_verification';

    // Verification
    requiresVerification?: boolean;
    verificationId?: string; // Reference to pending verification

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
    createdAt: Timestamp | FieldValue;
    order?: number; // For manual sorting
}

export interface Group {
    id: string;
    name: string;
    members: string[]; // Array of userUIDs
    createdBy: string;
    createdAt: Timestamp | FieldValue;
}

export interface UserStats {
    id: string;              // Same as user.uid
    xp: number;              // Total XP earned
    level: number;           // Calculated from XP
    streak: number;          // Current streak (days)
    lastActiveDate: string;  // YYYY-MM-DD format
    createdAt: Timestamp | FieldValue;
    focusStatus?: FocusStatus | null;
}

export interface FocusStatus {
    goalId: string;
    goalTitle: string;
    startedAt: Timestamp;
}

export interface Activity {
    id: string;
    type: 'completion' | 'level_up' | 'verification_request' | 'verification_approved';
    userId: string;
    userName: string;
    userAvatar: string | null;
    groupId: string;
    goalId?: string;
    goalTitle?: string;
    metadata?: {
        photoURL?: string;
        xpGained?: number;
        level?: number;
    };
    timestamp: Timestamp | FieldValue;
}

export interface Verification {
    id: string;
    goalId: string;
    requesterId: string;
    requesterName: string;
    proofUrl?: string;
    proofText?: string;
    status: 'pending' | 'approved' | 'rejected';
    approverId?: string;
    approverName?: string;
    xpReward: number;
    createdAt: Timestamp | FieldValue;
    resolvedAt?: Timestamp;
}
