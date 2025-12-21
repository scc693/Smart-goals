import { useUserStats, xpForLevel } from "@/hooks/useUserStats";
import { Flame, Star, TrendingUp } from "lucide-react";

export function UserStatsCard() {
    const { data: stats, isLoading } = useUserStats();

    if (isLoading || !stats) {
        return (
            <div className="flex items-center gap-4 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 p-3 text-white animate-pulse">
                <div className="h-10 w-10 rounded-full bg-white/20" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 rounded bg-white/20" />
                    <div className="h-2 w-full rounded bg-white/20" />
                </div>
            </div>
        );
    }

    const currentLevelXP = xpForLevel(stats.level);
    const nextLevelXP = xpForLevel(stats.level + 1);
    const progressInLevel = stats.xp - currentLevelXP;
    const xpNeededForNext = nextLevelXP - currentLevelXP;
    const progressPercent = Math.min((progressInLevel / xpNeededForNext) * 100, 100);

    return (
        <div className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white shadow-lg">
            <div className="flex items-center gap-4">
                {/* Level Badge */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
                    {stats.level}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <Star size={14} className="text-yellow-300" />
                            <span className="font-semibold">{stats.xp.toLocaleString()} XP</span>
                        </div>
                        {stats.streak > 0 && (
                            <div className="flex items-center gap-1">
                                <Flame size={14} className="text-orange-300" />
                                <span className="font-semibold">{stats.streak} day{stats.streak !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-xs opacity-80">
                            <span>Level {stats.level}</span>
                            <span>{progressInLevel}/{xpNeededForNext} XP</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                            <div
                                className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <TrendingUp size={20} className="opacity-60" />
            </div>
        </div>
    );
}
