import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GoalWithChildren } from "@/lib/tree-utils";
import { GoalCard } from "./GoalCard";

interface SortableGoalCardProps {
    goal: GoalWithChildren;
    onAddSubGoal: (parentId: string, ancestors: string[], level: number) => void;
    level?: number;
}

export function SortableGoalCard({ goal, onAddSubGoal, level = 0 }: SortableGoalCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: goal.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "grab",
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <GoalCard
                goal={goal}
                onAddSubGoal={onAddSubGoal}
                level={level}
            />
        </div>
    );
}
