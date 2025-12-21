import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { ActivityFeed } from "@/components/ActivityFeed";
import type { Activity } from "@/types";

const { approveVerification, useActivityFeedMock, useAuthMock } = vi.hoisted(() => ({
  approveVerification: vi.fn(),
  useActivityFeedMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("@/hooks/useVerification", () => ({
  useApproveVerification: () => ({ mutate: approveVerification }),
}));

vi.mock("@/hooks/useActivityFeed", () => ({
  useActivityFeed: (args: unknown) => useActivityFeedMock(args),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: { uid: "user-1" } });
  useActivityFeedMock.mockReturnValue({
    data: { pages: [] },
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    value: MockIntersectionObserver,
    writable: true,
  });
});

describe("ActivityFeed", () => {
  it("renders a placeholder when no group is selected", () => {
    render(<ActivityFeed groupId={null} />);

    expect(screen.getByText("Select a group to see activity")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useActivityFeedMock.mockReturnValue({
      data: { pages: [] },
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<ActivityFeed groupId="group-1" />);

    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("shows an error message when loading fails", () => {
    useActivityFeedMock.mockReturnValue({
      data: { pages: [] },
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
      isLoading: false,
      isError: true,
    });

    render(<ActivityFeed groupId="group-1" />);

    expect(screen.getByText("Failed to load activities")).toBeInTheDocument();
  });

  it("shows an empty state when there is no activity", () => {
    useActivityFeedMock.mockReturnValue({
      data: { pages: [{ activities: [] }] },
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
    });

    render(<ActivityFeed groupId="group-1" />);

    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("renders activities and allows verifying requests", async () => {
    const activities: Activity[] = [
      {
        id: "activity-1",
        type: "verification_request",
        userId: "user-2",
        userName: "Taylor",
        userAvatar: null,
        groupId: "group-1",
        goalId: "goal-9",
        goalTitle: "Run 5k",
        metadata: { xpGained: 20, photoURL: "https://example.com/proof.jpg" },
        timestamp: Timestamp.fromMillis(1_700_000_000_000),
      },
    ];

    useActivityFeedMock.mockReturnValue({
      data: { pages: [{ activities }] },
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
    });

    render(<ActivityFeed groupId="group-1" />);

    expect(screen.getByText("Taylor")).toBeInTheDocument();
    expect(screen.getByText("+20 XP")).toBeInTheDocument();
    expect(screen.getByAltText("Proof")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(approveVerification).toHaveBeenCalledWith(
        {
          verificationId: "goal-9",
          goalId: "goal-9",
          goalTitle: "Run 5k",
          requesterId: "user-2",
          groupId: "group-1",
        },
        expect.any(Object),
      );
    });
  });
});
