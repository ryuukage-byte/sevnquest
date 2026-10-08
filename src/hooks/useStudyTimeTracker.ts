import { useState, useEffect, useRef, useCallback } from 'react';
import { getTodayLocalDate } from '../utils/time';

interface StudyTrackerOptions {
  isStudying: boolean;
  initialTodaySeconds?: number;
  initialTotalSeconds?: number;
  lastStudyDate?: string;
  onSave?: (todaySeconds: number, totalSeconds: number, studyDate: string) => void;
}

const IDLE_THRESHOLD_MS = 60 * 1000; // 60 seconds

export function useStudyTimeTracker({
  isStudying,
  initialTodaySeconds = 0,
  initialTotalSeconds = 0,
  lastStudyDate,
  onSave,
}: StudyTrackerOptions) {
  const today = getTodayLocalDate();

  // If last study date is from a previous day, start today's seconds from 0
  const normalizedInitialToday = (lastStudyDate && lastStudyDate !== today) ? 0 : initialTodaySeconds;

  const [todaySeconds, setTodaySeconds] = useState(normalizedInitialToday);
  const [totalSeconds, setTotalSeconds] = useState(initialTotalSeconds);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Refs to maintain current values without triggering re-effects
  const todaySecondsRef = useRef(normalizedInitialToday);
  const totalSecondsRef = useRef(initialTotalSeconds);
  const currentDateRef = useRef(today);
  const lastActivityRef = useRef(Date.now());
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Keep state and ref in sync
  useEffect(() => {
    todaySecondsRef.current = todaySeconds;
  }, [todaySeconds]);

  useEffect(() => {
    totalSecondsRef.current = totalSeconds;
  }, [totalSeconds]);

  // Flush save function
  const flushSave = useCallback(() => {
    if (onSaveRef.current) {
      onSaveRef.current(
        todaySecondsRef.current,
        totalSecondsRef.current,
        currentDateRef.current
      );
    }
  }, []);

  // Save on tab close or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushSave]);

  // Flush when leaving study mode
  const prevIsStudyingRef = useRef(isStudying);
  useEffect(() => {
    if (prevIsStudyingRef.current && !isStudying) {
      flushSave();
    }
    prevIsStudyingRef.current = isStudying;
  }, [isStudying, flushSave]);

  // User activity listeners (throttled)
  useEffect(() => {
    let lastThrottledTime = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 800) {
        lastThrottledTime = now;
        lastActivityRef.current = now;
      }
    };

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, []);

  // Main 1-second interval loop
  useEffect(() => {
    // If not in a study module, set timer inactive and don't run interval
    if (!isStudying) {
      setIsTimerActive(false);
      return;
    }

    // Reset activity when entering study module so timer starts immediately
    lastActivityRef.current = Date.now();

    let accumulatedUnsavedSeconds = 0;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      const isNotIdle = (now - lastActivityRef.current) < IDLE_THRESHOLD_MS;

      const active = isStudying && isVisible && isNotIdle;
      setIsTimerActive(active);

      if (!active) {
        return;
      }

      // Check midnight date rollover
      const currentDay = getTodayLocalDate();
      if (currentDay !== currentDateRef.current) {
        // Rollover to new day
        flushSave();
        currentDateRef.current = currentDay;
        todaySecondsRef.current = 0;
        setTodaySeconds(0);
      }

      // Increment 1 second
      const newToday = todaySecondsRef.current + 1;
      const newTotal = totalSecondsRef.current + 1;

      todaySecondsRef.current = newToday;
      totalSecondsRef.current = newTotal;
      setTodaySeconds(newToday);
      setTotalSeconds(newTotal);

      // Auto-save every 10 seconds of active study
      accumulatedUnsavedSeconds += 1;
      if (accumulatedUnsavedSeconds >= 10) {
        accumulatedUnsavedSeconds = 0;
        flushSave();
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      flushSave();
    };
  }, [isStudying, flushSave]);

  return {
    todaySeconds,
    totalSeconds,
    isTimerActive,
  };
}
