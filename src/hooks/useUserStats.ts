import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { UserStats } from "@/types";

// XP Constants
export const XP_STEP_COMPLETE = 10;
export const XP_SUBGOAL_BONUS = 25;
export const XP_GOAL_BONUS = 50;

// Level calculation: level = floor(sqrt(xp / 100)) + 1
export function calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// XP needed for next level
export function xpForLevel(level: number): number {
    return (level - 1) ** 2 * 100;
}

// Get today's date in YYYY-MM-DD format
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

// Check if date is yesterday
function isYesterday(dateStr: string): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().split('T')[0];
}

export function useUserStats() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["userStats", user?.uid],
        queryFn: async () => {
            if (!user) return null;

            const statsRef = doc(db, "userStats", user.uid);
            const statsSnap = await getDoc(statsRef);

            if (!statsSnap.exists()) {
                // Create initial stats
                const initialStats: UserStats = {
                    id: user.uid,
                    xp: 0,
                    level: 1,
                    streak: 0,
                    lastActiveDate: "",
                    createdAt: serverTimestamp(),
                };
                await setDoc(statsRef, initialStats);
                return initialStats;
            }

            return statsSnap.data() as UserStats;
        },
        enabled: !!user,
    });
}

export function useAwardXP() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
            if (!user) throw new Error("Not authenticated");

            const statsRef = doc(db, "userStats", user.uid);
            const statsSnap = await getDoc(statsRef);
            const today = getTodayString();

            let newStreak = 1;

            if (statsSnap.exists()) {
                const current = statsSnap.data() as UserStats;
                const lastActive = current.lastActiveDate;

                if (lastActive === today) {
                    // Already active today, keep streak
                    newStreak = current.streak;
                } else if (isYesterday(lastActive)) {
                    // Consecutive day, increment streak
                    newStreak = current.streak + 1;
                }
                // Otherwise, streak resets to 1

                const newXP = current.xp + amount;
                const newLevel = calculateLevel(newXP);

                await setDoc(statsRef, {
                    xp: increment(amount),
                    level: newLevel,
                    streak: newStreak,
                    lastActiveDate: today,
                }, { merge: true });

                return { xp: newXP, level: newLevel, streak: newStreak, xpGained: amount, reason };
            } else {
                // Create new stats
                const newStats: UserStats = {
                    id: user.uid,
                    xp: amount,
                    level: calculateLevel(amount),
                    streak: 1,
                    lastActiveDate: today,
                    createdAt: serverTimestamp(),
                };
                await setDoc(statsRef, newStats);
                return { ...newStats, xpGained: amount, reason };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
        },
    });
}
