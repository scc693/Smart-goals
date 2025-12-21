import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, setDoc, increment, serverTimestamp, runTransaction, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
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
                createdAt: serverTimestamp(),
                ancestors, // Valid here
                ...goalData, // goalData (without ancestors) spread here
            };

            if (goal.parentId) {
                await runTransaction(db, async (transaction) => {
                    transaction.set(doc(db, "goals", goalId), goal);

                    // Only STEPS count toward totalSteps (not sub-goals)
                    // This ensures progress % is based on completed steps / total steps
                    if (goal.type === 'step') {
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
                    }
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

                const survivingAncestors = (goalData.ancestors || []).filter((id): id is string => id != null && id !== '');

                // Calculate stats to remove from surviving ancestors
                let totalStepsToRemove = 0;
                let completedStepsToRemove = 0;

                // Check the target goal itself
                if (goalData.type === 'step') {
                    totalStepsToRemove++;
                    if (goalData.status === 'completed') completedStepsToRemove++;
                }

                // Check all descendants
                snapshot.docs.forEach(doc => {
                    const data = doc.data() as Goal;
                    if (data.type === 'step') {
                        totalStepsToRemove++;
                        if (data.status === 'completed') completedStepsToRemove++;
                    }
                    transaction.delete(doc.ref);
                });

                // Delete the target goal
                transaction.delete(goalRef);

                // Update surviving ancestors if there are stats to remove
                if (totalStepsToRemove > 0 || completedStepsToRemove > 0) {
                    survivingAncestors.forEach(ancestorId => {
                        const ancestorRef = doc(db, "goals", ancestorId);
                        transaction.update(ancestorRef, {
                            totalSteps: increment(-totalStepsToRemove),
                            completedSteps: increment(-completedStepsToRemove)
                        });
                    });
                }
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

export function useMarkGoalComplete() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ goalId, isCompleted }: { goalId: string; isCompleted: boolean }) => {
            const goalRef = doc(db, "goals", goalId);
            await setDoc(goalRef, {
                status: isCompleted ? 'completed' : 'active'
            }, { merge: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        }
    });
}

export function useReorderGoals() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ items }: { items: { id: string; order: number }[] }) => {
            if (items.length === 0) return;

            const batch = writeBatch(db);
            items.forEach(item => {
                const ref = doc(db, 'goals', item.id);
                batch.update(ref, { order: item.order });
            });

            await batch.commit();
        },
        onMutate: async ({ items }) => {
            await queryClient.cancelQueries({ queryKey: ["goals"] });
            const previousGoals = queryClient.getQueryData<Goal[]>(["goals"]);

            if (previousGoals) {
                queryClient.setQueryData<Goal[]>(["goals"], (old) => {
                    if (!old) return [];
                    return old.map(g => {
                        const update = items.find(i => i.id === g.id);
                        return update ? { ...g, order: update.order } : g;
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
