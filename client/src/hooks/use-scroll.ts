import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigationCoordinator } from './use-navigation-coordinator';

interface ScrollState {
  scrollY: number;
  isScrolling: boolean;
  direction: 'up' | 'down' | 'none';
}

interface UnifiedScrollReturn extends ScrollState {
  getStableScrollY: () => number;
  getPreciseTransform: (maxScroll: number) => string;
}

// Global scroll state manager to prevent race conditions
class ScrollStateManager {
  private scrollY = 0;
  private isScrolling = false;
  private direction: 'up' | 'down' | 'none' = 'none';
  private lastScrollY = 0;
  private listeners = new Set<() => void>();
  private rafId: number | null = null;
  private isUpdating = false;
  private scrollEndTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.scrollY = Math.round(window.scrollY);
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    }
  }

  private handleScroll = () => {
    if (this.isUpdating) return;

    // Coalesce multiple scroll events into single RAF
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.updateScrollState);
    }
  };

  private updateScrollState = () => {
    this.isUpdating = true;
    
    const newScrollY = Math.round(window.scrollY); // Precise pixel values only
    
    if (newScrollY !== this.scrollY) {
      // Determine scroll direction
      if (newScrollY > this.lastScrollY) {
        this.direction = 'down';
      } else if (newScrollY < this.lastScrollY) {
        this.direction = 'up';
      }
      
      this.lastScrollY = this.scrollY;
      this.scrollY = newScrollY;
      this.isScrolling = true;
      
      // Notify all listeners in a single batch
      this.notifyListeners();
    }

    // Clear RAF ID for next coalescing
    this.rafId = null;
    this.isUpdating = false;

    // Debounced scroll end detection
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
    this.scrollEndTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.direction = 'none';
      this.notifyListeners();
    }, 150);
  };

  private notifyListeners = () => {
    this.listeners.forEach(listener => listener());
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): ScrollState => ({
    scrollY: this.scrollY,
    isScrolling: this.isScrolling,
    direction: this.direction,
  });

  // Precision transform calculation with rounding
  getPreciseTransform = (maxScroll: number): string => {
    if (this.scrollY === 0) return 'translate3d(0, 0, 0)';
    if (this.scrollY >= maxScroll) return 'translate3d(0, -100%, 0)';
    
    // Round percentage to prevent sub-pixel movements
    const percentage = Math.round((this.scrollY / maxScroll) * 100);
    return `translate3d(0, -${percentage}%, 0)`;
  };

  cleanup = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll);
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
    this.listeners.clear();
  };
}

// Singleton instance
const scrollManager = new ScrollStateManager();

export const useUnifiedScroll = (): UnifiedScrollReturn => {
  const { isStable } = useNavigationCoordinator();
  const [scrollState, setScrollState] = useState<ScrollState>(scrollManager.getState());
  const pausedScrollYRef = useRef<number>(0);

  // Subscribe to scroll manager updates
  useEffect(() => {
    const unsubscribe = scrollManager.subscribe(() => {
      if (isStable) {
        setScrollState(scrollManager.getState());
      } else {
        // During navigation transitions, pause scroll state updates
        pausedScrollYRef.current = scrollManager.getState().scrollY;
      }
    });

    return unsubscribe;
  }, [isStable]);

  // Resume scroll state after navigation stabilizes
  useEffect(() => {
    if (isStable) {
      setScrollState(scrollManager.getState());
    }
  }, [isStable]);

  const getStableScrollY = useCallback(() => {
    return isStable ? scrollState.scrollY : pausedScrollYRef.current;
  }, [isStable, scrollState.scrollY]);

  const getPreciseTransform = useCallback((maxScroll: number): string => {
    const scrollY = getStableScrollY();
    if (scrollY === 0) return 'translate3d(0, 0, 0)';
    if (scrollY >= maxScroll) return 'translate3d(0, -100%, 0)';
    
    const percentage = Math.round((scrollY / maxScroll) * 100);
    return `translate3d(0, -${percentage}%, 0)`;
  }, [getStableScrollY]);

  return {
    ...scrollState,
    scrollY: getStableScrollY(),
    getStableScrollY,
    getPreciseTransform,
  };
};

// Legacy compatibility export
export const useScroll = useUnifiedScroll;