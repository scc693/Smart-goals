import { useState, useRef, useCallback, useEffect } from "react";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useApproveVerification } from "@/hooks/useVerification";
import { useAuth } from "@/context/auth-context";
import type { Activity } from "@/types";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import { CheckCircle2, TrendingUp, HelpCircle, Award, Loader2, CheckCheck } from "lucide-react";

interface ActivityFeedProps {
    groupId: string | null;
    className?: string;
}

function getActivityIcon(type: Activity['type']) {
    switch (type) {
        case 'completion':
            return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        case 'level_up':
            return <TrendingUp className="h-5 w-5 text-purple-500" />;
        case 'verification_request':
            return <HelpCircle className="h-5 w-5 text-yellow-500" />;
        case 'verification_approved':
            return <Award className="h-5 w-5 text-blue-500" />;
        default:
            return <CheckCircle2 className="h-5 w-5 text-gray-500" />;
    }
}

function getActivityText(activity: Activity): string {
    switch (activity.type) {
        case 'completion':
            return `completed "${activity.goalTitle}"`;
        case 'level_up':
            return `reached Level ${activity.metadata?.level}!`;
        case 'verification_request':
            return `requests verification for "${activity.goalTitle}"`;
        case 'verification_approved':
            return `verified "${activity.goalTitle}"`;
        default:
            return 'did something';
    }
}

function formatTimestamp(timestamp: unknown): string {
    if (!timestamp) return '';

    let date: Date;
    if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
    } else if (typeof timestamp === 'object' && 'seconds' in (timestamp as object)) {
        date = new Date((timestamp as { seconds: number }).seconds * 1000);
    } else {
        return '';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function ActivityItem({
    activity,
    currentUserId,
    onApprove,
    isApproving
}: {
    activity: Activity;
    currentUserId: string | undefined;
    onApprove: (activity: Activity) => void;
    isApproving: boolean;
}) {
    const isOptimistic = activity.id.startsWith('optimistic-');
    const isVerificationRequest = activity.type === 'verification_request';
    const canVerify = isVerificationRequest && currentUserId && activity.userId !== currentUserId;

    return (
        <div className={cn(
            "flex items-start gap-3 rounded-lg p-3 transition-all",
            isOptimistic && "opacity-70 animate-pulse"
        )}>
            {/* Avatar */}
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-100">
                {activity.userAvatar ? (
                    <img
                        src={activity.userAvatar}
                        alt={activity.userName}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-600">
                        {activity.userName[0]?.toUpperCase() || '?'}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {getActivityIcon(activity.type)}
                    <p className="text-sm text-gray-900">
                        <span className="font-semibold">{activity.userName}</span>
                        {' '}
                        <span className="text-gray-600">{getActivityText(activity)}</span>
                    </p>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                    {formatTimestamp(activity.timestamp)}
                </p>

                {/* XP Badge */}
                {activity.metadata?.xpGained && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        +{activity.metadata.xpGained} XP
                    </span>
                )}

                {/* Proof Image Preview */}
                {activity.metadata?.photoURL && (
                    <div className="mt-2">
                        <img
                            src={activity.metadata.photoURL}
                            alt="Proof"
                            className="h-20 w-20 rounded-lg object-cover"
                        />
                    </div>
                )}

                {/* Verify Button */}
                {canVerify && (
                    <button
                        onClick={() => onApprove(activity)}
                        disabled={isApproving}
                        className="mt-2 flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                    >
                        {isApproving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <CheckCheck size={14} />
                        )}
                        Verify
                    </button>
                )}
            </div>
        </div>
    );
}

export function ActivityFeed({ groupId, className }: ActivityFeedProps) {
    const { user } = useAuth();
    const [filter, setFilter] = useState<'all' | 'mine'>('all');
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const { mutate: approveVerification } = useApproveVerification();
    const {
        data,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useActivityFeed({ groupId, filter });

    const handleApprove = useCallback((activity: Activity) => {
        if (!activity.goalId || !groupId) return;

        setApprovingId(activity.id);

        // We need to get the verificationId - it should be on the goal
        // For now, we'll use goalId to look it up or pass it via activity metadata
        // This is a simplified version that assumes goalId maps to verification
        approveVerification({
            verificationId: activity.goalId, // This would be the actual verificationId
            goalId: activity.goalId,
            goalTitle: activity.goalTitle || '',
            requesterId: activity.userId,
            groupId: groupId,
        }, {
            onSettled: () => setApprovingId(null),
        });
    }, [approveVerification, groupId]);

    // Infinite scroll observer
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
        [hasNextPage, isFetchingNextPage, fetchNextPage]
    );

    useEffect(() => {
        const element = loadMoreRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(handleObserver, {
            threshold: 0.1,
        });
        observer.observe(element);

        return () => observer.disconnect();
    }, [handleObserver]);

    if (!groupId) {
        return (
            <div className={cn("rounded-lg border bg-white p-6 text-center text-gray-500", className)}>
                Select a group to see activity
            </div>
        );
    }

    const activities = data?.pages.flatMap((page) => page.activities) ?? [];

    return (
        <div className={cn("rounded-lg border bg-white", className)}>
            {/* Header with Filter */}
            <div className="flex items-center justify-between border-b p-4">
                <h3 className="font-semibold text-gray-900">Activity Feed</h3>
                <div className="flex rounded-lg bg-gray-100 p-0.5">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            filter === 'all'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('mine')}
                        className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                            filter === 'mine'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        Mine
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : isError ? (
                    <div className="p-6 text-center text-red-500">
                        Failed to load activities
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p className="text-sm">No activity yet</p>
                        <p className="mt-1 text-xs text-gray-400">
                            Complete a goal to see it here!
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {activities.map((activity) => (
                            <ActivityItem
                                key={activity.id}
                                activity={activity}
                                currentUserId={user?.uid}
                                onApprove={handleApprove}
                                isApproving={approvingId === activity.id}
                            />
                        ))}
                    </div>
                )}

                {/* Load More Trigger */}
                <div ref={loadMoreRef} className="h-4" />

                {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                )}
            </div>
        </div>
    );
}
