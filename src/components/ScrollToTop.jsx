import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, hash, search } = useLocation();

  // Ensure browser does not restore previous scroll on navigation
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  const resetScroll = () => {
    // Window
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // Document root (for some browsers)
    if (document.documentElement) document.documentElement.scrollTop = 0;
    // Body (Safari/older behavior)
    if (document.body) document.body.scrollTop = 0;
  };

  useLayoutEffect(() => {
    // If URL has a hash (#section), try to scroll to that element
    if (hash) {
      // slight delay to ensure element exists in DOM
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
          return;
        }
        // fallback to top if element not found
        resetScroll();
      }, 0);
      return;
    }

    // Default: always jump to top instantly on route changes
    resetScroll();
  }, [pathname, search, hash]);

  return null; // This component doesn't render anything
};

export default ScrollToTop;