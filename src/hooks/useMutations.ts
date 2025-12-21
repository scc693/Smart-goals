import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, setDoc, increment, serverTimestamp, runTransaction, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { Goal } from "@/types";

export function useCreateGoal() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newGoal: Omit<Goal, 'id' | 'createdAt' | 'userId' | 'sharedWith' | 'completedSteps' | 'totalSteps' | 'ancestors'> & { parentAncestors?: string[] }) => {
            if (!user) throw new Error("User not authenticated");

            const goalId = doc(collection(db, "goals")).id;
            // Sanitize ancestors: remove nulls, empty strings, and duplicates
            const rawAncestors = newGoal.parentAncestors || [];
            const ancestors = [...new Set(rawAncestors.filter((id): id is string => id != null && id !== ''))];

            // Destructure to separate helpers from data
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { parentAncestors, ...goalData } = newGoal;

            const goal: Goal = {
                id: goalId,
                userId: user.uid,
                sharedWith: [],
                completedSteps: 0,
                totalSteps: 0,
                createdAt: serverTimestamp() as any,
                ancestors, // Valid here
                ...goalData, // goalData (without ancestors) spread here
            };

            if (goal.parentId) {
                await runTransaction(db, async (transaction) => {
                    transaction.set(doc(db, "goals", goalId), goal);

                    // Increment totalSteps on ALL ancestors (not just direct parent)
                    // This matches how completedSteps propagates when a step is completed
                    const allAncestorIds = [...ancestors];
                    if (goal.parentId && !allAncestorIds.includes(goal.parentId)) {
                        allAncestorIds.push(goal.parentId);
                    }

                    allAncestorIds.forEach(ancestorId => {
                        const ancestorRef = doc(db, "goals", ancestorId);
                        transaction.update(ancestorRef, {
                            totalSteps: increment(1)
                        });
                    });
                });
            } else {
                await setDoc(doc(db, "goals", goalId), goal);
            }

            return goal;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
    });
}

export function useDeleteGoal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ goalId }: { goalId: string; ancestors: string[] }) => {
            const goalRef = doc(db, "goals", goalId);

            // Query for all children (where ancestors contains goalId)
            const q = query(collection(db, "goals"), where("ancestors", "array-contains", goalId));
            const snapshot = await getDocs(q);

            await runTransaction(db, async (transaction) => {
                const goalDoc = await transaction.get(goalRef);
                if (!goalDoc.exists()) return;
                const goalData = goalDoc.data() as Goal;

                transaction.delete(goalRef); // Delete the goal itself

                // Delete all children
                snapshot.docs.forEach(doc => {
                    transaction.delete(doc.ref);
                });

                // Decrement totalSteps and completedSteps on ALL ancestors (not just direct parent)
                // Filter out invalid ancestor IDs
                const validAncestors = (goalData.ancestors || []).filter((id): id is string => id != null && id !== '');

                validAncestors.forEach(ancestorId => {
                    const ancestorRef = doc(db, "goals", ancestorId);
                    transaction.update(ancestorRef, {
                        totalSteps: increment(-1),
                        completedSteps: increment(goalData.status === 'completed' ? -1 : 0)
                    });
                });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
    });
}

export function useToggleStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stepId, ancestors, isCompleted }: { stepId: string; ancestors: string[]; isCompleted: boolean }) => {
            console.log("Mutation started for:", stepId, "Target status completed:", isCompleted);
            const stepRef = doc(db, "goals", stepId);

            try {
                await runTransaction(db, async (transaction) => {
                    const stepDoc = await transaction.get(stepRef);
                    if (!stepDoc.exists()) throw new Error("Step not found");

                    const currentStatus = stepDoc.data().status;
                    const targetStatus = isCompleted ? 'completed' : 'active';

                    // CRITICAL: Integrity check. 
                    // If we want to set to 'completed' but it's ALREADY 'completed', do nothing.
                    // This prevents the double-counting bug.
                    if (currentStatus === targetStatus) return;

                    transaction.update(stepRef, {
                        status: targetStatus
                    });

                    // Propagate to ALL ancestors
                    // ancestors is array of IDs.
                    const delta = isCompleted ? 1 : -1;

                    // Filter out null/undefined values to prevent Firebase errors
                    const validAncestors = ancestors.filter((id): id is string => id != null && id !== '');

                    validAncestors.forEach(ancestorId => {
                        const ancestorRef = doc(db, "goals", ancestorId);
                        transaction.update(ancestorRef, {
                            completedSteps: increment(delta)
                        });
                    });
                });
            } catch (error) {
                console.error("Mutation failed:", error);
                throw error;
            }
        },
        onMutate: async ({ stepId, ancestors, isCompleted }) => {
            await queryClient.cancelQueries({ queryKey: ["goals"] });
            const previousGoals = queryClient.getQueryData<Goal[]>(["goals"]);

            if (previousGoals) {
                queryClient.setQueryData<Goal[]>(["goals"], (old) => {
                    if (!old) return [];
                    // Check if update is valid relative to cache to avoid local double-count visual
                    const target = old.find(g => g.id === stepId);
                    if (target && target.status === (isCompleted ? 'completed' : 'active')) {
                        return old; // No change needed
                    }

                    return old.map(g => {
                        if (g.id === stepId) {
                            return { ...g, status: isCompleted ? 'completed' : 'active' };
                        }
                        const validAncestors = ancestors.filter((id): id is string => id != null && id !== '');
                        if (validAncestors.includes(g.id)) {
                            return {
                                ...g,
                                completedSteps: g.completedSteps + (isCompleted ? 1 : -1)
                            };
                        }
                        return g;
                    });
                });
            }
            return { previousGoals };
        },
        onError: (_err, _newTodo, context) => {
            if (context?.previousGoals) {
                queryClient.setQueryData(["goals"], context.previousGoals);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        }
    });
}

