import { useState } from "react";
import type { GoalWithChildren } from "@/lib/tree-utils";
import { useToggleStep } from "@/hooks/useMutations";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Check } from "lucide-react";

interface GoalCardProps {
    goal: GoalWithChildren;
    onAddSubGoal: (parentId: string, ancestors: string[]) => void;
    level?: number;
}

export function GoalCard({ goal, onAddSubGoal, level = 0 }: GoalCardProps) {
    const [expanded, setExpanded] = useState(true);
    const { mutate: toggleStep } = useToggleStep();

    const isStep = goal.type === 'step';
    const progress = goal.totalSteps > 0 ? (goal.completedSteps / goal.totalSteps) * 100 : 0;

    // Safe Urgency Colors based on deadline could go here
    // For now, just progress colors
    const progressColor = progress === 100 ? 'text-green-500' : progress > 50 ? 'text-yellow-500' : 'text-blue-500';

    const handleToggle = () => {
        if (goal.parentId) {
            toggleStep({
                stepId: goal.id,
                parentId: goal.parentId,
                isCompleted: goal.status !== 'completed'
            });
        }
    };

    return (
        <div className={cn("mb-2 rounded-lg border bg-white p-3 shadow-sm transition-all", level > 0 && "ml-4 border-l-4 border-l-gray-200")}>
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

                {/* Actions */}
                {!isStep && (
                    <button
                        onClick={() => onAddSubGoal(goal.id, [...goal.ancestors, goal.id])}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title="Add Sub-goal"
                    >
                        <Plus size={18} />
                    </button>
                )}

                {/* Progress Ring for Goals (Mini) */}
                {!isStep && (
                    <div className="relative h-8 w-8">
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
