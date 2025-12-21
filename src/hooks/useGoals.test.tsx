import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { useGoals } from "@/hooks/useGoals";

const { collection, query, where, getDocs } = vi.hoisted(() => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
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
    collection: (...args: unknown[]) => collection(...args),
    query: (...args: unknown[]) => query(...args),
    where: (...args: unknown[]) => where(...args),
    getDocs: (...args: unknown[]) => getDocs(...args),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useGoals", () => {
  it("dedupes goals and sorts by createdAt desc", async () => {
    collection.mockReturnValue({ path: "goals" });
    query.mockReturnValue({});
    where.mockReturnValue({});

    const ownedDocs = [
      {
        id: "goal-1",
        data: () => ({
          title: "Owned",
          createdAt: Timestamp.fromMillis(2000),
        }),
      },
    ];
    const sharedDocs = [
      {
        id: "goal-2",
        data: () => ({
          title: "Shared",
          createdAt: Timestamp.fromMillis(3000),
        }),
      },
      {
        id: "goal-1",
        data: () => ({
          title: "Duplicate",
          createdAt: Timestamp.fromMillis(1000),
        }),
      },
    ];

    getDocs
      .mockResolvedValueOnce({ docs: ownedDocs })
      .mockResolvedValueOnce({ docs: sharedDocs });

    const { result } = renderHook(() => useGoals(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.map(goal => goal.id)).toEqual(["goal-2", "goal-1"]);
    });
  });

  it("chunks group queries for large group id lists", async () => {
    collection.mockReturnValue({ path: "goals" });
    query.mockReturnValue({});
    where.mockReturnValue({});

    const groupIds = Array.from({ length: 11 }, (_, index) => `group-${index}`);

    getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    renderHook(() => useGoals({ groupIds }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledTimes(4);
    });
  });
});
