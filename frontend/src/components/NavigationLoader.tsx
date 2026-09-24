'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '../context/LoadingContext';

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startLoading, stopLoading } = useLoading();

  // 1. Dismiss loader when the new route finishes rendering
  useEffect(() => {
    stopLoading();
  }, [pathname, searchParams, stopLoading]);

  // 2. Intercept link clicks & history state mutations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // A. Intercept anchor clicks
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right clicks or modifier keys (opening in new tab)
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');

      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('#') &&
        target !== '_blank'
      ) {
        const destPath = href.split('?')[0].split('#')[0];
        const currentPath = window.location.pathname;

        if (destPath !== currentPath) {
          startLoading();
        }
      }
    };

    // B. Intercept history pushState and replaceState (catches router.push/replace)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      const url = args[2];
      if (url && typeof url === 'string') {
        const dest = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
        if (dest !== window.location.pathname) {
          setTimeout(() => startLoading(), 0);
        }
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      const url = args[2];
      if (url && typeof url === 'string') {
        const dest = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
        if (dest !== window.location.pathname) {
          setTimeout(() => startLoading(), 0);
        }
      }
      return originalReplaceState.apply(this, args);
    };

    // C. Intercept browser back/forward buttons
    const handlePopState = () => {
      startLoading();
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [startLoading]);

  return null;
}