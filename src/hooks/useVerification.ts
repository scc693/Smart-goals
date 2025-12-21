import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    collection,
    doc,
    serverTimestamp,
    runTransaction,
    increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { Verification, Goal, Group } from "@/types";
import { XP_STEP_COMPLETE, calculateLevel } from "./useUserStats";

// XP for helping verify someone's goal
export const XP_HELPER_BONUS = 5;

interface RequestVerificationInput {
    goalId: string;
    goalTitle: string;
    groupId: string;
    proofUrl?: string;
    proofText?: string;
}

export function useRequestVerification() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: RequestVerificationInput) => {
            if (!user) throw new Error("User not authenticated");

            const verificationId = doc(collection(db, "verifications")).id;

            const verification: Verification = {
                id: verificationId,
                goalId: input.goalId,
                requesterId: user.uid,
                requesterName: user.displayName || user.email?.split("@")[0] || "Anonymous",
                proofUrl: input.proofUrl,
                proofText: input.proofText,
                status: 'pending',
                xpReward: XP_STEP_COMPLETE,
                createdAt: serverTimestamp(),
            };

            // Transaction: create verification + update goal status + create activity
            await runTransaction(db, async (transaction) => {
                // Create verification record
                transaction.set(doc(db, "verifications", verificationId), verification);

                // Update goal status to pending_verification
                transaction.update(doc(db, "goals", input.goalId), {
                    status: 'pending_verification',
                    verificationId: verificationId,
                });

                // Create activity for feed
                const activityId = doc(collection(db, "activities")).id;
                transaction.set(doc(db, "activities", activityId), {
                    id: activityId,
                    type: 'verification_request',
                    userId: user.uid,
                    userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
                    userAvatar: user.photoURL,
                    groupId: input.groupId,
                    goalId: input.goalId,
                    goalTitle: input.goalTitle,
                    metadata: {
                        photoURL: input.proofUrl,
                    },
                    timestamp: serverTimestamp(),
                });
            });

            return verification;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["verifications"] });
        },
    });
}

interface ApproveVerificationInput {
    verificationId: string;
    goalId: string;
    goalTitle: string;
    requesterId: string;
    groupId: string;
}

export function useApproveVerification() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: ApproveVerificationInput) => {
            if (!user) throw new Error("User not authenticated");
            if (user.uid === input.requesterId) {
                throw new Error("Cannot verify your own goal");
            }

            await runTransaction(db, async (transaction) => {
                // Get verification
                const verificationRef = doc(db, "verifications", input.verificationId);
                const verificationSnap = await transaction.get(verificationRef);
                if (!verificationSnap.exists()) {
                    throw new Error("Verification not found");
                }

                const verification = verificationSnap.data() as Verification;
                if (verification.status !== 'pending') {
                    throw new Error("Verification already processed");
                }

                // Verify user is in the group
                const goalRef = doc(db, "goals", input.goalId);
                const goalSnap = await transaction.get(goalRef);
                if (!goalSnap.exists()) {
                    throw new Error("Goal not found");
                }
                const goalData = goalSnap.data() as Goal;

                if (goalData.groupId) {
                    const groupRef = doc(db, "groups", goalData.groupId);
                    const groupSnap = await transaction.get(groupRef);
                    if (!groupSnap.exists()) {
                        throw new Error("Group not found");
                    }
                    const groupData = groupSnap.data() as Group;
                    if (!groupData.members.includes(user.uid)) {
                        throw new Error("Not authorized to verify this goal");
                    }
                }

                // Update verification
                transaction.update(verificationRef, {
                    status: 'approved',
                    approverId: user.uid,
                    approverName: user.displayName || user.email?.split("@")[0] || "Anonymous",
                    resolvedAt: serverTimestamp(),
                });

                // Complete the goal
                transaction.update(goalRef, {
                    status: 'completed',
                    verificationId: null,
                });

                // Propagate completedSteps to ancestors (same as toggle step)
                const validAncestors = (goalData.ancestors || []).filter(
                    (id): id is string => typeof id === "string" && id.trim() !== ""
                );
                validAncestors.forEach((ancestorId) => {
                    transaction.update(doc(db, "goals", ancestorId), {
                        completedSteps: increment(1),
                    });
                });

                // Award XP to requester
                const requesterStatsRef = doc(db, "userStats", input.requesterId);
                const requesterStatsSnap = await transaction.get(requesterStatsRef);
                if (requesterStatsSnap.exists()) {
                    const currentXP = requesterStatsSnap.data().xp || 0;
                    const newXP = currentXP + verification.xpReward;
                    transaction.update(requesterStatsRef, {
                        xp: increment(verification.xpReward),
                        level: calculateLevel(newXP),
                    });
                }

                // Award helper XP to verifier
                const verifierStatsRef = doc(db, "userStats", user.uid);
                const verifierStatsSnap = await transaction.get(verifierStatsRef);
                if (verifierStatsSnap.exists()) {
                    const currentXP = verifierStatsSnap.data().xp || 0;
                    const newXP = currentXP + XP_HELPER_BONUS;
                    transaction.update(verifierStatsRef, {
                        xp: increment(XP_HELPER_BONUS),
                        level: calculateLevel(newXP),
                    });
                }

                // Create activity for approval
                const activityId = doc(collection(db, "activities")).id;
                transaction.set(doc(db, "activities", activityId), {
                    id: activityId,
                    type: 'verification_approved',
                    userId: user.uid,
                    userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
                    userAvatar: user.photoURL,
                    groupId: input.groupId,
                    goalId: input.goalId,
                    goalTitle: input.goalTitle,
                    metadata: {
                        xpGained: verification.xpReward,
                    },
                    timestamp: serverTimestamp(),
                });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["verifications"] });
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
        },
    });
}

export function usePendingVerifications(groupId: string | null) {
    const queryClient = useQueryClient();

    // For now, we read verifications from the activities feed
    // In a production app, you'd have a separate query for pending verifications
    return {
        invalidate: () => {
            queryClient.invalidateQueries({ queryKey: ["verifications", groupId] });
        },
    };
}
