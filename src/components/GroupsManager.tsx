import React, { useState } from "react";
import { useGroups, useCreateGroup, useJoinGroup, useDeleteGroup } from "@/hooks/useGroups";
import { Users, Copy, Check, Trash } from "lucide-react";

export function GroupsManager({ onSelectGroup }: { onSelectGroup?: (groupId: string) => void }) {
    const { data: groups } = useGroups();
    const { mutate: createGroup, isPending: isCreating } = useCreateGroup();
    const { mutate: joinGroup, isPending: isJoining } = useJoinGroup();
    const { mutate: deleteGroup } = useDeleteGroup();

    const [newGroupName, setNewGroupName] = useState("");
    const [joinGroupId, setJoinGroupId] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newGroupName.trim()) {
            createGroup(newGroupName, {
                onSuccess: () => setNewGroupName("")
            });
        }
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinGroupId.trim()) {
            joinGroup(joinGroupId, {
                onSuccess: () => setJoinGroupId("")
            });
        }
    };

    const copyToClipboard = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Users className="text-blue-600" size={20} />
                <h2 className="font-semibold text-gray-900">Your Groups</h2>
            </div>

            {/* List */}
            <div className="space-y-2 mb-4">
                {groups?.map(group => (
                    <div
                        key={group.id}
                        className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => onSelectGroup?.(group.id)}
                    >
                        <span className="font-medium text-gray-700">{group.name}</span>
                        <button
                            onClick={() => copyToClipboard(group.id)}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                        >
                            {copiedId === group.id ? <Check size={14} /> : <Copy size={14} />}
                            {copiedId === group.id ? "Copied" : "ID"}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this group?")) {
                                    deleteGroup(group.id);
                                }
                            }}
                            className="ml-2 text-gray-400 hover:text-red-500"
                            title="Delete Group"
                        >
                            <Trash size={14} />
                        </button>
                    </div>
                ))}
                {groups?.length === 0 && <p className="text-sm text-gray-500">No groups yet.</p>}
            </div>

            {/* Actions */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Create */}
                <form onSubmit={handleCreate} className="flex gap-2">
                    <input
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        placeholder="New Group Name"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        Create
                    </button>
                </form>

                {/* Join */}
                <form onSubmit={handleJoin} className="flex gap-2">
                    <input
                        value={joinGroupId}
                        onChange={e => setJoinGroupId(e.target.value)}
                        placeholder="Paste Group ID"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={isJoining}
                        className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                        Join
                    </button>
                </form>
            </div>
        </div>
    );
}
