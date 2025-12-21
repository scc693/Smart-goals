import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { buildGoalTree } from "@/lib/tree-utils";
import type { Goal } from "@/types";

const baseGoal = (overrides: Partial<Goal>): Goal => ({
  id: overrides.id ?? "goal-1",
  userId: overrides.userId ?? "user-1",
  title: overrides.title ?? "Goal",
  type: overrides.type ?? "goal",
  status: overrides.status ?? "active",
  parentId: overrides.parentId ?? null,
  ancestors: overrides.ancestors ?? [],
  groupId: overrides.groupId ?? null,
  sharedWith: overrides.sharedWith ?? [],
  totalSteps: overrides.totalSteps ?? 0,
  completedSteps: overrides.completedSteps ?? 0,
  deadline: overrides.deadline ?? null,
  createdAt: overrides.createdAt ?? Timestamp.fromMillis(0),
  order: overrides.order,
});

describe("buildGoalTree", () => {
  it("nests children and sorts roots/children by order then createdAt", () => {
    const rootB = baseGoal({
      id: "b",
      order: 1,
      createdAt: Timestamp.fromMillis(2000),
    });
    const rootA = baseGoal({
      id: "a",
      order: 2,
      createdAt: Timestamp.fromMillis(1000),
    });
    const child2 = baseGoal({
      id: "c2",
      parentId: "b",
      ancestors: ["b"],
      createdAt: Timestamp.fromMillis(1000),
    });
    const child1 = baseGoal({
      id: "c1",
      parentId: "b",
      ancestors: ["b"],
      createdAt: Timestamp.fromMillis(3000),
    });

    const tree = buildGoalTree([child1, rootA, child2, rootB]);

    expect(tree.map(node => node.id)).toEqual(["b", "a"]);
    expect(tree[0].children.map(node => node.id)).toEqual(["c2", "c1"]);
  });

  it("treats missing parents as roots", () => {
    const orphan = baseGoal({
      id: "orphan",
      parentId: "missing",
      ancestors: ["missing"],
    });

    const tree = buildGoalTree([orphan]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("orphan");
  });
});
