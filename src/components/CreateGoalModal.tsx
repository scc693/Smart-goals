import React, { useState } from "react";
import { useCreateGoal } from "@/hooks/useMutations";
import { X } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";

interface CreateGoalModalProps {
    parentId: string | null;
    parentAncestors: string[];
    isOpen: boolean;
    onClose: () => void;
    allowedTypes?: ('goal' | 'sub-goal' | 'step')[];
}

export function CreateGoalModal({ parentId, parentAncestors, isOpen, onClose, allowedTypes = ['goal'] }: CreateGoalModalProps) {
    const [title, setTitle] = useState("");
    // Default to the first allowed type (that isn't 'goal' if parentId exists)
    const [type, setType] = useState<'goal' | 'sub-goal' | 'step'>(
        allowedTypes.includes('sub-goal') ? 'sub-goal' : 'step'
    );
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

    const { mutate: createGoal, isPending } = useCreateGoal();
    const { data: groups } = useGroups();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        createGoal({
            title,
            type,
            status: 'active',
            parentId,
            parentAncestors,
            groupId: selectedGroupId || null,
            deadline: null,
        }, {
            onSuccess: () => {
                setTitle("");
                setSelectedGroupId("");
                onClose();
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        {parentId ? "Add Sub-goal" : "New Goal"}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. Learn French, Read 5 pages..."
                            autoFocus
                        />
                    </div>

                    {parentId && (
                        <div className="flex gap-4">
                            {allowedTypes.includes('sub-goal') && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="sub-goal"
                                        checked={type === 'sub-goal'}
                                        onChange={() => setType('sub-goal')}
                                    />
                                    <span>Sub-goal</span>
                                </label>
                            )}
                            {allowedTypes.includes('step') && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="step"
                                        checked={type === 'step'}
                                        onChange={() => setType('step')}
                                    />
                                    <span>Step</span>
                                </label>
                            )}
                        </div>
                    )}

                    {!parentId && groups && groups.length > 0 && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Assign to Group (Optional)</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                            >
                                <option value="">Personal (Private)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isPending ? "Creating..." : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
