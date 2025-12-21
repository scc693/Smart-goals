import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { Group } from "@/types";

export function useCreateGroup() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (name: string) => {
            if (!user) throw new Error("Not authenticated");
            const groupId = doc(collection(db, "groups")).id;
            const group: Group = {
                id: groupId,
                name,
                members: [user.uid],
                createdBy: user.uid,
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, "groups", groupId), group);
            return group;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
        },
    });
}

export function useJoinGroup() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupId: string) => {
            if (!user) throw new Error("Not authenticated");

            const groupRef = doc(db, "groups", groupId);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) {
                throw new Error("Group not found");
            }

            await updateDoc(groupRef, {
                members: arrayUnion(user.uid)
            });

            return groupId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
            // Also invalidate goals because we might see new shared goals
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
    });
}

export function useDeleteGroup() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupId: string) => {
            if (!user) throw new Error("Not authenticated");
            await deleteDoc(doc(db, "groups", groupId));
            return groupId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
        },
    });
}

export function useGroups() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["groups", user?.uid],
        queryFn: async () => {
            if (!user) return [];
            const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        },
        enabled: !!user,
    });
}
