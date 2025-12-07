'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RouteGroup } from '@/lib/supabase/types';
import { Trash2, Edit, Plus, X, Save } from 'lucide-react';

interface RouteGroupManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Callback to refresh parent data
}

export default function RouteGroupManager({ isOpen, onClose, onUpdate }: RouteGroupManagerProps) {
    const [groups, setGroups] = useState<RouteGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchGroups();
        }
    }, [isOpen]);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('route_groups')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setGroups(data || []);
        } catch (error) {
            console.error('Error fetching groups:', JSON.stringify(error, null, 2));
        } finally {
            setLoading(false);
        }
    };

    const handleAddGroup = async () => {
        if (!newGroupName.trim()) return;

        try {
            // Get max sort order
            const maxOrder = groups.length > 0 ? Math.max(...groups.map(g => g.sort_order)) : 0;

            const { error } = await supabase
                .from('route_groups')
                .insert({
                    name: newGroupName.trim(),
                    sort_order: maxOrder + 10
                });

            if (error) throw error;

            setNewGroupName('');
            fetchGroups();
            onUpdate();
        } catch (error) {
            console.error('Error adding group:', error);
            alert('그룹 추가 실패');
        }
    };

    const handleUpdateGroup = async (id: string) => {
        if (!editName.trim()) return;

        try {
            const { error } = await supabase
                .from('route_groups')
                .update({ name: editName.trim() })
                .eq('id', id);

            if (error) throw error;

            setEditingId(null);
            setEditName('');
            fetchGroups();
            onUpdate();
        } catch (error) {
            console.error('Error updating group:', error);
            alert('그룹 수정 실패');
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('정말 이 그룹을 삭제하시겠습니까?')) return;

        try {
            // Check if routes are using this group
            const { count, error: checkError } = await supabase
                .from('routes')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', id);

            if (checkError) throw checkError;

            if (count && count > 0) {
                alert('이 그룹을 사용하는 노선이 있어 삭제할 수 없습니다. 먼저 노선의 그룹을 변경해주세요.');
                return;
            }

            const { error } = await supabase
                .from('route_groups')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchGroups();
            onUpdate();
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('그룹 삭제 실패');
        }
    };

    const startEditing = (group: RouteGroup) => {
        setEditingId(group.id);
        setEditName(group.name);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-bold text-slate-800">노선 그룹 관리</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                    {/* Add New Group */}
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="새 그룹 이름"
                            className="flex-1 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                        />
                        <button
                            onClick={handleAddGroup}
                            disabled={!newGroupName.trim()}
                            className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex items-center"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Group List */}
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">로딩 중...</div>
                    ) : (
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    {editingId === group.id ? (
                                        <div className="flex gap-2 flex-1 mr-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleUpdateGroup(group.id)}
                                                className="text-green-600 hover:bg-green-50 p-1 rounded"
                                            >
                                                <Save size={18} />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="text-slate-400 hover:bg-slate-100 p-1 rounded"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium text-slate-700">{group.name}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => startEditing(group)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {groups.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-sm">등록된 그룹이 없습니다.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
