import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
    Timestamp,
    type QueryDocumentSnapshot,
    type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { Activity } from "@/types";

const PAGE_SIZE = 20;

interface ActivityFeedOptions {
    groupId: string | null;
    filter?: 'all' | 'mine';
}

export function useActivityFeed({ groupId, filter = 'all' }: ActivityFeedOptions) {
    const { user } = useAuth();

    return useInfiniteQuery({
        queryKey: ["activities", groupId, filter, user?.uid],
        queryFn: async ({ pageParam }) => {
            if (!groupId || !user) return { activities: [], lastDoc: null };

            const activitiesRef = collection(db, "activities");

            let q = query(
                activitiesRef,
                where("groupId", "==", groupId),
                orderBy("timestamp", "desc"),
                limit(PAGE_SIZE)
            );

            // Add filter for user's own activities
            if (filter === 'mine') {
                q = query(
                    activitiesRef,
                    where("groupId", "==", groupId),
                    where("userId", "==", user.uid),
                    orderBy("timestamp", "desc"),
                    limit(PAGE_SIZE)
                );
            }

            // Add pagination cursor
            if (pageParam) {
                q = query(q, startAfter(pageParam));
            }

            const snapshot = await getDocs(q);
            const activities: Activity[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as Activity));

            const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

            return { activities, lastDoc };
        },
        getNextPageParam: (lastPage) => lastPage.lastDoc,
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        enabled: !!groupId && !!user,
    });
}

interface CreateActivityInput {
    type: Activity['type'];
    groupId: string;
    goalId?: string;
    goalTitle?: string;
    metadata?: Activity['metadata'];
}

export function useCreateActivity() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateActivityInput) => {
            if (!user) throw new Error("User not authenticated");

            const activityId = doc(collection(db, "activities")).id;
            const activity: Activity = {
                id: activityId,
                type: input.type,
                userId: user.uid,
                userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
                userAvatar: user.photoURL,
                groupId: input.groupId,
                goalId: input.goalId,
                goalTitle: input.goalTitle,
                metadata: input.metadata,
                timestamp: serverTimestamp(),
            };

            await setDoc(doc(db, "activities", activityId), activity);
            return activity;
        },
        onMutate: async (input) => {
            // Optimistic update: immediately add activity to cache
            const queryKey = ["activities", input.groupId, "all", user?.uid];
            await queryClient.cancelQueries({ queryKey });

            const previousData = queryClient.getQueryData(queryKey);

            // Create optimistic activity with client timestamp
            const optimisticActivity: Activity = {
                id: `optimistic-${Date.now()}`,
                type: input.type,
                userId: user?.uid || "",
                userName: user?.displayName || user?.email?.split("@")[0] || "Anonymous",
                userAvatar: user?.photoURL || null,
                groupId: input.groupId,
                goalId: input.goalId,
                goalTitle: input.goalTitle,
                metadata: input.metadata,
                timestamp: Timestamp.now(),
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.pages?.[0]) return old;
                return {
                    ...old,
                    pages: [
                        {
                            ...old.pages[0],
                            activities: [optimisticActivity, ...old.pages[0].activities],
                        },
                        ...old.pages.slice(1),
                    ],
                };
            });

            return { previousData, queryKey };
        },
        onError: (_err, _input, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(context.queryKey, context.previousData);
            }
        },
        onSettled: (_data, _error, input) => {
            // Always refetch after mutation
            queryClient.invalidateQueries({
                queryKey: ["activities", input.groupId],
            });
        },
    });
}
