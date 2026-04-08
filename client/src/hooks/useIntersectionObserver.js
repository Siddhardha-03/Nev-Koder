import { useEffect, useRef } from 'react';

/**
 * Custom hook that triggers a callback when element enters viewport
 * Useful for scroll-based animations
 */
export function useIntersectionObserver(options = {}) {
  const elementRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const defaultOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px',
      ...options,
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        // Unobserve after animation to improve performance
        observer.unobserve(entry.target);
      }
    }, defaultOptions);

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return elementRef;
}
