'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Feedback } from '@/lib/supabase/types';
import { Check, X, Loader2, RefreshCw, MessageSquare } from 'lucide-react';

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchFeedbacks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('feedback')
                .select(`
                    *,
                    stops (
                        stop_name,
                        stop_name_en
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFeedbacks(data || []);
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
            alert('제보 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: 'resolved' | 'ignored') => {
        if (!confirm(`${newStatus === 'resolved' ? '처리 완료' : '무시'} 상태로 변경하시겠습니까?`)) return;

        try {
            setUpdatingId(id);
            const { error } = await supabase
                .from('feedback')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('상태 변경 실패');
        } finally {
            setUpdatingId(null);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'wrong_stop': return '정류장 위치/정보 오류';
            case 'bus_missing': return '버스가 오지 않음';
            case 'app_bug': return '앱 오류';
            case 'other': return '기타 의견';
            default: return category;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full">대기 중</span>;
            case 'resolved':
                return <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full">처리 완료</span>;
            case 'ignored':
                return <span className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-500 rounded-full">무시됨</span>;
            default:
                return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="text-blue-600" />
                    제보 관리
                </h1>
                <button
                    onClick={fetchFeedbacks}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    title="새로고침"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-4">상태</th>
                                <th className="px-6 py-4">유형</th>
                                <th className="px-6 py-4">내용</th>
                                <th className="px-6 py-4">관련 정류장</th>
                                <th className="px-6 py-4">사용자</th>
                                <th className="px-6 py-4 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin inline-block mr-2" />
                                        데이터를 불러오는 중...
                                    </td>
                                </tr>
                            ) : feedbacks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        접수된 제보가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                feedbacks.map((feedback) => (
                                    <tr key={feedback.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            {getStatusBadge(feedback.status)}
                                            <div className="text-xs text-slate-400 mt-1">
                                                {new Date(feedback.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {getCategoryLabel(feedback.category)}
                                        </td>
                                        <td className="px-6 py-4 max-w-md">
                                            <div className="text-slate-800 whitespace-pre-wrap">{feedback.content}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {feedback.stops ? (
                                                <div>
                                                    <div className="font-medium text-slate-800">{feedback.stops.stop_name}</div>
                                                    {feedback.stops.stop_name_en && (
                                                        <div className="text-xs text-slate-500">{feedback.stops.stop_name_en}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {feedback.user_email}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {feedback.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => updateStatus(feedback.id, 'resolved')}
                                                        disabled={updatingId === feedback.id}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                                                        title="처리 완료"
                                                    >
                                                        {updatingId === feedback.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(feedback.id, 'ignored')}
                                                        disabled={updatingId === feedback.id}
                                                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors border border-slate-200"
                                                        title="무시/삭제"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
