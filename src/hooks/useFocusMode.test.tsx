import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFocusMode } from "@/hooks/useFocusMode";

const { setDoc, doc, timestampNow } = vi.hoisted(() => ({
  setDoc: vi.fn(),
  doc: vi.fn(),
  timestampNow: vi.fn(() => ({ seconds: 123 })),
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
    doc: (...args: unknown[]) => doc(...args),
    setDoc: (...args: unknown[]) => setDoc(...args),
    Timestamp: {
      ...actual.Timestamp,
      now: () => timestampNow(),
    },
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

afterEach(() => {
  vi.clearAllMocks();
});

describe("useFocusMode", () => {
  it("writes focus status when starting focus", async () => {
    doc.mockReturnValue({ path: "userStats/user-1" });

    const { result } = renderHook(() => useFocusMode(), { wrapper: createWrapper() });

    act(() => {
      result.current.startFocus({ goalId: "goal-1", goalTitle: "Deep work" });
    });

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        { path: "userStats/user-1" },
        { focusStatus: { goalId: "goal-1", goalTitle: "Deep work", startedAt: { seconds: 123 } } },
        { merge: true },
      );
    });
  });

  it("clears focus status when stopping focus", async () => {
    doc.mockReturnValue({ path: "userStats/user-1" });

    const { result } = renderHook(() => useFocusMode(), { wrapper: createWrapper() });

    act(() => {
      result.current.stopFocus();
    });

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        { path: "userStats/user-1" },
        { focusStatus: null },
        { merge: true },
      );
    });
  });
});
