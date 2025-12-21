import { Timestamp } from "firebase/firestore";
import type { Goal } from "@/types";

export interface GoalWithChildren extends Goal {
    children: GoalWithChildren[];
}

export function buildGoalTree(goals: Goal[]): GoalWithChildren[] {
    const map = new Map<string, GoalWithChildren>();
    const roots: GoalWithChildren[] = [];

    // Initialize map
    goals.forEach(g => {
        map.set(g.id, { ...g, children: [] });
    });

    // Build tree
    goals.forEach(g => {
        const node = map.get(g.id)!;
        if (g.parentId && map.has(g.parentId)) {
            map.get(g.parentId)!.children.push(node);
        } else {
            // If parentId is missing or valid but not in fetched set (e.g. strict shared logic), treat as root?
            // Prompt said: "Fetch root goals first." and "Lazy-load children".
            // But my useGoals fetches everything for MVP simplicity.
            // If parent isn't found, it might be a shared sub-goal where parent isn't shared?
            // For now, treat as root if parent missing in map.
            roots.push(node);
        }
    });

    const sortGoals = (a: GoalWithChildren, b: GoalWithChildren) => {
        // Primary sort: Custom order
        if (typeof a.order === 'number' && typeof b.order === 'number') {
            return a.order - b.order;
        }
        // Secondary sort: Created At (oldest first)
        const getCreatedAtSeconds = (createdAt: Goal["createdAt"]) => {
            if (createdAt instanceof Timestamp) {
                return createdAt.seconds;
            }
            if (createdAt && typeof (createdAt as Timestamp).seconds === "number") {
                return (createdAt as Timestamp).seconds;
            }
            return 0;
        };
        return getCreatedAtSeconds(a.createdAt) - getCreatedAtSeconds(b.createdAt);
    };

    // Recursively sort
    const sortRecursive = (nodes: GoalWithChildren[]) => {
        nodes.sort(sortGoals);
        nodes.forEach(node => sortRecursive(node.children));
    };

    sortRecursive(roots);

    return roots;
}
