import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';

type NavigationState = 'stable' | 'transitioning' | 'settling';

interface NavigationCoordinatorReturn {
  navigationState: NavigationState;
  isTransitioning: boolean;
  isStable: boolean;
  registerTransition: () => void;
  waitForStability: () => Promise<void>;
}

const TRANSITION_BUFFER_MS = 16; // 1 frame buffer
const SETTLING_PERIOD_MS = 100; // Time for DOM to settle

export const useNavigationCoordinator = (): NavigationCoordinatorReturn => {
  const [location] = useLocation();
  const [navigationState, setNavigationState] = useState<NavigationState>('stable');
  const previousLocationRef = useRef<string>(location);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const settlingTimeoutRef = useRef<NodeJS.Timeout>();
  const resolveStabilityRef = useRef<(() => void) | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (settlingTimeoutRef.current) {
        clearTimeout(settlingTimeoutRef.current);
      }
    };
  }, []);

  // Detect route changes and coordinate transitions
  useEffect(() => {
    const currentLocation = location;
    const previousLocation = previousLocationRef.current;

    if (currentLocation !== previousLocation) {
      // Route change detected - start transition coordination
      setNavigationState('transitioning');
      
      // Clear existing timeouts
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (settlingTimeoutRef.current) {
        clearTimeout(settlingTimeoutRef.current);
      }

      // Buffer period to ensure DOM starts transitioning
      transitionTimeoutRef.current = setTimeout(() => {
        setNavigationState('settling');
        
        // Settling period for DOM to stabilize
        settlingTimeoutRef.current = setTimeout(() => {
          setNavigationState('stable');
          
          // Resolve any waiting stability promises
          if (resolveStabilityRef.current) {
            resolveStabilityRef.current();
            resolveStabilityRef.current = null;
          }
        }, SETTLING_PERIOD_MS);
      }, TRANSITION_BUFFER_MS);

      previousLocationRef.current = currentLocation;
    }
  }, [location]);

  const registerTransition = useCallback(() => {
    if (navigationState === 'stable') {
      setNavigationState('transitioning');
    }
  }, [navigationState]);

  const waitForStability = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (navigationState === 'stable') {
        resolve();
      } else {
        resolveStabilityRef.current = resolve;
      }
    });
  }, [navigationState]);

  return {
    navigationState,
    isTransitioning: navigationState === 'transitioning',
    isStable: navigationState === 'stable',
    registerTransition,
    waitForStability,
  };
};