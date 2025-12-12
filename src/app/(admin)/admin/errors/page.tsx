'use client';

import { useState, useEffect } from 'react';
import { AdminErrorService, SystemErrorLog } from '@/lib/admin-api';
import { ErrorType, Severity } from '@/lib/logger.types';
import { logger } from '@/lib/logger'; // For logging admin errors ;)

// Lucide Icons
import {
    AlertTriangle,
    Trash2,
    RefreshCw,
    Search,
    Cpu,
    Bug,
    Copy,
    Check,
    Archive
} from 'lucide-react';

export default function ErrorDashboard() {
    const [logs, setLogs] = useState<SystemErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [stats, setStats] = useState({ criticalCount: 0, totalCount: 0 });

    // Filters
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

    // Selection & Modal
    const [selectedLog, setSelectedLog] = useState<SystemErrorLog | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, count } = await AdminErrorService.getErrors(page, 20, {
                type: filterType,
                severity: filterSeverity
            });
            setLogs(data);
            setTotalCount(count);

            // Refresh stats
            const newStats = await AdminErrorService.getStats();
            setStats(newStats);
        } catch (err) {
            console.error('Failed to fetch errors:', err);
            // Don't recursive log here to avoid loops if DB is down
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filterType, filterSeverity]);

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('정말 이 로그를 삭제하시겠습니까?')) return;

        try {
            await AdminErrorService.deleteError(id);
            fetchLogs(); // Reload
        } catch (err: any) {
            alert('삭제 실패: ' + err.message);
        }
    };

    const handleCleanup = async (days: number) => {
        if (!confirm(`${days}일 이상 지난 로그를 모두 삭제하시겠습니까?`)) return;

        setIsCleaning(true);
        try {
            const count = await AdminErrorService.cleanupOldLogs(days);
            alert(`${count}개의 오래된 로그가 삭제되었습니다.`);
            fetchLogs();
        } catch (err: any) {
            alert('정리 실패: ' + err.message);
        } finally {
            setIsCleaning(false);
        }
    };

    const handleCopyForAI = () => {
        if (!selectedLog) return;

        const prompt = `
[시스템 오류 분석 요청]
다음 오류의 원인과 해결책을 분석해줘:

1. 에러 메시지: ${selectedLog.error_message}
2. 발생 위치: ${selectedLog.url || '알 수 없음'}
3. 오류 유형: ${selectedLog.error_type} (${selectedLog.severity})
4. 사용자 ID: ${selectedLog.user_id || '비로그인'}
5. User Agent: ${selectedLog.user_agent}

[Stack Trace]
${selectedLog.error_stack || '없음'}

[Metadata]
${JSON.stringify(selectedLog.metadata, null, 2)}
    `;

        navigator.clipboard.writeText(prompt.trim());
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Bug className="w-8 h-8 text-red-500" />
                        시스템 오류 모니터링
                    </h1>
                    <p className="text-slate-500 mt-1">앱에서 발생한 모든 오류를 실시간으로 확인하고 관리합니다.</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">심각한 오류</p>
                            <p className="text-xl font-bold text-red-600">{stats.criticalCount}</p>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">총 누적 오류</p>
                            <p className="text-xl font-bold text-slate-800">{stats.totalCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Retention Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                    <Archive className="w-5 h-5 text-slate-400" />
                    <span className="font-semibold text-sm">데이터 보관 정책 (Retention)</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleCleanup(30)}
                        disabled={isCleaning}
                        className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300 flex items-center gap-2"
                    >
                        {isCleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        30일 지난 로그 삭제
                    </button>
                    <button
                        onClick={() => handleCleanup(7)}
                        disabled={isCleaning}
                        className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
                    >
                        7일 지난 로그 삭제
                    </button>
                </div>
            </div>

            {/* Filters & Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2">
                        <select
                            className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                        >
                            <option value="ALL">모든 심각도</option>
                            <option value="error">Critical (심각)</option>
                            <option value="warning">Warning (경고)</option>
                            <option value="info">Info (정보)</option>
                        </select>

                        <select
                            className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">모든 유형</option>
                            <option value="JAVASCRIPT">Javascript</option>
                            <option value="API_NET">Network / API</option>
                            <option value="REACT_RENDER">React Render</option>
                            <option value="GOOGLE_MAPS">Google Maps</option>
                            <option value="GEOLOCATION">Geolocation</option>
                            <option value="AUTH_SESSION">Auth / Session</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchLogs}
                        className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                        title="새로고침"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                                <th className="p-4 w-32">발생 시각</th>
                                <th className="p-4 w-24">심각도</th>
                                <th className="p-4 w-32">유형</th>
                                <th className="p-4">메시지</th>
                                <th className="p-4 w-24">사용자</th>
                                <th className="p-4 w-16 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && logs.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">데이터를 불러오는 중...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">발생한 오류가 없습니다. 🎉</td></tr>
                            ) : logs.map((log) => (
                                <tr
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.severity === 'error' ? 'bg-red-100 text-red-700' :
                                                log.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {log.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-slate-600">
                                        {log.error_type}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-700 max-w-md truncate" title={log.error_message}>
                                        {log.error_message}
                                    </td>
                                    <td className="p-4 text-xs text-slate-400 truncate max-w-[100px]">
                                        {log.user_id ? log.user_id.substring(0, 8) + '...' : 'Guest'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={(e) => handleDelete(log.id, e)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex justify-center items-center gap-4">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                        이전
                    </button>
                    <span className="text-sm text-slate-600">
                        Page {page} of {Math.ceil(totalCount / 20) || 1}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= Math.ceil(totalCount / 20)}
                        className="px-4 py-2 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                        다음
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${selectedLog.severity === 'error' ? 'bg-red-100 text-red-700' :
                                            selectedLog.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {selectedLog.severity.toUpperCase()}
                                    </span>
                                    Error Details
                                </h2>
                                <p className="text-sm text-slate-500 mt-2 font-mono">ID: {selectedLog.id} | {new Date(selectedLog.created_at).toLocaleString('ko-KR')}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyForAI}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all"
                                >
                                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {isCopied ? '복사 완료!' : 'AI 분석용 복사'}
                                </button>
                                <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 p-2">
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Error Message</h3>
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 font-medium">
                                    {selectedLog.error_message}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Location Context</h3>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-2">
                                        <p><span className="font-semibold w-24 inline-block text-slate-500">TYPE:</span> {selectedLog.error_type}</p>
                                        <p><span className="font-semibold w-24 inline-block text-slate-500">URL:</span> <span className="text-blue-600 break-all">{selectedLog.url}</span></p>
                                        <p><span className="font-semibold w-24 inline-block text-slate-500">USER:</span> {selectedLog.user_id || 'Guest'}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Device Info</h3>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-mono text-slate-600 break-all">
                                        {selectedLog.user_agent}
                                    </div>
                                </div>
                            </div>

                            {selectedLog.error_stack && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Stack Trace</h3>
                                    <pre className="p-4 bg-slate-900 text-slate-300 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
                                        {selectedLog.error_stack}
                                    </pre>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Metadata (JSON)</h3>
                                <pre className="p-4 bg-slate-100 text-slate-600 rounded-lg text-xs overflow-x-auto font-mono">
                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
