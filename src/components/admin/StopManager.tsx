'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Stop } from '@/lib/supabase/types';
import { Trash2, Edit, Plus, MapPin, Image as ImageIcon } from 'lucide-react';
import GoogleMapsWrapper from './GoogleMapsWrapper';
import GPSMapPicker from './GPSMapPicker';

export default function StopManager() {
    const [stops, setStops] = useState<Stop[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStop, setEditingStop] = useState<Stop | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        stop_name: '',
        stop_name_en: '',
        lat: 17.9757,
        lng: 102.6331,
        image_url: '',
        description: ''
    });

    useEffect(() => {
        fetchStops();
    }, []);

    const fetchStops = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('stops')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStops(data || []);
        } catch (error) {
            console.error('Error fetching stops:', error);
            alert('정류장 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleLocationSelect = (lat: number, lng: number) => {
        setFormData(prev => ({ ...prev, lat, lng }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const location = `POINT(${formData.lng} ${formData.lat})`;

            const stopData = {
                stop_name: formData.stop_name,
                stop_name_en: formData.stop_name_en,
                location: location,
                image_url: formData.image_url,
                description: formData.description
            };

            if (editingStop) {
                const { error } = await supabase
                    .from('stops')
                    .update(stopData)
                    .eq('id', editingStop.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('stops')
                    .insert([stopData]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchStops();
        } catch (error) {
            console.error('Error saving stop:', error);
            alert('정류장 저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 정류장을 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase
                .from('stops')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchStops();
        } catch (error) {
            console.error('Error deleting stop:', error);
            alert('정류장 삭제에 실패했습니다.');
        }
    };

    const openEditModal = async (stop: Stop) => {
        // Fetch coordinates
        const { data, error } = await supabase.rpc('get_stop_coordinates', { stop_id: stop.id });

        let lat = 17.9757;
        let lng = 102.6331;

        if (data && data.length > 0) {
            lat = data[0].lat;
            lng = data[0].lng;
        }

        setEditingStop(stop);
        setFormData({
            stop_name: stop.stop_name,
            stop_name_en: stop.stop_name_en || '',
            lat,
            lng,
            image_url: stop.image_url || '',
            description: stop.description || ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingStop(null);
        setFormData({
            stop_name: '',
            stop_name_en: '',
            lat: 17.9757,
            lng: 102.6331,
            image_url: '',
            description: ''
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">정류장 목록</h3>
                    <p className="text-sm text-slate-500 mt-1">버스 정류장의 위치와 정보를 관리합니다.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                >
                    <Plus size={18} /> 새 정류장 추가
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">데이터를 불러오는 중입니다...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">이름 (라오어)</th>
                                <th className="px-6 py-4">이름 (영어)</th>
                                <th className="px-6 py-4">사진</th>
                                <th className="px-6 py-4">설명</th>
                                <th className="px-6 py-4 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stops.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        등록된 정류장이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                stops.map((stop) => (
                                    <tr key={stop.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-900">{stop.stop_name}</td>
                                        <td className="px-6 py-4 text-slate-700">{stop.stop_name_en}</td>
                                        <td className="px-6 py-4">
                                            {stop.image_url ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                                                    <img src={stop.image_url} alt="Stop" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                                    <ImageIcon size={20} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 truncate max-w-xs text-sm">{stop.description}</td>
                                        <td className="px-6 py-4 text-right space-x-1">
                                            <button
                                                onClick={() => openEditModal(stop)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="수정"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(stop.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-slate-200">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">
                            {editingStop ? '정류장 수정' : '새 정류장 추가'}
                        </h3>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left: Map */}
                            <div className="h-[450px] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                                <GoogleMapsWrapper>
                                    <GPSMapPicker
                                        initialLat={formData.lat}
                                        initialLng={formData.lng}
                                        onLocationSelect={handleLocationSelect}
                                    />
                                </GoogleMapsWrapper>
                            </div>

                            {/* Right: Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">정류장 이름 (라오어)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.stop_name}
                                        onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="예: ຕະຫຼາດເຊົ້າ"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">정류장 이름 (영어)</label>
                                    <input
                                        type="text"
                                        value={formData.stop_name_en}
                                        onChange={(e) => setFormData({ ...formData, stop_name_en: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="예: Talat Sao"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">위도 (Lat)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.lat}
                                            onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-600 font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">경도 (Lng)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.lng}
                                            onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-600 font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">사진 URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.image_url}
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">설명</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                        placeholder="정류장 위치 설명..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                                    >
                                        저장하기
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
