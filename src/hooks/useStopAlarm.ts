import { useState, useEffect, useRef } from 'react';
import { Stop } from '@/lib/supabase/types';
import { calculateDistance } from '@/utils/distance';

interface UseStopAlarmProps {
    userLocation: { latitude: number; longitude: number } | null;
    onAlarmTriggered?: () => void;
}

export function useStopAlarm({ userLocation, onAlarmTriggered }: UseStopAlarmProps) {
    const [targetStop, setTargetStop] = useState<Stop | null>(null);
    const [isAlarmActive, setIsAlarmActive] = useState(false);

    // Initialize audio context lazily
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
            osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop to low pitch

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    useEffect(() => {
        try {
            if (!userLocation || !targetStop || !isAlarmActive) return;

            // Guard clause: Ensure targetStop has valid location data
            const loc = targetStop.location as any;
            if (!loc || !loc.coordinates || !Array.isArray(loc.coordinates) || loc.coordinates.length < 2) {
                console.warn('Target stop has invalid location data:', targetStop);
                return;
            }

            const stopLat = loc.coordinates[1];
            const stopLng = loc.coordinates[0];

            if (typeof stopLat !== 'number' || typeof stopLng !== 'number') {
                console.warn('Invalid coordinates:', stopLat, stopLng);
                return;
            }

            const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                stopLat,
                stopLng
            );

            // Trigger at 200m
            if (distance <= 200) {
                triggerAlarm();
            }
        } catch (error) {
            console.error('Error in alarm effect:', error);
            // Don't crash the app
        }
    }, [userLocation, targetStop, isAlarmActive]);

    const triggerAlarm = () => {
        try {
            setIsAlarmActive(false); // Disable after triggering

            // 1. Browser Notification
            try {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('하차 알림', {
                        body: `${targetStop?.stop_name} 정류장이 200m 남았습니다!`,
                    });
                }
            } catch (e) {
                console.error('Notification failed:', e);
            }

            // 2. Audio/Vibration
            try {
                if (navigator.vibrate) {
                    navigator.vibrate([500, 200, 500]); // Vibrate pattern
                }
            } catch (e) {
                console.error('Vibration failed:', e);
            }

            // Play generated sound
            try {
                playBeep();
            } catch (e) {
                console.error('Sound play failed:', e);
            }

            // 3. Callback for UI alert
            if (onAlarmTriggered) onAlarmTriggered();
        } catch (error) {
            console.error('Critical error in triggerAlarm:', error);
        }
    };

    const setAlarm = (stop: Stop) => {
        // Request notification permission if needed
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        setTargetStop(stop);
        setIsAlarmActive(true);
    };

    const cancelAlarm = () => {
        setTargetStop(null);
        setIsAlarmActive(false);
    };

    return {
        targetStop,
        isAlarmActive,
        setAlarm,
        cancelAlarm
    };
}
