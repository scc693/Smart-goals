import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { GoalCard } from "@/components/GoalCard";
import type { GoalWithChildren } from "@/lib/tree-utils";

const { toggleStep, deleteGoal, markComplete } = vi.hoisted(() => ({
  toggleStep: vi.fn(),
  deleteGoal: vi.fn(),
  markComplete: vi.fn(),
}));

vi.mock("@/hooks/useMutations", () => ({
  useToggleStep: () => ({ mutate: toggleStep }),
  useDeleteGoal: () => ({ mutate: deleteGoal }),
  useMarkGoalComplete: () => ({ mutate: markComplete }),
}));

const baseGoal = (overrides: Partial<GoalWithChildren>): GoalWithChildren => ({
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
  children: overrides.children ?? [],
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("GoalCard", () => {
  it("toggles a step and allows deletion", () => {
    const stepGoal = baseGoal({
      id: "step-1",
      title: "Write tests",
      type: "step",
      parentId: "goal-1",
      ancestors: ["goal-1"],
    });

    const { container } = render(
      <GoalCard goal={stepGoal} onAddSubGoal={vi.fn()} />,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(toggleStep).toHaveBeenCalledWith({
      stepId: "step-1",
      ancestors: ["goal-1"],
      isCompleted: true,
    });

    const deleteButton = container.querySelector(
      "button[title='Delete']",
    ) as HTMLButtonElement | null;
    expect(deleteButton).not.toBeNull();

    fireEvent.click(deleteButton!);

    expect(deleteGoal).toHaveBeenCalledWith({
      goalId: "step-1",
      ancestors: ["goal-1"],
    });
  });

  it("shows progress, urgency, and marks a goal complete", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));

    const goal = baseGoal({
      id: "goal-2",
      title: "Ship release",
      totalSteps: 2,
      completedSteps: 2,
      deadline: Timestamp.fromDate(new Date("2025-01-02T12:00:00Z")),
    });

    render(<GoalCard goal={goal} onAddSubGoal={vi.fn()} />);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Due Tomorrow")).toBeInTheDocument();

    const markCompleteButton = screen.getByTitle("Mark Complete");
    fireEvent.click(markCompleteButton);

    expect(markComplete).toHaveBeenCalledWith({
      goalId: "goal-2",
      isCompleted: true,
    });
  });
});
