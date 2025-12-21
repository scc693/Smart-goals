import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Default confirm to avoid jsdom not implemented errors in tests.
Object.defineProperty(globalThis, "confirm", {
  value: vi.fn(() => true),
  writable: true,
});
