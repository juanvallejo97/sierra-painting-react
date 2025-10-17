/**
 * Performance Optimization Utilities
 *
 * React.memo, useMemo, useCallback patterns and utilities
 * for optimizing component render performance
 */

import { ComponentType, memo, useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Deep comparison for React.memo (use sparingly - expensive!)
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Shallow comparison for React.memo (recommended)
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

/**
 * Create a memoized component with shallow comparison
 *
 * @example
 * const MemoizedJobCard = memoComponent(JobCard);
 */
export function memoComponent<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): ComponentType<P> {
  return memo(Component, propsAreEqual || shallowEqual);
}

/**
 * Debounce function - delays execution until after wait time
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   handleScroll();
 * }, 100);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let isThrottled = false;
  let lastArgs: Parameters<T> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    if (isThrottled) {
      lastArgs = args;
      return;
    }

    func(...args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
      if (lastArgs) {
        executedFunction(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };
}

/**
 * Hook for debounced callback
 *
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => performSearch(query),
 *   300
 * );
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Hook for throttled callback
 *
 * @example
 * const throttledScroll = useThrottledCallback(
 *   () => handleScroll(),
 *   100
 * );
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const isThrottledRef = useRef(false);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (isThrottledRef.current) {
        lastArgsRef.current = args;
        return;
      }

      callbackRef.current(...args);
      isThrottledRef.current = true;

      setTimeout(() => {
        isThrottledRef.current = false;
        if (lastArgsRef.current) {
          callbackRef.current(...lastArgsRef.current);
          lastArgsRef.current = null;
        }
      }, delay);
    },
    [delay]
  );
}

/**
 * Hook for previous value
 *
 * @example
 * const prevCount = usePrevious(count);
 * if (prevCount !== count) {
 *   // Count changed
 * }
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for measuring render time
 *
 * @example
 * useMeasureRender('JobsScreen');
 * // Logs: [Performance] JobsScreen rendered in 45ms
 */
export function useMeasureRender(componentName: string, logThreshold = 16): void {
  const renderStartRef = useRef<number>(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;

    if (renderTime > logThreshold) {
      console.warn(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);

      // Track slow renders
      if (import.meta.env.DEV && renderTime > 100) {
        console.trace(`[Performance] Slow render detected: ${componentName}`);
      }
    }

    renderStartRef.current = performance.now();
  });
}

/**
 * Hook for stable callback reference (like useCallback but always stable)
 *
 * @example
 * const handleClick = useStableCallback((id: string) => {
 *   // Always uses latest state without deps array
 *   doSomething(id, latestState);
 * });
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: any[]) => callbackRef.current(...args), []) as T;
}

/**
 * Hook for computed value with equality check
 *
 * @example
 * const expensiveValue = useComputedValue(
 *   () => computeExpensiveValue(data),
 *   [data],
 *   shallowEqual
 * );
 */
export function useComputedValue<T>(
  compute: () => T,
  deps: React.DependencyList,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const valueRef = useRef<T>();
  const isFirstRender = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const newValue = useMemo(compute, deps);

  if (isFirstRender.current) {
    valueRef.current = newValue;
    isFirstRender.current = false;
    return newValue;
  }

  if (!isEqual(valueRef.current as T, newValue)) {
    valueRef.current = newValue;
  }

  return valueRef.current as T;
}

/**
 * Optimize array of primitives for useMemo/useCallback deps
 *
 * @example
 * const selectedIds = useOptimizedArray([1, 2, 3]);
 * const items = useMemo(() => getItemsByIds(selectedIds), [selectedIds]);
 */
export function useOptimizedArray<T>(array: T[]): T[] {
  const serialized = array.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => array, [serialized]);
}

/**
 * Batch state updates to reduce re-renders
 *
 * @example
 * const updates = useBatchedUpdates();
 * updates(() => {
 *   setState1(value1);
 *   setState2(value2);
 *   setState3(value3);
 * }); // Only one re-render
 */
export function useBatchedUpdates() {
  return useCallback((callback: () => void) => {
    // React 18+ automatic batching
    // In React 17 and below, use ReactDOM.unstable_batchedUpdates
    callback();
  }, []);
}

/**
 * Check if component is mounted (for async operations)
 *
 * @example
 * const isMounted = useIsMounted();
 *
 * async function loadData() {
 *   const data = await fetchData();
 *   if (isMounted()) {
 *     setState(data);
 *   }
 * }
 */
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

/**
 * Lazy initialization for expensive initial state
 *
 * @example
 * const [data, setData] = useState(() => expensiveComputation());
 */
export function lazyInit<T>(initializer: () => T): T {
  return initializer();
}

/**
 * Performance markers for debugging
 */
export const PerformanceMarkers = {
  /**
   * Mark start of operation
   */
  start: (name: string) => {
    if (import.meta.env.DEV) {
      performance.mark(`${name}-start`);
    }
  },

  /**
   * Mark end of operation and log duration
   */
  end: (name: string) => {
    if (import.meta.env.DEV) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0];
        console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
      } catch {
        // Ignore errors if marks don't exist
      }
    }
  },

  /**
   * Clear all marks and measures
   */
  clear: () => {
    if (import.meta.env.DEV) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  },
} as const;
