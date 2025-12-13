import { useState, useEffect, useRef } from 'react';
import { Stop } from '@/lib/supabase/types';
import { calculateDistance } from '@/utils/distance';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Geolocation } from '@capacitor/geolocation';

interface UseStopAlarmProps {
    userLocation: { latitude: number; longitude: number } | null;
    onAlarmTriggered?: () => void;
}

export function useStopAlarm({ userLocation, onAlarmTriggered }: UseStopAlarmProps) {
    const [targetStop, setTargetStop] = useState<Stop | null>(null);
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [currentDistance, setCurrentDistance] = useState<number | null>(null);
    const watchIdRef = useRef<string | null>(null);

    // Initialize audio (Web fallback)
    const playBeep = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    // Native Alarm Logic
    const triggerNativeAlarm = async (stopName: string) => {
        try {
            console.log('[StopAlarm] triggerNativeAlarm called for:', stopName);

            // 1. Notification
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: '하차 알림',
                        body: `${stopName} 정류장이 2km 남았습니다!`,
                        id: 1,
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: undefined,
                        attachments: [],
                        actionTypeId: '',
                        extra: null
                    }
                ]
            });
            console.log('[StopAlarm] Notification scheduled');

            // 2. Haptics
            await Haptics.vibrate({ duration: 2000 });
        } catch (e) {
            console.error('[StopAlarm] Native alarm failed:', e);
        }
    };

    // Web Logic via useEffect removed as we now use active watcher
    // But we might want to keep basic state sync if needed, but watcher is better.
    // Empty useEffect for now or remove if strictly relying on watcher.
    // Let's remove the logic block to avoid conflict/double trigger.
    useEffect(() => {
        // No-op for passive updates
    }, []);

    const triggerAlarm = (stopName = 'Target Stop') => {
        setIsAlarmActive(false);
        setTargetStop(null); // Clear target
        if (watchIdRef.current) {
            if (Capacitor.isNativePlatform()) {
                Geolocation.clearWatch({ id: watchIdRef.current });
            } else {
                navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
            }
            watchIdRef.current = null;
        }

        if (Capacitor.isNativePlatform()) {
            triggerNativeAlarm(stopName);
        } else {
            // Web implementation
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('하차 알림', { body: `${stopName} 정류장이 2km 남았습니다!` });
            }
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            playBeep();
        }

        if (onAlarmTriggered) onAlarmTriggered();
    };

    // Helper to extract coordinates safely
    const getCoordinates = (stop: Stop): { lat: number, lng: number } | null => {
        const anyStop = stop as any;
        // 1. GeoJSON (location.coordinates)
        if (anyStop.location && anyStop.location.coordinates && Array.isArray(anyStop.location.coordinates)) {
            return { lat: anyStop.location.coordinates[1], lng: anyStop.location.coordinates[0] };
        }
        // 2. Simple Object (location.lat/lng)
        if (anyStop.location && typeof anyStop.location.lat === 'number') {
            return { lat: anyStop.location.lat, lng: anyStop.location.lng };
        }
        // 3. Top-level (stop.lat/lng)
        if (typeof anyStop.lat === 'number') {
            return { lat: anyStop.lat, lng: anyStop.lng };
        }
        return null; // Invalid location
    };

    const setAlarm = async (stop: Stop) => {
        console.log('[StopAlarm] Setting alarm for:', stop.stop_name);

        const coords = getCoordinates(stop);
        if (!coords) {
            console.error('[StopAlarm] Invalid stop location:', stop);
            alert('정류장 위치 정보가 올바르지 않아 알람을 설정할 수 없습니다.');
            return;
        }

        const { lat: targetLat, lng: targetLng } = coords;

        if (Capacitor.isNativePlatform()) {
            // Native: Request permissions and start watcher
            try {
                const notifPerm = await LocalNotifications.requestPermissions();
                if (notifPerm.display !== 'granted') {
                    console.warn('[StopAlarm] Notification permission denied');
                }

                const locPerm = await Geolocation.requestPermissions();
                if (locPerm.location !== 'granted' && locPerm.coarseLocation !== 'granted') {
                    console.warn('[StopAlarm] Location permission denied');
                    return;
                }

                setTargetStop(stop);
                setIsAlarmActive(true);

                // Start Native Watcher
                if (watchIdRef.current) Geolocation.clearWatch({ id: watchIdRef.current });

                console.log('[StopAlarm] Starting native watchPosition...');
                watchIdRef.current = await Geolocation.watchPosition(
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                    (position, err) => {
                        if (err) {
                            console.error('[StopAlarm] Watch Error:', err);
                            return;
                        }
                        if (position) {
                            const dist = calculateDistance(
                                position.coords.latitude, position.coords.longitude,
                                targetLat, targetLng
                            );
                            setCurrentDistance(Math.round(dist)); // Update UI
                            console.log(`[StopAlarm] Distance: ${Math.round(dist)}m`);

                            if (dist <= 15000000) { // 15000km check (Testing)
                                console.log('[StopAlarm] Triggering Alarm!');
                                triggerAlarm(stop.stop_name);
                            }
                        }
                    }
                );
            } catch (e) {
                console.error('[StopAlarm] Setup failed:', e);
            }
        } else {
            // Web: Active Watcher
            console.log('[StopAlarm] Web mode activated');
            if ('Notification' in window && Notification.permission !== 'granted') {
                Notification.requestPermission();
            }
            setTargetStop(stop);
            setIsAlarmActive(true);

            // Start Web Watcher
            if (navigator.geolocation) {
                console.log('[StopAlarm] Starting Web watchPosition...');
                // Use numeric ID for Web (casted to any->string to match ref type or just handle separately)
                const id = navigator.geolocation.watchPosition(
                    (position) => {
                        const dist = calculateDistance(
                            position.coords.latitude, position.coords.longitude,
                            targetLat, targetLng
                        );
                        setCurrentDistance(Math.round(dist));
                        console.log(`[StopAlarm-Web] Distance: ${Math.round(dist)}m`);

                        if (dist <= 15000000) { // 15000km (Testing)
                            triggerAlarm(stop.stop_name);
                        }
                    },
                    (err) => {
                        console.error('[StopAlarm-Web] Watch Error:', err.code, err.message);
                        if (err.code === 1) { // PERMISSION_DENIED
                            alert('위치 권한이 차단되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.');
                        }
                    },
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
                );
                watchIdRef.current = id.toString();
            }
        }
    };

    const cancelAlarm = () => {
        setTargetStop(null);
        setIsAlarmActive(false);
        if (watchIdRef.current) {
            if (Capacitor.isNativePlatform()) {
                Geolocation.clearWatch({ id: watchIdRef.current });
            } else {
                navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
            }
            watchIdRef.current = null;
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (watchIdRef.current) {
                if (Capacitor.isNativePlatform()) {
                    Geolocation.clearWatch({ id: watchIdRef.current });
                } else {
                    navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
                }
            }
        };
    }, []);

    return { targetStop, isAlarmActive, setAlarm, cancelAlarm, currentDistance };
}
