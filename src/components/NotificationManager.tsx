import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Bell, X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

// Check if running in standalone mode (PWA installed)
function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error - iOS specific property
        window.navigator.standalone === true
    );
}

// Check if running on iOS
function isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if notifications are supported
function notificationsSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
}

interface NotificationManagerProps {
    triggerOnFirstGoal?: boolean;
}

export function NotificationManager({ triggerOnFirstGoal = true }: NotificationManagerProps) {
    const { user } = useAuth();
    const [showIOSModal, setShowIOSModal] = useState(false);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
    const [hasAsked, setHasAsked] = useState(false);

    // Check if we should show iOS install modal
    useEffect(() => {
        if (!user) return;

        const dismissed = localStorage.getItem('ios-install-dismissed');
        if (isIOS() && !isStandalone() && !dismissed) {
            // Show after a small delay
            const timer = setTimeout(() => setShowIOSModal(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    // Check if we should prompt for notifications
    useEffect(() => {
        if (!user || hasAsked) return;
        if (!notificationsSupported()) return;
        if (Notification.permission !== 'default') return;

        // If triggerOnFirstGoal is true, we wait for an external trigger
        // Otherwise, we show the prompt after a delay
        if (!triggerOnFirstGoal) {
            const timer = setTimeout(() => setShowPermissionPrompt(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [user, hasAsked, triggerOnFirstGoal]);

    const requestNotificationPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // TODO: Register FCM token with backend
                console.log('Notifications enabled!');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
        setHasAsked(true);
        setShowPermissionPrompt(false);
    };

    const dismissIOSModal = () => {
        localStorage.setItem('ios-install-dismissed', 'true');
        setShowIOSModal(false);
    };

    // iOS Install Modal
    if (showIOSModal && user) {
        return (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
                <div
                    className="fixed inset-0 bg-black/50"
                    onClick={dismissIOSModal}
                />
                <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                    <button
                        onClick={dismissIOSModal}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                            <Smartphone className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">
                            Install Smart Goals
                        </h3>
                        <p className="mb-4 text-sm text-gray-600">
                            Install this app on your home screen for the best experience and to receive notifications.
                        </p>

                        <div className="rounded-lg bg-gray-50 p-4 text-left">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">To install:</span>
                            </p>
                            <ol className="mt-2 list-decimal pl-5 text-sm text-gray-600 space-y-1">
                                <li>Tap the Share button <span className="inline-block -translate-y-0.5">⬆️</span></li>
                                <li>Scroll down and tap "Add to Home Screen"</li>
                                <li>Tap "Add" to confirm</li>
                            </ol>
                        </div>

                        <button
                            onClick={dismissIOSModal}
                            className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Notification Permission Prompt
    if (showPermissionPrompt && user) {
        return (
            <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-slide-up">
                <div className={cn(
                    "flex items-start gap-4 rounded-lg border bg-white p-4 shadow-lg"
                )}>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Stay on Track</h4>
                        <p className="mt-1 text-sm text-gray-600">
                            Get notified when group members complete goals or need verification.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={requestNotificationPermission}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Enable
                            </button>
                            <button
                                onClick={() => {
                                    setHasAsked(true);
                                    setShowPermissionPrompt(false);
                                }}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                Not now
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPermissionPrompt(false)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
