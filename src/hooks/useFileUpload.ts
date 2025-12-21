import { useState, useCallback } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";

interface UploadState {
    progress: number;
    downloadURL: string | null;
    error: string | null;
    isUploading: boolean;
}

// Compress image before upload to save bandwidth
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        img.onload = () => {
            let { width, height } = img;

            // Scale down if larger than maxWidth
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Could not compress image"));
                    }
                },
                "image/jpeg",
                quality
            );
        };

        img.onerror = () => reject(new Error("Could not load image"));
        img.src = URL.createObjectURL(file);
    });
}

export function useFileUpload() {
    const { user } = useAuth();
    const [state, setState] = useState<UploadState>({
        progress: 0,
        downloadURL: null,
        error: null,
        isUploading: false,
    });

    const uploadFile = useCallback(
        async (file: File): Promise<string | null> => {
            if (!user) {
                setState((prev) => ({ ...prev, error: "User not authenticated" }));
                return null;
            }

            setState({
                progress: 0,
                downloadURL: null,
                error: null,
                isUploading: true,
            });

            try {
                // Compress image if it's an image file
                let blob: Blob = file;
                if (file.type.startsWith("image/")) {
                    blob = await compressImage(file);
                }

                // Create unique filename
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
                const path = `proofs/${user.uid}/${timestamp}_${safeName}`;
                const storageRef = ref(storage, path);

                // Upload with progress tracking
                const uploadTask = uploadBytesResumable(storageRef, blob);

                return new Promise((resolve, reject) => {
                    uploadTask.on(
                        "state_changed",
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setState((prev) => ({ ...prev, progress }));
                        },
                        (error) => {
                            setState({
                                progress: 0,
                                downloadURL: null,
                                error: error.message,
                                isUploading: false,
                            });
                            reject(error);
                        },
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            setState({
                                progress: 100,
                                downloadURL,
                                error: null,
                                isUploading: false,
                            });
                            resolve(downloadURL);
                        }
                    );
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Upload failed";
                setState({
                    progress: 0,
                    downloadURL: null,
                    error: message,
                    isUploading: false,
                });
                return null;
            }
        },
        [user]
    );

    const reset = useCallback(() => {
        setState({
            progress: 0,
            downloadURL: null,
            error: null,
            isUploading: false,
        });
    }, []);

    return {
        ...state,
        uploadFile,
        reset,
    };
}
