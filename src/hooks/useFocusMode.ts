import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, Timestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { FocusStatus } from "@/types";

interface ToggleFocusInput {
    goalId: string;
    goalTitle: string;
}

export function useFocusMode() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const startFocus = useMutation({
        mutationFn: async (input: ToggleFocusInput) => {
            if (!user) throw new Error("User not authenticated");

            const focusStatus: FocusStatus = {
                goalId: input.goalId,
                goalTitle: input.goalTitle,
                startedAt: Timestamp.now(),
            };

            await setDoc(
                doc(db, "userStats", user.uid),
                { focusStatus },
                { merge: true }
            );

            return focusStatus;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
        },
    });

    const stopFocus = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("User not authenticated");

            await setDoc(
                doc(db, "userStats", user.uid),
                { focusStatus: null },
                { merge: true }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
        },
    });

    return {
        startFocus: startFocus.mutate,
        stopFocus: stopFocus.mutate,
        isStarting: startFocus.isPending,
        isStopping: stopFocus.isPending,
    };
}
