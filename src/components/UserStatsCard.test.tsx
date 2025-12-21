import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserStatsCard } from "@/components/UserStatsCard";

const { useUserStatsMock } = vi.hoisted(() => ({
  useUserStatsMock: vi.fn(),
}));

vi.mock("@/hooks/useUserStats", () => ({
  useUserStats: () => useUserStatsMock(),
  xpForLevel: (level: number) => (level - 1) ** 2 * 100,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("UserStatsCard", () => {
  it("renders a loading skeleton when stats are not ready", () => {
    useUserStatsMock.mockReturnValue({ data: null, isLoading: true });

    const { container } = render(<UserStatsCard />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders user stats with XP progress and streak", () => {
    useUserStatsMock.mockReturnValue({
      isLoading: false,
      data: {
        id: "user-1",
        xp: 250,
        level: 2,
        streak: 3,
        lastActiveDate: "2025-12-20",
        createdAt: null,
      },
    });

    render(<UserStatsCard />);

    expect(screen.getByText("250 XP")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("Level 2")).toBeInTheDocument();
    expect(screen.getByText("150/300 XP")).toBeInTheDocument();
  });
});
