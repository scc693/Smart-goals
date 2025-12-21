import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { Goal } from "@/types";

const MAX_IN_CLAUSE = 10;

const chunkIds = (ids: string[], size: number) => {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += size) {
        chunks.push(ids.slice(i, i + size));
    }
    return chunks;
};

export function useGoals({ groupIds = [] }: { groupIds?: string[] } = {}) {
    const { user } = useAuth();
    const uniqueGroupIds = Array.from(new Set(groupIds.filter(Boolean)));

    return useQuery({
        queryKey: ["goals", user?.uid, uniqueGroupIds],
        queryFn: async () => {
            if (!user) return [];

            // Fetch goals where user is owner OR user is in sharedWith
            // Firestore limitation: OR queries with different fields can be tricky.
            // Strategy: Fetch owned goals first. Shared goals might need a separate query or 'matches' check if we can't do complex OR.
            // However, for MVP, prompt says: "Update the Goal query to fetch where userId == myId OR sharedWith contains myId."
            // Firestore supports `where('userId', '==', uid)` and `where('sharedWith', 'array-contains', uid)` separately.
            // Also include group goals for any groups the user belongs to.

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

            const groupQueries = uniqueGroupIds.length > 0
                ? chunkIds(uniqueGroupIds, MAX_IN_CLAUSE).map(chunk => (
                    query(goalsRef, where("groupId", "in", chunk))
                ))
                : [];

            const snapshots = await Promise.all([
                getDocs(ownedQuery),
                getDocs(sharedQuery),
                ...groupQueries.map(qry => getDocs(qry))
            ]);

            const [ownedSnapshot, sharedSnapshot, ...groupSnapshots] = snapshots;

            const goals: Goal[] = [];
            const seenIds = new Set<string>();

            const allDocs = [
                ...ownedSnapshot.docs,
                ...sharedSnapshot.docs,
                ...groupSnapshots.flatMap(snapshot => snapshot.docs),
            ];

            allDocs.forEach(doc => {
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

            const getCreatedAtMillis = (goal: Goal) => {
                const createdAt = goal.createdAt;
                if (createdAt instanceof Timestamp) {
                    return createdAt.toMillis();
                }
                if (createdAt && typeof (createdAt as Timestamp).seconds === "number") {
                    return (createdAt as Timestamp).seconds * 1000;
                }
                return 0;
            };

            return goals.sort((a, b) => getCreatedAtMillis(b) - getCreatedAtMillis(a));
        },
        enabled: !!user,
    });
}
