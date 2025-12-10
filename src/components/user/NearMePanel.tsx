'use client';

import { useMemo } from 'react';
import { Stop } from '@/lib/supabase/types';
import { calculateDistance, formatDistance } from '@/utils/distance';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Navigation, X } from 'lucide-react';

interface NearMePanelProps {
    isOpen: boolean;
    onClose: () => void;
    userLocation: { latitude: number; longitude: number } | null;
    stops: Stop[];
    onStopClick: (stop: Stop) => void;
    loadingLocation: boolean;
    onRefreshLocation: () => void;
}

export default function NearMePanel({
    isOpen,
    onClose,
    userLocation,
    stops,
    onStopClick,
    loadingLocation,
    onRefreshLocation
}: NearMePanelProps) {
    const { t } = useLanguage();

    const nearestStops = useMemo(() => {
        if (!userLocation || stops.length === 0) return [];

        return stops
            .map(stop => {
                let stopLat: number | undefined;
                let stopLng: number | undefined;

                if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
                    stopLat = stop.lat;
                    stopLng = stop.lng;
                } else if ((stop.location as any)?.coordinates && Array.isArray((stop.location as any).coordinates)) {
                    stopLng = (stop.location as any).coordinates[0];
                    stopLat = (stop.location as any).coordinates[1];
                }

                if (stopLat === undefined || stopLng === undefined) {
                    return { ...stop, distance: Infinity }; // Mark invalid to filter later
                }

                const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    stopLat,
                    stopLng
                );
                return { ...stop, distance };
            })
            .filter(stop => stop.distance !== Infinity)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);
    }, [userLocation, stops]);

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 animate-slideUp max-h-[60vh] overflow-hidden flex flex-col border-t border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <MapPin size={18} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">{t('nearest_stops')}</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-3 pb-8">
                {loadingLocation ? (
                    <div className="text-center py-8 text-slate-500">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        {t('finding_location')}
                    </div>
                ) : !userLocation ? (
                    <div className="text-center py-8 text-slate-500">
                        <p className="mb-4">{t('location_permission_denied')}</p>
                        <button
                            onClick={onRefreshLocation}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            {t('finding_location')} (Retry)
                        </button>
                    </div>
                ) : (
                    nearestStops.map((stop, index) => (
                        <button
                            key={stop.id}
                            onClick={() => onStopClick(stop)}
                            className="w-full bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 rounded-xl p-4 transition-all flex items-center gap-4 text-left group"
                        >
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 group-hover:ring-blue-200 group-hover:text-blue-600">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-slate-800 group-hover:text-blue-700">
                                    {stop.stop_name}
                                </div>
                                {stop.stop_name_en && (
                                    <div className="text-xs text-slate-500">
                                        {stop.stop_name_en}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-blue-600 font-bold justify-end">
                                    <Navigation size={14} />
                                    {formatDistance(stop.distance)}
                                </div>
                                <div className="text-xs text-slate-400">{t('distance')}</div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
