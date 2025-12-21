import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { Goal } from "@/types";

export function useGoals() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["goals", user?.uid],
        queryFn: async () => {
            if (!user) return [];

            // Fetch goals where user is owner OR user is in sharedWith
            // Firestore limitation: OR queries with different fields can be tricky.
            // Strategy: Fetch owned goals first. Shared goals might need a separate query or 'matches' check if we can't do complex OR.
            // However, for MVP, prompt says: "Update the Goal query to fetch where userId == myId OR sharedWith contains myId."
            // Firestore supports `where('userId', '==', uid)` separate from `where('sharedWith', 'array-contains', uid)`.
            // We can run two parallel queries and merge, or use one if structured efficiently.

            // Let's do two parallel queries and merge for robustness.

            const goalsRef = collection(db, "goals");

            const ownedQuery = query(
                goalsRef,
                where("userId", "==", user.uid),
                // orderBy("createdAt", "desc") // requires index
            );

            const sharedQuery = query(
                goalsRef,
                where("sharedWith", "array-contains", user.uid)
            );

            const [ownedSnapshot, sharedSnapshot] = await Promise.all([
                getDocs(ownedQuery),
                getDocs(sharedQuery)
            ]);

            const goals: Goal[] = [];
            const seenIds = new Set<string>();

            [...ownedSnapshot.docs, ...sharedSnapshot.docs].forEach(doc => {
                if (!seenIds.has(doc.id)) {
                    seenIds.add(doc.id);
                    const data = doc.data();
                    goals.push({
                        id: doc.id,
                        ...data,
                        // Ensure Timestamps are handled if needed, usually Firestore SDK handles this but good to verify
                    } as Goal);
                }
            });

            return goals.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        },
        enabled: !!user,
    });
}
