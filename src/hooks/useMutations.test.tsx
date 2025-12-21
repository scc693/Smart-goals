import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReorderGoals, useToggleStep } from "@/hooks/useMutations";
import type { Goal } from "@/types";

const { runTransaction, doc } = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  doc: vi.fn(),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: { uid: "user-1" } }),
}));

vi.mock("@/lib/firebase", () => ({
  db: { name: "db" },
}));

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return {
    ...actual,
    runTransaction: (...args: unknown[]) => runTransaction(...args),
    doc: (...args: unknown[]) => doc(...args),
  };
});

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useMutations optimistic updates", () => {
  beforeEach(() => {
    doc.mockImplementation((_db: unknown, collectionName: string, id: string) => ({
      path: `${collectionName}/${id}`,
    }));
  });
  it("optimistically toggles a step and updates ancestor progress", async () => {
    runTransaction.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const goals: Goal[] = [
      {
        id: "step-1",
        userId: "user-1",
        title: "Step",
        type: "step",
        status: "active",
        parentId: "goal-1",
        ancestors: ["goal-1"],
        groupId: null,
        sharedWith: [],
        totalSteps: 0,
        completedSteps: 0,
        deadline: null,
        createdAt: null,
      },
      {
        id: "goal-1",
        userId: "user-1",
        title: "Goal",
        type: "goal",
        status: "active",
        parentId: null,
        ancestors: [],
        groupId: null,
        sharedWith: [],
        totalSteps: 1,
        completedSteps: 0,
        deadline: null,
        createdAt: null,
      },
    ];

    queryClient.setQueryData(["goals"], goals);

    const { result } = renderHook(() => useToggleStep(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ stepId: "step-1", ancestors: ["goal-1"], isCompleted: true });
    });

    await waitFor(() => {
      const updated = queryClient.getQueryData<Goal[]>(["goals"]);
      expect(updated?.find(goal => goal.id === "step-1")?.status).toBe("completed");
      expect(updated?.find(goal => goal.id === "goal-1")?.completedSteps).toBe(1);
    });
  });

  it("skips optimistic update when status already matches", async () => {
    runTransaction.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const goals: Goal[] = [
      {
        id: "step-1",
        userId: "user-1",
        title: "Step",
        type: "step",
        status: "completed",
        parentId: "goal-1",
        ancestors: ["goal-1"],
        groupId: null,
        sharedWith: [],
        totalSteps: 0,
        completedSteps: 0,
        deadline: null,
        createdAt: null,
      },
      {
        id: "goal-1",
        userId: "user-1",
        title: "Goal",
        type: "goal",
        status: "active",
        parentId: null,
        ancestors: [],
        groupId: null,
        sharedWith: [],
        totalSteps: 1,
        completedSteps: 2,
        deadline: null,
        createdAt: null,
      },
    ];

    queryClient.setQueryData(["goals"], goals);

    const { result } = renderHook(() => useToggleStep(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ stepId: "step-1", ancestors: ["goal-1"], isCompleted: true });
    });

    await waitFor(() => {
      const updated = queryClient.getQueryData<Goal[]>(["goals"]);
      expect(updated?.find(goal => goal.id === "goal-1")?.completedSteps).toBe(2);
    });
  });

  it("optimistically reorders goals", async () => {
    runTransaction.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const goals: Goal[] = [
      {
        id: "goal-1",
        userId: "user-1",
        title: "Goal",
        type: "goal",
        status: "active",
        parentId: null,
        ancestors: [],
        groupId: null,
        sharedWith: [],
        totalSteps: 0,
        completedSteps: 0,
        deadline: null,
        createdAt: null,
        order: 2,
      },
      {
        id: "goal-2",
        userId: "user-1",
        title: "Goal 2",
        type: "goal",
        status: "active",
        parentId: null,
        ancestors: [],
        groupId: null,
        sharedWith: [],
        totalSteps: 0,
        completedSteps: 0,
        deadline: null,
        createdAt: null,
        order: 1,
      },
    ];

    queryClient.setQueryData(["goals"], goals);

    const { result } = renderHook(() => useReorderGoals(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        items: [
          { id: "goal-1", order: 1 },
          { id: "goal-2", order: 2 },
        ],
      });
    });

    await waitFor(() => {
      const updated = queryClient.getQueryData<Goal[]>(["goals"]);
      expect(updated?.find(goal => goal.id === "goal-1")?.order).toBe(1);
      expect(updated?.find(goal => goal.id === "goal-2")?.order).toBe(2);
    });
  });
});
