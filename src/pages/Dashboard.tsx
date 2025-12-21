import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useGoals } from "@/hooks/useGoals";
import { buildGoalTree } from "@/lib/tree-utils";
import { GoalCard } from "@/components/GoalCard";
import { CreateGoalModal } from "@/components/CreateGoalModal";
import { GroupsManager } from "@/components/GroupsManager";
import { Plus, Layout } from "lucide-react";

export default function Dashboard() {
    const { logout, user } = useAuth();
    const { data: goals, isLoading } = useGoals();
    const [showCompleted, setShowCompleted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGoalParentId, setNewGoalParentId] = useState<string | null>(null);
    const [newGoalAncestors, setNewGoalAncestors] = useState<string[]>([]);

    // Filter goals based on completion status (for root goals)
    // Note: If a sub-goal is active but root is completed, hiding root hides everything.
    // Standard behavior for tree views usually.
    const visibleGoals = useMemo(() => {
        if (!goals) return [];
        return goals.filter(g => {
            if (showCompleted) return true;
            // If hiding completed, hide if status is completed AND it's a root goal (parentId null).
            // For children, we can decide: do we hide completed steps in an active goal?
            // User asked: "marking them all as completed doesn't archive the goal".
            // This implies hiding the *completed Root Goal*.
            if (!g.parentId && g.status === 'completed') return false;
            return true;
        });
    }, [goals, showCompleted]);

    const goalTree = useMemo(() => buildGoalTree(visibleGoals), [visibleGoals]);

    const handleAddGoal = (parentId: string | null = null, ancestors: string[] = []) => {
        setNewGoalParentId(parentId);
        setNewGoalAncestors(ancestors);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-600 p-2">
                            <Layout className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">GoalTracker</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => logout()} className="text-xs font-medium text-gray-500 hover:text-red-500">
                            Sign Out
                        </button>
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-blue-100 ring-2 ring-white">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="User" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-blue-600 font-bold">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-2xl p-4">
                <GroupsManager />

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
                        ))}
                    </div>
                ) : goalTree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 rounded-full bg-blue-50 p-6">
                            <Layout className="h-12 w-12 text-blue-500" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">No goals yet</h3>
                        <p className="mb-6 max-w-xs text-gray-500">Start by creating a root goal to track your progress.</p>
                        <button
                            onClick={() => handleAddGoal()}
                            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-lg transition-transform active:scale-95"
                        >
                            Create First Goal
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {goalTree.map(goal => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onAddSubGoal={handleAddGoal}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* FAB for Mobile */}
            <button
                onClick={() => handleAddGoal()}
                className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 md:hidden"
            >
                <Plus size={28} />
            </button>

            {/* Create Modal */}
            <CreateGoalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                parentId={modalParentId}
                parentAncestors={modalAncestors}
            />
        </div>
    );
}
