import { useState, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useGoals } from "@/hooks/useGoals";
import { buildGoalTree } from "@/lib/tree-utils";
import { SortableGoalCard } from "@/components/SortableGoalCard";
import { CreateGoalModal } from "@/components/CreateGoalModal";
import { GroupsManager } from "@/components/GroupsManager";
import { Plus, Layout, Users, ChevronLeft } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { useReorderGoals } from "@/hooks/useMutations";

export default function Dashboard() {
    const { logout, user } = useAuth();
    const { data: goals, isLoading } = useGoals();
    const [showCompleted, setShowCompleted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGoalParentId, setNewGoalParentId] = useState<string | null>(null);
    const [newGoalAncestors, setNewGoalAncestors] = useState<string[]>([]);
    const [allowedTypes, setAllowedTypes] = useState<('goal' | 'sub-goal' | 'step')[]>(['goal']);

    // Tab State
    const [activeTab, setActiveTab] = useState<'personal' | 'groups'>('personal');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const { data: groups } = useGroups();

    const selectedGroup = groups?.find(g => g.id === selectedGroupId);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Minimum drag distance before activating
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const visibleGoals = useMemo(() => {
        if (!goals) return [];
        return goals.filter(g => {
            if (showCompleted) return true;
            if (!g.parentId && g.status === 'completed') return false;
            return true;
        }).filter(g => {
            // Filter by Tab/Context
            if (activeTab === 'personal') {
                return !g.groupId; // Only private goals
            } else {
                return g.groupId === selectedGroupId; // Only goals for selected group
            }
        });
    }, [goals, showCompleted, activeTab, selectedGroupId]);

    const goalTree = useMemo(() => buildGoalTree(visibleGoals), [visibleGoals]);

    const handleAddGoal = (parentId: string | null = null, ancestors: string[] = [], level: number = 0) => {
        console.log(`Open Modal - Parent: ${parentId}, Level: ${level}`);
        setNewGoalParentId(parentId);
        setNewGoalAncestors(ancestors);

        if (parentId === null) {
            setAllowedTypes(['goal']);
        } else if (level === 0) {
            setAllowedTypes(['sub-goal', 'step']);
        } else {
            setAllowedTypes(['step']);
        }

        setIsModalOpen(true);
    };


    const { mutate: reorderGoals } = useReorderGoals();

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = goalTree.findIndex((item) => item.id === active.id);
            const newIndex = goalTree.findIndex((item) => item.id === over.id);

            // 1. Calculate new order locally using arrayMove logic
            // Since we're dealing with a tree, this only correctly handles root level reordering for now
            // or we need to find the parent and reorder children.
            // For MVP simplicity: only reorder within the same list/parent.

            // Note: The SortableContext in the JSX is flattening the IDs: items={goalTree.map(g => g.id)}
            // This suggests validation is needed: are we dragging root goals?

            if (oldIndex !== -1 && newIndex !== -1) {
                // Reordering root goals
                const newOrder = arrayMove(goalTree, oldIndex, newIndex);

                // Update orders based on new index
                // We can use the index as the order metric for simplicity
                const updates = newOrder.map((goal, index) => ({
                    id: goal.id,
                    order: index
                }));

                reorderGoals({ items: updates });
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        {selectedGroupId && (
                            <button
                                onClick={() => setSelectedGroupId(null)}
                                className="rounded-full p-1 hover:bg-gray-100"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {selectedGroupId ? selectedGroup?.name : (activeTab === 'groups' ? 'Groups' : 'Your Goals')}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
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
                {/* Tabs */}
                {!selectedGroupId && (
                    <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all ${activeTab === 'personal'
                                ? 'bg-white text-gray-900 shadow'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <Layout size={16} />
                            Personal
                        </button>
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all ${activeTab === 'groups'
                                ? 'bg-white text-gray-900 shadow'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <Users size={16} />
                            Groups
                        </button>
                    </div>
                )}

                {/* Controls (Only show when viewing goals) */}
                {(activeTab === 'personal' || selectedGroupId) && (
                    <div className="mb-4 flex items-center justify-end gap-4">
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
                )}

                {/* Content */}
                {activeTab === 'groups' && !selectedGroupId ? (
                    <GroupsManager onSelectGroup={(id) => setSelectedGroupId(id)} />
                ) : (
                    <>

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
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={goalTree.map(g => g.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-4">
                                        {goalTree.map(goal => (
                                            <SortableGoalCard
                                                key={goal.id}
                                                goal={goal}
                                                onAddSubGoal={handleAddGoal}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </>
                )}
            </main >

            {/* FAB for Mobile */}
            <button
                onClick={() => handleAddGoal()
                }
                className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 md:hidden"
            >
                <Plus size={28} />
            </button >

            {/* Create Modal */}
            <CreateGoalModal
                key={`${isModalOpen ? "open" : "closed"}-${newGoalParentId ?? "root"}-${allowedTypes.join(",")}-${activeTab}-${selectedGroupId ?? ""}`}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                parentId={newGoalParentId}
                parentAncestors={newGoalAncestors}
                allowedTypes={allowedTypes}
                defaultGroupId={activeTab === 'groups' ? selectedGroupId : null}
            />
        </div >
    );
}
