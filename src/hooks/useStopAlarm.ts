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
            // 1. Notification (High Priority)
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: '하차 알림',
                        body: `${stopName} 정류장이 2km 남았습니다!`,
                        id: 1,
                        schedule: { at: new Date(Date.now() + 100) }, // Immedate
                        sound: undefined, // Use system default
                        actionTypeId: '',
                        extra: null
                    }
                ]
            });

            // 2. Haptics (Vibration)
            await Haptics.vibrate({ duration: 2000 }); // Long vibration
        } catch (e) {
            console.error('Native alarm failed', e);
        }
    };

    useEffect(() => {
        // Web Logic (Keep existing behavior)
        if (!Capacitor.isNativePlatform()) {
            if (!userLocation || !targetStop || !isAlarmActive) return;

            const loc = targetStop.location as any;
            if (!loc || !loc.coordinates || loc.coordinates.length < 2) return;

            const dist = calculateDistance(
                userLocation.latitude, userLocation.longitude,
                loc.coordinates[1], loc.coordinates[0]
            );

            if (dist <= 2000) {
                triggerAlarm(targetStop.stop_name);
            }
        }
    }, [userLocation, targetStop, isAlarmActive]);

    const triggerAlarm = (stopName = 'Target Stop') => {
        setIsAlarmActive(false);
        setTargetStop(null); // Clear target
        if (watchIdRef.current && Capacitor.isNativePlatform()) {
            Geolocation.clearWatch({ id: watchIdRef.current });
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

    const setAlarm = async (stop: Stop) => {
        if (Capacitor.isNativePlatform()) {
            // Native: Request permissions and start watcher
            const perm = await LocalNotifications.requestPermissions();
            if (perm.display !== 'granted') return; // Should handle UI feedback

            setTargetStop(stop);
            setIsAlarmActive(true);

            // Start Native Watcher
            if (watchIdRef.current) Geolocation.clearWatch({ id: watchIdRef.current });

            const loc = stop.location as any;
            const targetLat = loc.coordinates[1];
            const targetLng = loc.coordinates[0];

            watchIdRef.current = await Geolocation.watchPosition(
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                (position, err) => {
                    if (position) {
                        const dist = calculateDistance(
                            position.coords.latitude, position.coords.longitude,
                            targetLat, targetLng
                        );
                        if (dist <= 2000) { // 2km check
                            triggerAlarm(stop.stop_name);
                        }
                    }
                }
            );
        } else {
            // Web: Just set state, effect handles the rest
            if ('Notification' in window && Notification.permission !== 'granted') {
                Notification.requestPermission();
            }
            setTargetStop(stop);
            setIsAlarmActive(true);
        }
    };

    const cancelAlarm = () => {
        setTargetStop(null);
        setIsAlarmActive(false);
        if (watchIdRef.current && Capacitor.isNativePlatform()) {
            Geolocation.clearWatch({ id: watchIdRef.current });
            watchIdRef.current = null;
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (watchIdRef.current && Capacitor.isNativePlatform()) {
                Geolocation.clearWatch({ id: watchIdRef.current });
            }
        };
    }, []);

    return { targetStop, isAlarmActive, setAlarm, cancelAlarm };
}
