import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { CreateGoalModal } from "@/components/CreateGoalModal";
import type { Group } from "@/types";

const { createGoal } = vi.hoisted(() => ({
  createGoal: vi.fn(),
}));

const groupsData: Group[] = [
  {
    id: "group-1",
    name: "Team",
    members: ["user-1"],
    createdBy: "user-1",
    createdAt: Timestamp.fromMillis(0),
  },
];

vi.mock("@/hooks/useMutations", () => ({
  useCreateGoal: () => ({ mutate: createGoal, isPending: false }),
}));

vi.mock("@/hooks/useGroups", () => ({
  useGroups: () => ({ data: groupsData }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("CreateGoalModal", () => {
  it("submits a new goal with trimmed title, type, group, and deadline", () => {
    const onClose = vi.fn();

    const { container } = render(
      <CreateGoalModal
        parentId={null}
        parentAncestors={[]}
        isOpen={true}
        onClose={onClose}
        allowedTypes={["goal", "step"]}
      />,
    );

    const titleInput = screen.getByPlaceholderText("e.g., Learn Spanish");
    fireEvent.change(titleInput, { target: { value: "  Plan trip  " } });

    fireEvent.click(screen.getByLabelText("Step"));

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "group-1" },
    });

    const deadlineInput = container.querySelector(
      "input[type='date']",
    ) as HTMLInputElement | null;
    expect(deadlineInput).not.toBeNull();
    fireEvent.change(deadlineInput!, { target: { value: "2025-01-15" } });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createGoal).toHaveBeenCalledTimes(1);
    const [payload, options] = createGoal.mock.calls[0];

    expect(payload).toMatchObject({
      title: "Plan trip",
      type: "step",
      status: "active",
      parentId: null,
      parentAncestors: [],
      groupId: "group-1",
    });

    expect(payload.deadline).not.toBeNull();
    expect(payload.deadline).toBeInstanceOf(Timestamp);
    expect(payload.deadline.toDate().getFullYear()).toBe(2025);

    options?.onSuccess?.();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not submit when title is empty", () => {
    render(
      <CreateGoalModal
        parentId={null}
        parentAncestors={[]}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createGoal).not.toHaveBeenCalled();
  });
});
