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
    const [allowedTypes, setAllowedTypes] = useState<('goal' | 'sub-goal' | 'step')[]>(['goal']);

    const visibleGoals = useMemo(() => {
        if (!goals) return [];
        return goals.filter(g => {
            if (showCompleted) return true;
            if (!g.parentId && g.status === 'completed') return false;
            return true;
        });
    }, [goals, showCompleted]);

    const goalTree = useMemo(() => buildGoalTree(visibleGoals), [visibleGoals]);

    const handleAddGoal = (parentId: string | null = null, ancestors: string[] = [], level: number = 0) => {
        console.log(`Open Modal - Parent: ${parentId}, Level: ${level}`);
        setNewGoalParentId(parentId);
        setNewGoalAncestors(ancestors);

        // Define allowed types based on depth/level
        // Level 0 (Root) creation: 'goal'
        // Level 1 creation (Child of Root): 'sub-goal' or 'step'
        // Level 2 creation (Child of Sub-goal): 'step' only
        if (parentId === null) {
            setAllowedTypes(['goal']);
        } else if (level === 0) { // Parent is Root Goal
            setAllowedTypes(['sub-goal', 'step']);
        } else { // Parent is Sub-goal (or deeper, though we shouldn't get deeper)
            setAllowedTypes(['step']);
        }

        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900">Your Goals</h1>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={showCompleted}
                                    onChange={e => setShowCompleted(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Show Completed
                            </label>
                            <button
                                onClick={() => handleAddGoal()}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                            >
                                <Plus size={20} />
                                New Goal
                            </button>
                        </div>
                    </div>
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
            </header >

        {/* Main Content */ }
        < main className = "mx-auto max-w-2xl p-4" >
            <GroupsManager />

    {
        isLoading ? (
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
        )
    }
            </main >

        {/* FAB for Mobile */ }
        < button
    onClick = {() => handleAddGoal()
}
className = "fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 md:hidden"
    >
    <Plus size={28} />
            </button >

    {/* Create Modal */ }
    < CreateGoalModal
isOpen = { isModalOpen }
onClose = {() => setIsModalOpen(false)}
parentId = { newGoalParentId }
parentAncestors = { newGoalAncestors }
allowedTypes = { allowedTypes }
    />
        </div >
    );
}
