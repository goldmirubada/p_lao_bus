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
            // Use RPC to get lat/lng easily if needed, or parse geography column
            // For simplicity, we'll fetch raw and use a helper if we had one, 
            // but Supabase returns geography as GeoJSON-like object or hex string depending on config.
            // Let's use the RPC function we created: get_stop_coordinates

            const { data, error } = await supabase
                .from('stops')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // For each stop, we might need to fetch lat/lng separately if geography column is tricky
            // Or we can just use the RPC for the editing modal.
            // For the list view, we might not need exact coords immediately.

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
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">정류장 목록</h3>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    <Plus size={20} /> 새 정류장 추가
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-3">이름 (라오어)</th>
                                <th className="p-3">이름 (영어)</th>
                                <th className="p-3">사진</th>
                                <th className="p-3">설명</th>
                                <th className="p-3 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stops.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        등록된 정류장이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                stops.map((stop) => (
                                    <tr key={stop.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{stop.stop_name}</td>
                                        <td className="p-3">{stop.stop_name_en}</td>
                                        <td className="p-3">
                                            {stop.image_url ? (
                                                <img src={stop.image_url} alt="Stop" className="w-10 h-10 object-cover rounded" />
                                            ) : (
                                                <span className="text-gray-400 text-xs">No Image</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-gray-500 truncate max-w-xs">{stop.description}</td>
                                        <td className="p-3 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(stop)}
                                                className="text-gray-600 hover:text-blue-600"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(stop.id)}
                                                className="text-gray-600 hover:text-red-600"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">
                            {editingStop ? '정류장 수정' : '새 정류장 추가'}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Map */}
                            <div className="h-[400px] bg-gray-100 rounded border">
                                <GoogleMapsWrapper>
                                    <GPSMapPicker
                                        initialLat={formData.lat}
                                        initialLng={formData.lng}
                                        onLocationSelect={handleLocationSelect}
                                    />
                                </GoogleMapsWrapper>
                            </div>

                            {/* Right: Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">정류장 이름 (라오어)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.stop_name}
                                        onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                                        className="w-full border rounded p-2"
                                        placeholder="예: ຕະຫຼາດເຊົ້າ"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">정류장 이름 (영어)</label>
                                    <input
                                        type="text"
                                        value={formData.stop_name_en}
                                        onChange={(e) => setFormData({ ...formData, stop_name_en: e.target.value })}
                                        className="w-full border rounded p-2"
                                        placeholder="예: Talat Sao"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">위도 (Lat)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.lat}
                                            onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                                            className="w-full border rounded p-2 bg-gray-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">경도 (Lng)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.lng}
                                            onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                                            className="w-full border rounded p-2 bg-gray-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">사진 URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.image_url}
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                            className="w-full border rounded p-2"
                                            placeholder="https://..."
                                        />
                                        {/* 추후 파일 업로드 기능 추가 가능 */}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full border rounded p-2 h-20"
                                        placeholder="정류장 위치 설명..."
                                    />
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        저장
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
