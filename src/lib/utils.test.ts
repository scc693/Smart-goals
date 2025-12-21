import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conditional classes and resolves conflicts", () => {
    const result = cn(
      "p-2",
      "p-4",
      { "text-red-500": true, "text-blue-500": false },
      "rounded",
      "rounded-md",
    );

    expect(result).toContain("p-4");
    expect(result).not.toContain("p-2");
    expect(result).toContain("text-red-500");
    expect(result).toContain("rounded-md");
  });
});
