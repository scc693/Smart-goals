import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { XP_HELPER_BONUS, useApproveVerification, useRequestVerification } from "@/hooks/useVerification";
import { calculateLevel, XP_STEP_COMPLETE } from "@/hooks/useUserStats";

const {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
  increment,
} = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  runTransaction: vi.fn(),
  increment: vi.fn((value: number) => ({ increment: value })),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { uid: "verifier-1", displayName: "Verifier", email: "verifier@example.com", photoURL: "avatar" },
  }),
}));

vi.mock("@/lib/firebase", () => ({
  db: { name: "db" },
}));

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return {
    ...actual,
    collection: (...args: unknown[]) => collection(...args),
    doc: (...args: unknown[]) => doc(...args),
    serverTimestamp: () => serverTimestamp(),
    runTransaction: (...args: unknown[]) => runTransaction(...args),
    increment: (...args: unknown[]) => increment(args[0] as number),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createDocMock = () => {
  const counters = new Map<string, number>();
  return (first: unknown, collectionName?: string, id?: string) => {
    if (collectionName && id) {
      return { path: `${collectionName}/${id}` };
    }
    const collectionRef = first as { name?: string };
    const name = collectionRef?.name ?? "unknown";
    const count = (counters.get(name) ?? 0) + 1;
    counters.set(name, count);
    return { id: `${name}-${count}`, path: `${name}/${name}-${count}` };
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useVerification", () => {
  it("creates a verification request and related activity", async () => {
    collection.mockImplementation((_db: unknown, name: string) => ({ name }));
    doc.mockImplementation(createDocMock());

    const transaction = {
      set: vi.fn(),
      update: vi.fn(),
    };
    runTransaction.mockImplementation(async (_db: unknown, callback: (tx: typeof transaction) => Promise<void>) => {
      await callback(transaction);
    });

    const { result } = renderHook(() => useRequestVerification(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({
        goalId: "goal-1",
        goalTitle: "Ship MVP",
        groupId: "group-1",
        proofUrl: "https://example.com/proof.jpg",
      });
    });

    await waitFor(() => {
      expect(transaction.set).toHaveBeenCalledWith(
        { path: "verifications/verifications-1" },
        expect.objectContaining({
          id: "verifications-1",
          goalId: "goal-1",
          requesterId: "verifier-1",
          status: "pending",
          xpReward: XP_STEP_COMPLETE,
          proofUrl: "https://example.com/proof.jpg",
          createdAt: "server-time",
        })
      );
      expect(transaction.update).toHaveBeenCalledWith(
        { path: "goals/goal-1" },
        { status: "pending_verification", verificationId: "verifications-1" },
      );
      expect(transaction.set).toHaveBeenCalledWith(
        { path: "activities/activities-1" },
        expect.objectContaining({
          id: "activities-1",
          type: "verification_request",
          goalId: "goal-1",
          goalTitle: "Ship MVP",
          groupId: "group-1",
          metadata: { photoURL: "https://example.com/proof.jpg" },
          timestamp: "server-time",
        })
      );
    });
  });

  it("approves verification and awards XP", async () => {
    collection.mockImplementation((_db: unknown, name: string) => ({ name }));
    doc.mockImplementation(createDocMock());

    const verificationData = {
      status: "pending",
      xpReward: 10,
    };
    const goalData = {
      ancestors: ["goal-ancestor"],
      groupId: "group-1",
    };
    const groupData = { members: ["verifier-1"] };
    const requesterStats = { xp: 100 };
    const verifierStats = { xp: 40 };

    const transaction = {
      get: vi.fn(async (ref: { path: string }) => {
        const dataByPath: Record<string, unknown> = {
          "verifications/verification-1": verificationData,
          "goals/goal-1": goalData,
          "groups/group-1": groupData,
          "userStats/requester-1": requesterStats,
          "userStats/verifier-1": verifierStats,
        };
        return {
          exists: () => ref.path in dataByPath,
          data: () => dataByPath[ref.path],
        };
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    runTransaction.mockImplementation(async (_db: unknown, callback: (tx: typeof transaction) => Promise<void>) => {
      await callback(transaction);
    });

    const { result } = renderHook(() => useApproveVerification(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({
        verificationId: "verification-1",
        goalId: "goal-1",
        goalTitle: "Ship MVP",
        requesterId: "requester-1",
        groupId: "group-1",
      });
    });

    const requesterNewXP = requesterStats.xp + verificationData.xpReward;
    const verifierNewXP = verifierStats.xp + XP_HELPER_BONUS;

    await waitFor(() => {
      expect(transaction.update).toHaveBeenCalledWith(
        { path: "verifications/verification-1" },
        expect.objectContaining({
          status: "approved",
          approverId: "verifier-1",
          approverName: "Verifier",
          resolvedAt: "server-time",
        })
      );
      expect(transaction.update).toHaveBeenCalledWith(
        { path: "goals/goal-1" },
        { status: "completed", verificationId: null },
      );
      expect(transaction.update).toHaveBeenCalledWith(
        { path: "goals/goal-ancestor" },
        { completedSteps: { increment: 1 } },
      );
      expect(transaction.update).toHaveBeenCalledWith(
        { path: "userStats/requester-1" },
        { xp: { increment: verificationData.xpReward }, level: calculateLevel(requesterNewXP) },
      );
      expect(transaction.update).toHaveBeenCalledWith(
        { path: "userStats/verifier-1" },
        { xp: { increment: XP_HELPER_BONUS }, level: calculateLevel(verifierNewXP) },
      );
      expect(transaction.set).toHaveBeenCalledWith(
        { path: "activities/activities-1" },
        expect.objectContaining({
          type: "verification_approved",
          goalId: "goal-1",
          goalTitle: "Ship MVP",
          groupId: "group-1",
          metadata: { xpGained: verificationData.xpReward },
          timestamp: "server-time",
        })
      );
    });
  });

  it("blocks verifying your own goal", async () => {
    const { result } = renderHook(() => useApproveVerification(), { wrapper: createWrapper() });

    await expect(result.current.mutateAsync({
      verificationId: "verification-1",
      goalId: "goal-1",
      goalTitle: "Ship MVP",
      requesterId: "verifier-1",
      groupId: "group-1",
    })).rejects.toThrow("Cannot verify your own goal");
  });
});
