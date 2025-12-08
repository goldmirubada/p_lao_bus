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
        if (!userLocation || !targetStop || !isAlarmActive) return;

        const stopLat = (targetStop.location as any).coordinates[1];
        const stopLng = (targetStop.location as any).coordinates[0];

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
    }, [userLocation, targetStop, isAlarmActive]);

    const triggerAlarm = () => {
        setIsAlarmActive(false); // Disable after triggering

        // 1. Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('하차 알림', {
                body: `${targetStop?.stop_name} 정류장이 200m 남았습니다!`,
            });
        }

        // 2. Audio/Vibration
        if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500]); // Vibrate pattern
        }

        // Play generated sound
        playBeep();

        // 3. Callback for UI alert
        if (onAlarmTriggered) onAlarmTriggered();
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
