import { useState } from "react";
import type { GoalWithChildren } from "@/lib/tree-utils";
import { useToggleStep, useDeleteGoal, useMarkGoalComplete } from "@/hooks/useMutations";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Check, Trash2, Clock, CheckCircle2 } from "lucide-react";

// Calculate urgency color based on deadline proximity
function getUrgencyInfo(deadline: Date | null, status: string): { color: string; label: string } | null {
    if (!deadline || status === 'completed') return null;

    const now = new Date();
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { color: 'bg-red-500', label: 'Overdue' };
    if (daysUntil === 0) return { color: 'bg-red-500', label: 'Due Today' };
    if (daysUntil <= 1) return { color: 'bg-orange-500', label: 'Due Tomorrow' };
    if (daysUntil <= 3) return { color: 'bg-yellow-500', label: `${daysUntil}d left` };
    if (daysUntil <= 7) return { color: 'bg-blue-400', label: `${daysUntil}d left` };
    return { color: 'bg-green-400', label: `${daysUntil}d left` };
}

interface GoalCardProps {
    goal: GoalWithChildren;
    onAddSubGoal: (parentId: string, ancestors: string[], level: number) => void;
    level?: number;
}

export function GoalCard({ goal, onAddSubGoal, level = 0 }: GoalCardProps) {
    const [expanded, setExpanded] = useState(true);
    const { mutate: toggleStep } = useToggleStep();
    const { mutate: deleteGoal } = useDeleteGoal();
    const { mutate: markComplete } = useMarkGoalComplete();

    const isStep = goal.type === 'step';
    const progress = goal.totalSteps > 0 ? (goal.completedSteps / goal.totalSteps) * 100 : 0;

    const progressColor = progress === 100 ? 'text-green-500' : progress > 50 ? 'text-yellow-500' : 'text-blue-500';

    // Calculate urgency based on deadline
    const deadlineDate = goal.deadline?.toDate?.() || null;
    const urgency = getUrgencyInfo(deadlineDate, goal.status);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("Toggling step:", goal.id, "Current status:", goal.status, "Ancestors:", goal.ancestors);
        toggleStep({
            stepId: goal.id,
            ancestors: goal.ancestors,
            isCompleted: goal.status !== 'completed'
        });
    };

    const handleDelete = () => {
        if (confirm("Are you sure? This will delete this goal and all its children.")) {
            deleteGoal({ goalId: goal.id, ancestors: goal.ancestors });
        }
    };

    // Prevent propagation to parent if clicking trash inside a clickable area
    const onDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleDelete();
    }

    return (
        <div className={cn("mb-2 rounded-lg border bg-white p-3 shadow-sm transition-all relative group", level > 0 && "ml-4 border-l-4 border-l-gray-200")}>
            <div className="flex items-center gap-3">
                {/* Expand/Collapse for Goals */}
                {!isStep && goal.children.length > 0 && (
                    <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
                        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                )}
                {!isStep && goal.children.length === 0 && <div className="w-5" />}

                {/* Checkbox for Steps */}
                {isStep && (
                    <button
                        onClick={handleToggle}
                        className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                            goal.status === 'completed' ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-blue-400"
                        )}
                    >
                        {goal.status === 'completed' && <Check size={14} className="text-white" />}
                    </button>
                )}

                {/* Content */}
                <div className="flex-1">
                    <h3 className={cn("font-medium text-gray-900", goal.status === 'completed' && "text-gray-400 line-through")}>
                        {goal.title}
                    </h3>
                    {!isStep && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <span className={cn("font-bold", progressColor)}>{Math.round(progress)}%</span>
                            <span>({goal.completedSteps}/{goal.totalSteps} steps)</span>
                        </div>
                    )}
                </div>

                {/* Urgency Badge */}
                {urgency && (
                    <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs", urgency.color)}>
                        <Clock size={12} />
                        <span>{urgency.label}</span>
                    </div>
                )}

                {/* Actions Zone */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {/* Mark Complete button - shows when all steps are done */}
                    {!isStep && goal.totalSteps > 0 && progress >= 100 && goal.status !== 'completed' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                markComplete({ goalId: goal.id, isCompleted: true });
                            }}
                            className="rounded-full p-1 text-green-500 hover:bg-green-50 hover:text-green-600"
                            title="Mark Complete"
                        >
                            <CheckCircle2 size={18} />
                        </button>
                    )}
                    {!isStep && (
                        <button
                            onClick={() => onAddSubGoal(goal.id, [...goal.ancestors.filter(id => id != null && id !== ''), goal.id], level)}
                            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                            title="Add Sub-goal"
                        >
                            <Plus size={18} />
                        </button>
                    )}

                    <button
                        onClick={onDeleteClick}
                        className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Progress Ring for Goals (Mini) */}
                {!isStep && (
                    <div className="relative h-8 w-8 ml-2">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-gray-200"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className={progressColor.replace('text-', 'stroke-')}
                                strokeDasharray={`${progress}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                        </svg>
                    </div>
                )}
            </div>

            {/* Children */}
            {expanded && goal.children.length > 0 && (
                <div className="mt-3 pl-2">
                    {goal.children.map(child => (
                        <GoalCard
                            key={child.id}
                            goal={child}
                            onAddSubGoal={onAddSubGoal}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
