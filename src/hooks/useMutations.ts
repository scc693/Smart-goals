import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, setDoc, increment, serverTimestamp, runTransaction } from "firebase/firestore";
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
            // Calculate new ancestors
            const ancestors = newGoal.parentAncestors
                ? [...newGoal.parentAncestors, newGoal.parentId!]
                : [];

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
                const parentRef = doc(db, "goals", goal.parentId);
                await runTransaction(db, async (transaction) => {
                    transaction.set(doc(db, "goals", goalId), goal);
                    transaction.update(parentRef, {
                        totalSteps: increment(1)
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

export function useToggleStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stepId, parentId, isCompleted }: { stepId: string; parentId: string; isCompleted: boolean }) => {
            const stepRef = doc(db, "goals", stepId);
            const parentRef = doc(db, "goals", parentId);

            await runTransaction(db, async (transaction) => {
                transaction.update(stepRef, {
                    status: isCompleted ? 'completed' : 'active'
                });
                transaction.update(parentRef, {
                    completedSteps: increment(isCompleted ? 1 : -1)
                });
            });
        },
        // Optimistic updates omitted for brevity in fix if they caused issues, but usually fine. 
        // The previous implementation had type errors in onMutate/onError context.
        // I'll keep the logic but fix types.
        onMutate: async ({ stepId, parentId, isCompleted }) => {
            await queryClient.cancelQueries({ queryKey: ["goals"] });
            const previousGoals = queryClient.getQueryData<Goal[]>(["goals"]);

            if (previousGoals) {
                queryClient.setQueryData<Goal[]>(["goals"], (old) => {
                    if (!old) return [];
                    return old.map(g => {
                        if (g.id === stepId) {
                            return { ...g, status: isCompleted ? 'completed' : 'active' };
                        }
                        if (g.id === parentId) {
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
        onError: (_err, _newTodo, context) => { // Fixed unused vars
            if (context?.previousGoals) {
                queryClient.setQueryData(["goals"], context.previousGoals);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        }
    });
}
