'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import LoadingScreen from '../components/ui/LoadingScreen';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: (customMessage?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledStartRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback((customMessage?: string) => {
    if (scheduledStartRef.current) clearTimeout(scheduledStartRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Defer state dispatch out of synchronous React insertion-effect execution
    scheduledStartRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();
      setLoadingText(customMessage);
      setIsLoading(true);

      // Fallback safety timeout (8s)
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 8000);
    }, 0);
  }, []);

  const stopLoading = useCallback(() => {
    if (scheduledStartRef.current) {
      clearTimeout(scheduledStartRef.current);
      scheduledStartRef.current = null;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const minDuration = 600; // Smooth visual display without flickering

    if (elapsed < minDuration && startTimeRef.current > 0) {
      setTimeout(() => {
        setIsLoading(false);
        startTimeRef.current = 0;
      }, minDuration - elapsed);
    } else {
      setIsLoading(false);
      startTimeRef.current = 0;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {isLoading && <LoadingScreen text={loadingText} />}
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);