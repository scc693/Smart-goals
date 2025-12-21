import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VerificationModal } from "@/components/VerificationModal";

const { useFileUploadMock, requestVerification } = vi.hoisted(() => ({
  useFileUploadMock: vi.fn(),
  requestVerification: vi.fn(),
}));

vi.mock("@/hooks/useFileUpload", () => ({
  useFileUpload: () => useFileUploadMock(),
}));

vi.mock("@/hooks/useVerification", () => ({
  useRequestVerification: () => ({ mutate: requestVerification, isPending: false }),
}));

beforeEach(() => {
  useFileUploadMock.mockReturnValue({
    uploadFile: vi.fn().mockResolvedValue("https://example.com/proof.jpg"),
    isUploading: false,
    progress: 0,
    error: null,
  });
  if (!globalThis.URL) {
    Object.defineProperty(globalThis, "URL", {
      value: {},
      writable: true,
    });
  }
  Object.defineProperty(globalThis.URL, "createObjectURL", {
    value: vi.fn(() => "blob:preview"),
    writable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("VerificationModal", () => {
  it("does not render when closed", () => {
    render(
      <VerificationModal
        isOpen={false}
        onClose={vi.fn()}
        goalId="goal-1"
        goalTitle="Finish reading"
        groupId="group-1"
      />
    );

    expect(screen.queryByText("Upload Proof")).not.toBeInTheDocument();
  });

  it("submits text proof and closes on success", async () => {
    const onClose = vi.fn();
    requestVerification.mockImplementation((_payload: unknown, options: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });

    render(
      <VerificationModal
        isOpen={true}
        onClose={onClose}
        goalId="goal-1"
        goalTitle="Finish reading"
        groupId="group-1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Note" }));

    const submitButton = screen.getByRole("button", { name: "Request Verification" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Describe what you accomplished..."), {
      target: { value: "  Done and shared notes " },
    });

    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(requestVerification).toHaveBeenCalledWith(
        {
          goalId: "goal-1",
          goalTitle: "Finish reading",
          groupId: "group-1",
          proofText: "Done and shared notes",
        },
        expect.any(Object),
      );
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("uploads a photo and submits proof", async () => {
    const onClose = vi.fn();
    const uploadFile = vi.fn().mockResolvedValue("https://example.com/proof.jpg");
    useFileUploadMock.mockReturnValue({
      uploadFile,
      isUploading: false,
      progress: 0,
      error: null,
    });

    render(
      <VerificationModal
        isOpen={true}
        onClose={onClose}
        goalId="goal-5"
        goalTitle="Run 5k"
        groupId="group-1"
      />
    );

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const file = new File(["photo"], "proof.png", { type: "image/png" });
    fireEvent.change(fileInput!, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Request Verification" }));

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledWith(file);
      expect(requestVerification).toHaveBeenCalledWith(
        {
          goalId: "goal-5",
          goalTitle: "Run 5k",
          groupId: "group-1",
          proofUrl: "https://example.com/proof.jpg",
        },
        expect.any(Object),
      );
    });
  });
});
