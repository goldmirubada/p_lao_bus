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
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        // Create a simple beep sound or load a file
        // For simplicity, we won't load an external file yet, but we'll prepare the ref.
        // In a real app, you'd load '/alarm.mp3'
        audioRef.current = new Audio('/alarm_sound.mp3'); // We need to ensure this file exists or handle error
    }, []);

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

        // Trigger at 500m
        if (distance <= 500) {
            triggerAlarm();
        }
    }, [userLocation, targetStop, isAlarmActive]);

    const triggerAlarm = () => {
        setIsAlarmActive(false); // Disable after triggering

        // 1. Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('하차 알림', {
                body: `${targetStop?.stop_name} 정류장이 500m 남았습니다!`,
            });
        }

        // 2. Audio/Vibration
        if (navigator.vibrate) {
            navigator.vibrate([1000, 500, 1000]); // Vibrate pattern
        }

        // Play sound if available (requires user interaction first usually)
        // audioRef.current?.play().catch(e => console.log('Audio play failed', e));

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
