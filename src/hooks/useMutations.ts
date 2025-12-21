import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, setDoc, increment, serverTimestamp, runTransaction, query, where, getDocs, getDoc, type Transaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { Goal, Group } from "@/types";

const sanitizeIds = (ids: Array<string | null | undefined>) => {
    return Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && id.trim() !== "")));
};

const hasDirectGoalAccess = (goal: Goal, uid: string) => {
    if (goal.userId === uid) return true;
    const sharedWith = Array.isArray(goal.sharedWith) ? goal.sharedWith : [];
    return sharedWith.includes(uid);
};

const isGroupMember = async (groupId: string, uid: string) => {
    const groupSnap = await getDoc(doc(db, "groups", groupId));
    if (!groupSnap.exists()) return false;
    const groupData = groupSnap.data() as Group;
    return Array.isArray(groupData.members) && groupData.members.includes(uid);
};

const isGroupMemberTx = async (
    transaction: Transaction,
    groupId: string,
    uid: string,
    cache?: Map<string, boolean>
) => {
    if (cache?.has(groupId)) {
        return cache.get(groupId) ?? false;
    }

    const groupSnap = await transaction.get(doc(db, "groups", groupId));
    const allowed = groupSnap.exists()
        && Array.isArray((groupSnap.data() as Group).members)
        && (groupSnap.data() as Group).members.includes(uid);

    cache?.set(groupId, allowed);
    return allowed;
};

const canAccessGoalTx = async (
    transaction: Transaction,
    goal: Goal,
    uid: string,
    cache?: Map<string, boolean>
) => {
    if (hasDirectGoalAccess(goal, uid)) return true;
    if (goal.groupId) {
        return isGroupMemberTx(transaction, goal.groupId, uid, cache);
    }
    return false;
};

const assertCanAccessGoalTx = async (
    transaction: Transaction,
    goal: Goal,
    uid: string,
    cache?: Map<string, boolean>
) => {
    const allowed = await canAccessGoalTx(transaction, goal, uid, cache);
    if (!allowed) {
        throw new Error("Not authorized to modify this goal");
    }
};

export function useCreateGoal() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newGoal: Omit<Goal, 'id' | 'createdAt' | 'userId' | 'sharedWith' | 'completedSteps' | 'totalSteps' | 'ancestors'> & { parentAncestors?: string[] }) => {
            if (!user) throw new Error("User not authenticated");

            const goalId = doc(collection(db, "goals")).id;

            // Destructure to separate helpers from data
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { parentAncestors, ...goalData } = newGoal;

            const baseGoal = {
                id: goalId,
                userId: user.uid,
                sharedWith: [],
                completedSteps: 0,
                totalSteps: 0,
                createdAt: serverTimestamp(),
            };

            if (goalData.parentId) {
                let createdGoal: Goal | null = null;
                await runTransaction(db, async (transaction) => {
                    const parentRef = doc(db, "goals", goalData.parentId);
                    const parentSnap = await transaction.get(parentRef);
                    if (!parentSnap.exists()) {
                        throw new Error("Parent goal not found");
                    }

                    const parentData = parentSnap.data() as Goal;
                    await assertCanAccessGoalTx(transaction, parentData, user.uid);

                    const ancestors = sanitizeIds([...(parentData.ancestors ?? []), parentData.id]);

                    const goal: Goal = {
                        ...baseGoal,
                        ...goalData,
                        parentId: parentData.id,
                        ancestors,
                        groupId: parentData.groupId ?? null,
                    };

                    transaction.set(doc(db, "goals", goalId), goal);

                    // Only STEPS count toward totalSteps (not sub-goals)
                    // This ensures progress % is based on completed steps / total steps
                    if (goal.type === 'step') {
                        ancestors.forEach(ancestorId => {
                            const ancestorRef = doc(db, "goals", ancestorId);
                            transaction.update(ancestorRef, {
                                totalSteps: increment(1)
                            });
                        });
                    }

                    createdGoal = goal;
                });
                if (!createdGoal) {
                    throw new Error("Failed to create goal");
                }
                return createdGoal;
            } else {
                const groupId = goalData.groupId ?? null;
                if (groupId) {
                    const allowed = await isGroupMember(groupId, user.uid);
                    if (!allowed) {
                        throw new Error("Not authorized to add goals to this group");
                    }
                }

                const goal: Goal = {
                    ...baseGoal,
                    ...goalData,
                    parentId: null,
                    ancestors: [],
                    groupId,
                };

                await setDoc(doc(db, "goals", goalId), goal);
                return goal;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
    });
}

