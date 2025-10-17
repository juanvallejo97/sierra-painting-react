import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dsierra_clocked_in_time';

/**
 * Hook for persistent timer state across page refreshes
 * CRITICAL FIX: Prevents workers from losing their clock-in time
 */
export function useTimerPersistence() {
  const [clockedInTime, setClockInTime] = useState<number | null>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const [currentTime, setCurrentTime] = useState('0:00');

  // Update timer display every second
  useEffect(() => {
    if (!clockedInTime) {
      setCurrentTime('0:00');
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - clockedInTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      if (hours > 0) {
        setCurrentTime(`${hours}:${minutes.toString().padStart(2, '0')}`);
      } else {
        setCurrentTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [clockedInTime]);

  const handleClockIn = () => {
    const now = Date.now();
    setClockInTime(now);
    localStorage.setItem(STORAGE_KEY, now.toString());
  };

  const handleClockOut = () => {
    setClockInTime(null);
    localStorage.removeItem(STORAGE_KEY);
    setCurrentTime('0:00');
  };

  const isClockedIn = clockedInTime !== null;

  return {
    isClockedIn,
    currentTime,
    handleClockIn,
    handleClockOut,
    clockedInTime,
  };
}
