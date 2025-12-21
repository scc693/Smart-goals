import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { NotificationManager } from "@/components/NotificationManager";

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, "userAgent", {
    value,
    configurable: true,
  });
};

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: { uid: "user-1" } });
  Object.defineProperty(window, "localStorage", {
    value: createLocalStorageMock(),
    configurable: true,
  });
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
    writable: true,
  });
  Object.defineProperty(window.navigator, "standalone", {
    value: false,
    configurable: true,
  });
  setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)");
  Object.defineProperty(globalThis, "Notification", {
    value: {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    },
    writable: true,
  });
  Object.defineProperty(navigator, "serviceWorker", {
    value: {},
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("NotificationManager", () => {
  it("shows the iOS install modal for iOS users", () => {
    vi.useFakeTimers();

    render(<NotificationManager />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Install Smart Goals")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(localStorage.getItem("ios-install-dismissed")).toBe("true");
  });

  it("prompts for notification permission when configured", async () => {
    vi.useFakeTimers();
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4)");

    render(<NotificationManager triggerOnFirstGoal={false} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("Stay on Track")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enable" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(globalThis.Notification.requestPermission).toHaveBeenCalled();

    expect(screen.queryByText("Stay on Track")).not.toBeInTheDocument();
  });
});
