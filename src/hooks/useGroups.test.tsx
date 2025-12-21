import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useJoinGroup,
} from "@/hooks/useGroups";

const {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  serverTimestamp,
} = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  arrayUnion: vi.fn((value: string) => ({ arrayUnion: value })),
  serverTimestamp: vi.fn(() => "server-time"),
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
    doc: (...args: unknown[]) => doc(...args),
    setDoc: (...args: unknown[]) => setDoc(...args),
    getDoc: (...args: unknown[]) => getDoc(...args),
    updateDoc: (...args: unknown[]) => updateDoc(...args),
    deleteDoc: (...args: unknown[]) => deleteDoc(...args),
    getDocs: (...args: unknown[]) => getDocs(...args),
    query: (...args: unknown[]) => query(...args),
    where: (...args: unknown[]) => where(...args),
    arrayUnion: (...args: unknown[]) => arrayUnion(...args),
    serverTimestamp: () => serverTimestamp(),
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

describe("useGroups", () => {
  it("creates a group and writes it to Firestore", async () => {
    collection.mockReturnValue({ path: "groups" });
    doc.mockImplementation((_ref: unknown, _collection?: unknown, id?: string) => ({
      id: id ?? "generated-id",
      path: id ? `groups/${id}` : "groups/generated-id",
    }));

    const { result } = renderHook(() => useCreateGroup(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate("Study Squad");
    });

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        { id: "generated-id", path: "groups/generated-id" },
        expect.objectContaining({
          id: "generated-id",
          name: "Study Squad",
          members: ["user-1"],
          createdBy: "user-1",
          createdAt: "server-time",
        })
      );
    });
  });

  it("joins a group by updating members", async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    doc.mockReturnValue({ path: "groups/group-1" });

    const { result } = renderHook(() => useJoinGroup(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate("group-1");
    });

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        { path: "groups/group-1" },
        { members: { arrayUnion: "user-1" } }
      );
    });
  });

  it("deletes a group when the user is the owner", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ createdBy: "user-1" }),
    });
    doc.mockReturnValue({ path: "groups/group-1" });

    const { result } = renderHook(() => useDeleteGroup(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate("group-1");
    });

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledWith({ path: "groups/group-1" });
    });
  });

  it("rejects deletion when user is not the owner", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ createdBy: "user-2" }),
    });
    doc.mockReturnValue({ path: "groups/group-1" });

    const { result } = renderHook(() => useDeleteGroup(), { wrapper: createWrapper() });

    await expect(result.current.mutateAsync("group-1")).rejects.toThrow(
      "Only the group creator can delete this group",
    );

    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it("loads groups for the current user", async () => {
    const docs = [
      {
        id: "group-1",
        data: () => ({
          name: "Team",
          members: ["user-1"],
          createdBy: "user-1",
          createdAt: "server-time",
        }),
      },
    ];
    getDocs.mockResolvedValue({ docs });
    query.mockReturnValue({});
    where.mockReturnValue({});
    collection.mockReturnValue({ path: "groups" });

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toEqual([
        {
          id: "group-1",
          name: "Team",
          members: ["user-1"],
          createdBy: "user-1",
          createdAt: "server-time",
        },
      ]);
    });
  });
});
