import React, { useState } from "react";
import { useCreateGoal } from "@/hooks/useMutations";
import { X } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { Timestamp } from "firebase/firestore";

type GoalType = 'goal' | 'sub-goal' | 'step';

interface CreateGoalModalProps {
    parentId: string | null;
    parentAncestors: string[];
    isOpen: boolean;
    onClose: () => void;
    allowedTypes?: GoalType[];
    defaultGroupId?: string | null;
}

export function CreateGoalModal({ parentId, parentAncestors, isOpen, onClose, allowedTypes = ['goal'], defaultGroupId }: CreateGoalModalProps) {
    const initialType = allowedTypes[0] ?? 'goal';
    const [title, setTitle] = useState("");
    const [deadline, setDeadline] = useState(""); // YYYY-MM-DD string from input
    // Default to the first allowed type
    const [type, setType] = useState<GoalType>(initialType);
    const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId ?? "");

    const { mutate: createGoal, isPending } = useCreateGoal();
    const { data: groups } = useGroups();

    const parseDateInput = (value: string) => {
        const [year, month, day] = value.split("-").map(Number);
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const parsedDeadline = deadline ? parseDateInput(deadline) : null;

        createGoal({
            title: title.trim(),
            type,
            status: 'active',
            parentId,
            parentAncestors,
            groupId: selectedGroupId || null,
            deadline: parsedDeadline ? Timestamp.fromDate(parsedDeadline) : null,
        }, {
            onSuccess: () => {
                onClose();
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        {parentId ? `Add to ${type === 'step' ? 'Goal' : 'Parent'}` : "Create New Goal"}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Goal Type Selection - Only show if multiple types are allowed */}
                    {allowedTypes.length > 1 && (
                        <div className="flex gap-4 rounded-lg bg-gray-50 p-3">
                            {allowedTypes.includes('sub-goal') && (
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="sub-goal"
                                        checked={type === 'sub-goal'}
                                        onChange={(e) => setType(e.target.value as GoalType)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Sub-goal</span>
                                </label>
                            )}
                            {allowedTypes.includes('step') && (
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="step"
                                        checked={type === 'step'} // Should be default if sub-goal not allowed
                                        onChange={(e) => setType(e.target.value as GoalType)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Step</span>
                                </label>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={type === 'step' ? "e.g., Read 10 pages" : "e.g., Learn Spanish"}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Deadline (Optional)
                        </label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

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
