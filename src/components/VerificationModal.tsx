import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2, Camera, Image } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useRequestVerification } from "@/hooks/useVerification";
import { cn } from "@/lib/utils";

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    goalId: string;
    goalTitle: string;
    groupId: string;
}

export function VerificationModal({
    isOpen,
    onClose,
    goalId,
    goalTitle,
    groupId,
}: VerificationModalProps) {
    const [mode, setMode] = useState<'photo' | 'text'>('photo');
    const [proofText, setProofText] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadFile, isUploading, progress, error: uploadError } = useFileUpload();
    const { mutate: requestVerification, isPending } = useRequestVerification();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (mode === 'photo') {
            if (!selectedFile) return;

            const url = await uploadFile(selectedFile);
            if (url) {
                requestVerification(
                    { goalId, goalTitle, groupId, proofUrl: url },
                    { onSuccess: () => onClose() }
                );
            }
        } else {
            if (!proofText.trim()) return;
            requestVerification(
                { goalId, goalTitle, groupId, proofText: proofText.trim() },
                { onSuccess: () => onClose() }
            );
        }
    };

    const isSubmitting = isUploading || isPending;
    const canSubmit = mode === 'photo' ? !!selectedFile : !!proofText.trim();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b p-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Upload Proof
                        </h2>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                            {goalTitle}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex border-b">
                    <button
                        onClick={() => setMode('photo')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                            mode === 'photo'
                                ? "border-b-2 border-blue-500 text-blue-600"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Camera size={18} />
                        Photo
                    </button>
                    <button
                        onClick={() => setMode('text')}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                            mode === 'text'
                                ? "border-b-2 border-blue-500 text-blue-600"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <FileText size={18} />
                        Note
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {mode === 'photo' ? (
                        <div className="space-y-4">
                            {previewUrl ? (
                                <div className="relative">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="h-48 w-full rounded-lg object-cover"
                                    />
                                    <button
                                        onClick={() => {
                                            setPreviewUrl(null);
                                            setSelectedFile(null);
                                        }}
                                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                >
                                    <Image className="h-10 w-10 text-gray-400" />
                                    <span className="mt-2 text-sm text-gray-600">
                                        Click to upload a photo
                                    </span>
                                    <span className="mt-1 text-xs text-gray-400">
                                        Will be compressed automatically
                                    </span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <textarea
                            value={proofText}
                            onChange={(e) => setProofText(e.target.value)}
                            placeholder="Describe what you accomplished..."
                            className="h-48 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    )}

                    {/* Upload Progress */}
                    {isUploading && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Uploading...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {uploadError && (
                        <p className="mt-2 text-sm text-red-500">{uploadError}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t p-4">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                Request Verification
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