export function useDeleteGoal() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ goalId }: { goalId: string; ancestors: string[] }) => {
            if (!user) throw new Error("User not authenticated");
            const goalRef = doc(db, "goals", goalId);

            // Query for all children (where ancestors contains goalId)
            const q = query(collection(db, "goals"), where("ancestors", "array-contains", goalId));
            const snapshot = await getDocs(q);

            await runTransaction(db, async (transaction) => {
                const goalDoc = await transaction.get(goalRef);
                if (!goalDoc.exists()) return;
                const goalData = goalDoc.data() as Goal;

                await assertCanAccessGoalTx(transaction, goalData, user.uid);

                const survivingAncestors = sanitizeIds(goalData.ancestors || []);

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
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stepId, isCompleted }: { stepId: string; ancestors: string[]; isCompleted: boolean }) => {
            console.log("Mutation started for:", stepId, "Target status completed:", isCompleted);
            if (!user) throw new Error("User not authenticated");
            const stepRef = doc(db, "goals", stepId);

            try {
                await runTransaction(db, async (transaction) => {
                    const stepDoc = await transaction.get(stepRef);
                    if (!stepDoc.exists()) throw new Error("Step not found");

                    const stepData = stepDoc.data() as Goal;
                    await assertCanAccessGoalTx(transaction, stepData, user.uid);

                    if (stepData.type !== 'step') {
                        throw new Error("Target goal is not a step");
                    }

                    const currentStatus = stepData.status;
                    const targetStatus = isCompleted ? 'completed' : 'active';

                    // CRITICAL: Integrity check. 
                    // If we want to set to 'completed' but it's ALREADY 'completed', do nothing.
                    // This prevents the double-counting bug.
                    if (currentStatus === targetStatus) return;

                    transaction.update(stepRef, {
                        status: targetStatus
                    });

                    // Propagate to ALL ancestors (from server data, not client input)
                    const delta = isCompleted ? 1 : -1;

                    // Filter out null/undefined values to prevent Firebase errors
                    const validAncestors = sanitizeIds(stepData.ancestors || []);

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
                        const validAncestors = sanitizeIds(ancestors);
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
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ goalId, isCompleted }: { goalId: string; isCompleted: boolean }) => {
            if (!user) throw new Error("User not authenticated");
            const goalRef = doc(db, "goals", goalId);
            await runTransaction(db, async (transaction) => {
                const goalSnap = await transaction.get(goalRef);
                if (!goalSnap.exists()) {
                    throw new Error("Goal not found");
                }
                const goalData = goalSnap.data() as Goal;
                await assertCanAccessGoalTx(transaction, goalData, user.uid);
                if (goalData.type === 'step') {
                    throw new Error("Use step toggle for steps");
                }
                transaction.update(goalRef, {
                    status: isCompleted ? 'completed' : 'active'
                });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        }
    });
}

export function useReorderGoals() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ items }: { items: { id: string; order: number }[] }) => {
            if (!user) throw new Error("User not authenticated");
            if (items.length === 0) return;

            await runTransaction(db, async (transaction) => {
                const groupCache = new Map<string, boolean>();
                for (const item of items) {
                    const ref = doc(db, 'goals', item.id);
                    const snap = await transaction.get(ref);
                    if (!snap.exists()) {
                        throw new Error("Goal not found");
                    }
                    const goalData = snap.data() as Goal;
                    await assertCanAccessGoalTx(transaction, goalData, user.uid, groupCache);
                    transaction.update(ref, { order: item.order });
                }
            });
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
